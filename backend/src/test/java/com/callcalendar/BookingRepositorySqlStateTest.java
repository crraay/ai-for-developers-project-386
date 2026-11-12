package com.callcalendar;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;

import com.callcalendar.domain.SlotUnavailableException;
import com.callcalendar.repo.BookingRepository;
import java.lang.reflect.InvocationHandler;
import java.lang.reflect.Method;
import java.lang.reflect.Proxy;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.SQLException;
import java.time.Instant;
import java.util.Set;
import javax.sql.DataSource;
import org.junit.jupiter.api.Test;

/**
 * Deterministic, container-free guard for {@link BookingRepository#insert}'s SQLState translation:
 * a slot refusal on Postgres surfaces as either {@code 23P01} (exclusion violation) or {@code
 * 40P01} (exclusion-check deadlock — the loser of a same-instant race), and the repository must
 * treat both as {@link SlotUnavailableException}; any other SQLState still surfaces as {@link
 * IllegalStateException} so a new code path cannot silently hand a guest a 500. The race that
 * actually produces {@code 40P01} from Postgres is probabilistic — see {@link BookingOverlapTest}
 * for the integration evidence.
 */
class BookingRepositorySqlStateTest {

  private static final Instant START = Instant.parse("2026-06-01T09:00:00Z");
  private static final Instant END = Instant.parse("2026-06-01T09:30:00Z");
  private static final String TOKEN = "deterministic-sqlstate-token";

  @Test
  void exclusionViolationIsMappedToSlotUnavailable() {
    SQLException raised = assertMapped(SlotUnavailableException.class, "23P01");
    assertEquals("23P01", raised.getSQLState());
  }

  @Test
  void exclusionCheckDeadlockIsMappedToSlotUnavailable() {
    SQLException raised = assertMapped(SlotUnavailableException.class, "40P01");
    assertEquals("40P01", raised.getSQLState());
  }

  @Test
  void unrelatedSqlStateStillSurfaces() {
    IllegalStateException raised =
        assertThrows(
            IllegalStateException.class,
            () ->
                new BookingRepository(stub("23505"))
                    .insert("Ada Lovelace", "ada@example.com", START, END, TOKEN));
    SQLException cause = (SQLException) raised.getCause();
    assertNotNull(cause);
    assertEquals("23505", cause.getSQLState());
  }

  private static <T extends RuntimeException> SQLException assertMapped(
      Class<T> expected, String sqlState) {
    T thrown =
        assertThrows(
            expected,
            () ->
                new BookingRepository(stub(sqlState))
                    .insert("Ada Lovelace", "ada@example.com", START, END, TOKEN));
    SQLException cause = (SQLException) thrown.getCause();
    assertNotNull(cause);
    return cause;
  }

  private static DataSource stub(String sqlStateOnExecuteUpdate) {
    InvocationHandler handler = new ThrowingHandler(sqlStateOnExecuteUpdate);
    return (DataSource)
        Proxy.newProxyInstance(
            DataSource.class.getClassLoader(), new Class<?>[] {DataSource.class}, handler);
  }

  /**
   * Builds proxies for {@link DataSource} → {@link Connection} → {@link PreparedStatement}. Only
   * the methods the repository calls return useful values; everything else throws {@link
   * UnsupportedOperationException} so a code change cannot silently drift past the test.
   */
  private static final class ThrowingHandler implements InvocationHandler {
    private static final Set<String> SILENT_NO_OPS =
        Set.of(
            "close",
            "isClosed",
            "setAutoCommit",
            "getAutoCommit",
            "setString",
            "setLong",
            "setTimestamp",
            "setNull",
            "setInt",
            "setObject",
            "clearParameters");

    private final String sqlState;

    ThrowingHandler(String sqlState) {
      this.sqlState = sqlState;
    }

    @Override
    public Object invoke(Object proxy, Method method, Object[] args) throws Throwable {
      return switch (method.getName()) {
        case "getConnection" -> newProxy(Connection.class);
        case "prepareStatement" -> newProxy(PreparedStatement.class);
        case "executeUpdate" -> {
          // The proxy surfaces the SQLException through the Proxy mechanism; the repository's
          // catch(SQLException) will see it directly.
          throw new SQLException("simulated", sqlState);
        }
        default -> {
          if (SILENT_NO_OPS.contains(method.getName())) {
            yield silentDefaultFor(method);
          }
          throw new UnsupportedOperationException(
              "unexpected call: "
                  + method.getDeclaringClass().getSimpleName()
                  + "#"
                  + method.getName());
        }
      };
    }

    private Object newProxy(Class<?> iface) {
      return Proxy.newProxyInstance(iface.getClassLoader(), new Class<?>[] {iface}, this);
    }

    private static Object silentDefaultFor(Method method) {
      // Always non-null so the proxy can return a value without surfacing NPE; for void methods
      // the Proxy mechanism throws the value away, so we just return any safe primitive box.
      Class<?> r = method.getReturnType();
      if (r == boolean.class) {
        return false;
      }
      if (r == int.class) {
        return 0;
      }
      if (r == long.class) {
        return 0L;
      }
      if (r == void.class) {
        return false;
      }
      throw new UnsupportedOperationException(
          "silent default unsupported for return type: "
              + method.getDeclaringClass().getSimpleName()
              + "#"
              + method.getName()
              + " -> "
              + r.getSimpleName());
    }
  }
}
