package com.callcalendar;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.callcalendar.api.BookingResponse;
import com.callcalendar.api.CreateBookingRequest;
import com.callcalendar.domain.SlotUnavailableException;
import com.callcalendar.repo.BookingRepository;
import io.micronaut.core.type.GenericArgument;
import io.micronaut.http.HttpRequest;
import io.micronaut.http.HttpResponse;
import io.micronaut.http.HttpStatus;
import io.micronaut.http.client.HttpClient;
import io.micronaut.http.client.annotation.Client;
import io.micronaut.http.client.exceptions.HttpClientResponseException;
import io.micronaut.test.extensions.junit5.annotation.MicronautTest;
import jakarta.inject.Inject;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.sql.Timestamp;
import java.time.DayOfWeek;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.CyclicBarrier;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import javax.sql.DataSource;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/**
 * The no-double-booking invariant (ADR-0006) under the conditions the service pre-check cannot
 * cover: a raw-SQL insert that bypasses the pre-check entirely, inserts racing each other inside
 * {@link BookingRepository}, and two simultaneous HTTP requests (issue #31). Adjacent,
 * non-overlapping bookings must stay bookable — the constraint is {@code &&} over {@code '[)'}
 * ranges, not "any touching interval".
 */
@MicronautTest
class BookingOverlapTest {

  private static final ZoneId BERLIN = ZoneId.of("Europe/Berlin");

  /** A fixed past instant: raw inserts bypass the booking rules, only the constraint applies. */
  private static final Instant WINDOW_START = Instant.parse("2026-06-01T09:00:00Z");

  /** How often the two-request race is replayed inside a single test run. */
  private static final int RACE_ROUNDS = 5;

  /**
   * How often the repository-level race is replayed: the first rounds mostly resolve as plain 23P01
   * (cold pool, cold JIT), the warm ones are where the 40P01 interleaving shows up — each round
   * costs a deadlock timeout only when it does.
   */
  private static final int INSERT_RACE_ROUNDS = 12;

  /** Inserts that race each other inside one round of the repository-level test. */
  private static final int RACERS_PER_ROUND = 4;

  @Inject
  @Client("/")
  HttpClient client;

  @Inject DataSource dataSource;

  @Inject BookingRepository bookingRepository;

  @BeforeEach
  void clearBookings() throws Exception {
    try (Connection connection = dataSource.getConnection();
        PreparedStatement statement = connection.prepareStatement("DELETE FROM booking")) {
      statement.executeUpdate();
    }
  }

  @Test
  void databaseRejectsPartiallyOverlappingInsertWithExclusionViolation() throws SQLException {
    insertActiveBooking(
        WINDOW_START, WINDOW_START.plus(Duration.ofMinutes(30)), "overlap-existing-row-0001");

    SQLException ex =
        assertThrows(
            SQLException.class,
            () ->
                insertActiveBooking(
                    WINDOW_START.plus(Duration.ofMinutes(15)),
                    WINDOW_START.plus(Duration.ofMinutes(75)),
                    "overlap-incoming-row-0001"));

    assertEquals("23P01", ex.getSQLState());
  }

