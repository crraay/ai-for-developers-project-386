package com.callcalendar.repo;

import com.callcalendar.domain.Booking;
import com.callcalendar.domain.Interval;
import com.callcalendar.domain.SlotUnavailableException;
import jakarta.inject.Singleton;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import javax.sql.DataSource;

@Singleton
public class BookingRepository {

  /** SQLState reported by the booking_no_active_overlap exclusion constraint (ADR-0006). */
  private static final String EXCLUSION_VIOLATION = "23P01";

  /**
   * SQLState Postgres reports when two racing inserts deadlock against each other inside that same
   * constraint's conflict check instead of one of them getting 23P01 — it aborts one insert as the
   * victim, reporting "deadlock detected … Where: while checking exclusion constraint … in relation
   * booking". The victim is the loser of the very same race, so it is refused identically. This
   * INSERT is a single autocommit statement that locks nothing but its own new row and that
   * constraint's index, so in practice no other deadlock can reach this catch.
   */
  private static final String EXCLUSION_CHECK_DEADLOCK = "40P01";

  private static final String BOOKING_COLUMNS =
      "id, guest_name, guest_email, start_at, end_at, state, cancellation_token";

  private final DataSource dataSource;

  public BookingRepository(DataSource dataSource) {
    this.dataSource = dataSource;
  }

  public void insert(
      String guestName, String guestEmail, Instant start, Instant end, String cancellationToken) {
    String sql =
        "INSERT INTO booking (guest_name, guest_email, start_at, end_at, state, cancellation_token)"
            + " VALUES (?, ?, ?, ?, 'active', ?)";
    try (Connection connection = dataSource.getConnection();
        PreparedStatement statement = connection.prepareStatement(sql)) {
      statement.setString(1, guestName);
      statement.setString(2, guestEmail);
      statement.setTimestamp(3, Timestamp.from(start));
      statement.setTimestamp(4, Timestamp.from(end));
      statement.setString(5, cancellationToken);
      statement.executeUpdate();
    } catch (SQLException e) {
      String sqlState = e.getSQLState();
      if (EXCLUSION_VIOLATION.equals(sqlState) || EXCLUSION_CHECK_DEADLOCK.equals(sqlState)) {
        throw new SlotUnavailableException("slot no longer available");
      }
      throw new IllegalStateException("failed to insert booking", e);
    }
  }

  public Optional<Booking> findByToken(String token) {
    try (Connection connection = dataSource.getConnection();
        PreparedStatement statement =
            connection.prepareStatement(
                "SELECT " + BOOKING_COLUMNS + " FROM booking WHERE cancellation_token = ?")) {
      statement.setString(1, token);
      try (ResultSet rs = statement.executeQuery()) {
        return rs.next() ? Optional.of(readBooking(rs)) : Optional.empty();
      }
    } catch (SQLException e) {
      throw new IllegalStateException("failed to read booking", e);
    }
  }

  public Optional<Booking> findById(long id) {
    try (Connection connection = dataSource.getConnection();
        PreparedStatement statement =
            connection.prepareStatement(
                "SELECT " + BOOKING_COLUMNS + " FROM booking WHERE id = ?")) {
      statement.setLong(1, id);
      try (ResultSet rs = statement.executeQuery()) {
        return rs.next() ? Optional.of(readBooking(rs)) : Optional.empty();
      }
    } catch (SQLException e) {
      throw new IllegalStateException("failed to read booking", e);
    }
  }

  /** Flips an active booking to cancelled; returns true when a row was updated. */
  public boolean markCancelled(long id) {
    try (Connection connection = dataSource.getConnection();
        PreparedStatement statement =
            connection.prepareStatement(
                "UPDATE booking SET state = 'cancelled' WHERE id = ? AND state = 'active'")) {
      statement.setLong(1, id);
      return statement.executeUpdate() > 0;
    } catch (SQLException e) {
      throw new IllegalStateException("failed to cancel booking", e);
    }
  }

  /** Intervals covered by ACTIVE bookings overlapping [from, to). */
  public List<Interval> findActiveOverlapping(Instant from, Instant to) {
    String sql =
        "SELECT start_at, end_at FROM booking WHERE state = 'active'"
            + " AND tstzrange(start_at, end_at, '[)') && tstzrange(?, ?, '[)')";
    try (Connection connection = dataSource.getConnection();
        PreparedStatement statement = connection.prepareStatement(sql)) {
      statement.setTimestamp(1, Timestamp.from(from));
      statement.setTimestamp(2, Timestamp.from(to));
      try (ResultSet rs = statement.executeQuery()) {
        List<Interval> busy = new ArrayList<>();
        while (rs.next()) {
          busy.add(
              new Interval(
                  rs.getTimestamp("start_at").toInstant(), rs.getTimestamp("end_at").toInstant()));
        }
        return busy;
      }
    } catch (SQLException e) {
      throw new IllegalStateException("failed to read active bookings", e);
    }
  }

  /**
   * Bookings whose interval has not yet ended ({@code end_at > cutoff}), both states, sorted by
   * start ascending. Powers the host page; an ongoing booking (start &lt;= cutoff &lt; end) is part
   * of the result and is rendered by the page in its own "Happening now" section.
   */
  public List<Booking> findUpcomingEndingAfter(Instant cutoff) {
    try (Connection connection = dataSource.getConnection();
        PreparedStatement statement =
            connection.prepareStatement(
                "SELECT "
                    + BOOKING_COLUMNS
                    + " FROM booking WHERE end_at > ? ORDER BY start_at ASC")) {
      statement.setTimestamp(1, Timestamp.from(cutoff));
      try (ResultSet rs = statement.executeQuery()) {
        List<Booking> bookings = new ArrayList<>();
        while (rs.next()) {
          bookings.add(readBooking(rs));
        }
        return bookings;
      }
    } catch (SQLException e) {
      throw new IllegalStateException("failed to read bookings", e);
    }
  }

  private static Booking readBooking(ResultSet rs) throws SQLException {
    return new Booking(
        rs.getLong("id"),
        rs.getString("guest_name"),
        rs.getString("guest_email"),
        rs.getTimestamp("start_at").toInstant(),
        rs.getTimestamp("end_at").toInstant(),
        rs.getString("state"),
        rs.getString("cancellation_token"));
  }
}