  /**
   * The repository seam, where ADR-0006's SQLState translation lives: inserts started at the same
   * instant race the constraint itself, with no service pre-check in between. Postgres reports the
   * lost side either as the exclusion violation (23P01) or — when two inserts reach the conflict
   * check before either commits — as a deadlock in which one of them is the victim (40P01). Every
   * loser must come back as the domain refusal; anything else is a 500 handed to a guest.
   */
  @Test
  void simultaneousRepositoryInsertsResolveToOneBookingAndOneRefusal() throws Exception {
    // The conflict check runs in the microseconds after a row is indexed, so unaided the racing
    // inserts hardly ever reach it together (0 of 10 rounds while writing this). The trigger pauses
    // every insert just before it lands, and four racers put six mutually overlapping pairs on the
    // line per round — with that the race reproduces reliably.
    executeDdl(
        "CREATE FUNCTION booking_pause_insert() RETURNS trigger AS"
            + " $$ BEGIN PERFORM pg_sleep(0.1); RETURN NEW; END; $$ LANGUAGE plpgsql");
    executeDdl(
        "CREATE TRIGGER booking_pause_before_insert BEFORE INSERT ON booking FOR EACH ROW"
            + " EXECUTE FUNCTION booking_pause_insert()");
    ExecutorService racers = Executors.newFixedThreadPool(RACERS_PER_ROUND);
    try {
      for (int round = 1; round <= INSERT_RACE_ROUNDS; round++) {
        Instant start = WINDOW_START.plus(Duration.ofMinutes(120L * round));
        CyclicBarrier atTheStartLine = new CyclicBarrier(RACERS_PER_ROUND);
        List<Future<String>> outcomes = new ArrayList<>();
        for (int racer = 0; racer < RACERS_PER_ROUND; racer++) {
          // Starts seven minutes apart, thirty minutes long: within a round every interval
          // overlaps every other, so at most one insert can win.
          outcomes.add(
              racers.submit(
                  racingInsert(
                      atTheStartLine,
                      start.plus(Duration.ofMinutes(7L * racer)),
                      30,
                      "repository-race-" + round + "-" + racer)));
        }

        List<String> results = new ArrayList<>();
        for (Future<String> outcome : outcomes) {
          results.add(outcome.get(30, TimeUnit.SECONDS));
        }
        results.sort(Comparator.naturalOrder());
        assertEquals(List.of("booked", "refused", "refused", "refused"), results, "round " + round);
      }
    } finally {
      racers.shutdownNow();
      executeDdl("DROP TRIGGER IF EXISTS booking_pause_before_insert ON booking");
      executeDdl("DROP FUNCTION IF EXISTS booking_pause_insert()");
    }
  }

  /**
   * The loser of the race must be refused with problem+json, never let through. The race is
   * repeated because pre-fix the outcome depends on timing: both service pre-checks must read
   * before either insert commits. The deterministic, timing-independent proof lives in the raw-SQL
   * test above.
   */
  @Test
  void simultaneousPartiallyOverlappingRequestsYieldExactlyOneBooking() throws Exception {
    Instant slot = slotsFor(nextWeekday()).get(0);

    ExecutorService racers = Executors.newFixedThreadPool(2);
    try {
      for (int round = 1; round <= RACE_ROUNDS; round++) {
        clearBookings();
        List<Integer> statuses = runRequestRace(racers, slot);
        assertEquals(List.of(201, 409), statuses, "round " + round);
        assertEquals(1, activeBookingCount(), "round " + round);
      }
    } finally {
      racers.shutdownNow();
    }
  }

  private List<Integer> runRequestRace(ExecutorService racers, Instant slot) throws Exception {
    CreateBookingRequest thirtyMinutes = booking(slot);
    CreateBookingRequest sixtyMinutes =
        new CreateBookingRequest(
            slot.plus(Duration.ofMinutes(15)).toString(), 60, "Grace Hopper", "grace@example.com");

    CountDownLatch atTheStartLine = new CountDownLatch(2);
    CountDownLatch go = new CountDownLatch(1);
    List<Future<Integer>> outcomes =
        List.of(
            racers.submit(race(thirtyMinutes, atTheStartLine, go)),
            racers.submit(race(sixtyMinutes, atTheStartLine, go)));
    assertTrue(atTheStartLine.await(10, TimeUnit.SECONDS), "both requests reached the start line");
    go.countDown();

    List<Integer> statuses = new ArrayList<>();
    for (Future<Integer> outcome : outcomes) {
      statuses.add(outcome.get(30, TimeUnit.SECONDS));
    }
    statuses.sort(Integer::compareTo);
    return statuses;
  }

  @Test
  void bookingStartingExactlyAtThePreviousEndIsAccepted() throws SQLException {
    Instant slot = slotsFor(nextWeekday()).get(0);

    HttpResponse<BookingResponse> first =
        client
            .toBlocking()
            .exchange(HttpRequest.POST("/api/bookings", booking(slot)), BookingResponse.class);
    assertEquals(HttpStatus.CREATED, first.getStatus());

    // Back-to-back: the second booking starts exactly where the first one ends (no overlap of the
    // half-open ranges), so it must stay bookable.
    HttpResponse<BookingResponse> backToBack =
        client
            .toBlocking()
            .exchange(
                HttpRequest.POST("/api/bookings", booking(slot.plus(Duration.ofMinutes(30)))),
                BookingResponse.class);
    assertEquals(HttpStatus.CREATED, backToBack.getStatus());

    assertEquals(2, activeBookingCount());
  }

  private Callable<Integer> race(
      CreateBookingRequest request, CountDownLatch atTheStartLine, CountDownLatch go) {
    return () -> {
      atTheStartLine.countDown();
      go.await();
      try {
        client
            .toBlocking()
            .retrieve(HttpRequest.POST("/api/bookings", request), BookingResponse.class);
        return 201;
      } catch (HttpClientResponseException e) {
        assertTrue(
            e.getResponse().getContentType().toString().contains("application/problem+json"),
            () -> "expected problem+json, got " + e.getResponse().getContentType());
        return e.getStatus().getCode();
      }
    };
  }

  private Callable<String> racingInsert(
      CyclicBarrier atTheStartLine, Instant start, int durationMinutes, String token) {
    return () -> {
      atTheStartLine.await(10, TimeUnit.SECONDS);
      try {
        bookingRepository.insert(
            "Ada Lovelace",
            "ada@example.com",
            start,
            start.plus(Duration.ofMinutes(durationMinutes)),
            token);
        return "booked";
      } catch (RuntimeException e) {
        return e instanceof SlotUnavailableException
            ? "refused"
            : "unexpected:" + e.getClass().getSimpleName() + ": " + e.getMessage();
      }
    };
  }

  private void executeDdl(String sql) throws SQLException {
    try (Connection connection = dataSource.getConnection();
        Statement statement = connection.createStatement()) {
      statement.execute(sql);
    }
  }

  private void insertActiveBooking(Instant start, Instant end, String token) throws SQLException {
    try (Connection connection = dataSource.getConnection();
        PreparedStatement statement =
            connection.prepareStatement(
                "INSERT INTO booking (guest_name, guest_email, start_at, end_at, state,"
                    + " cancellation_token) VALUES (?, ?, ?, ?, 'active', ?)")) {
      statement.setString(1, "Ada Lovelace");
      statement.setString(2, "ada@example.com");
      statement.setTimestamp(3, Timestamp.from(start));
      statement.setTimestamp(4, Timestamp.from(end));
      statement.setString(5, token);
      statement.executeUpdate();
    }
  }

  private int activeBookingCount() throws SQLException {
    try (Connection connection = dataSource.getConnection();
        PreparedStatement statement =
            connection.prepareStatement("SELECT count(*) FROM booking WHERE state = 'active'");
        ResultSet rs = statement.executeQuery()) {
      rs.next();
      return rs.getInt(1);
    }
  }

  private List<Instant> slotsFor(LocalDate date) {
    return client
        .toBlocking()
        .retrieve(
            HttpRequest.GET("/api/slots?date=" + date + "&durationMinutes=30"),
            new GenericArgument<List<Instant>>() {});
  }

  private static CreateBookingRequest booking(Instant start) {
    return new CreateBookingRequest(start.toString(), 30, "Ada Lovelace", "ada@example.com");
  }

  private static LocalDate nextWeekday() {
    LocalDate date = LocalDate.now(BERLIN).plusDays(2);
    while (date.getDayOfWeek() == DayOfWeek.SATURDAY || date.getDayOfWeek() == DayOfWeek.SUNDAY) {
      date = date.plusDays(1);
    }
    return date;
  }
}
