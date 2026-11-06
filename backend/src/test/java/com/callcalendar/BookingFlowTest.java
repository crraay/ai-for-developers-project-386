package com.callcalendar;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.callcalendar.api.BookingResponse;
import com.callcalendar.api.CreateBookingRequest;
import com.callcalendar.api.HostBookingResponse;
import com.callcalendar.api.HostSettingsResponse;
import com.callcalendar.service.BookingRules;
import io.micronaut.core.type.GenericArgument;
import io.micronaut.http.HttpMethod;
import io.micronaut.http.HttpRequest;
import io.micronaut.http.client.HttpClient;
import io.micronaut.http.client.annotation.Client;
import io.micronaut.http.client.exceptions.HttpClientResponseException;
import io.micronaut.test.extensions.junit5.annotation.MicronautTest;
import jakarta.inject.Inject;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.Statement;
import java.sql.Timestamp;
import java.time.Clock;
import java.time.DayOfWeek;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import javax.sql.DataSource;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/** Walking-skeleton flow: browse slots, book, double-booking rejection, cancel. */
@MicronautTest
class BookingFlowTest {

  private static final ZoneId BERLIN = ZoneId.of("Europe/Berlin");

  /** Non-hex placeholder on purpose (CODING_STANDARDS: betterleaks flags 32-char hex). */
  private static final String UNKNOWN_TOKEN = "unknown-cancellation-token-000000";

  @Inject
  @Client("/")
  HttpClient client;

  @Inject DataSource dataSource;

  @Inject Clock clock;

  @BeforeEach
  void clearBookings() throws Exception {
    try (Connection connection = dataSource.getConnection();
        Statement statement = connection.createStatement()) {
      statement.executeUpdate("DELETE FROM booking");
    }
  }

  @Test
  void hostSettingsAreSeeded() {
    HostSettingsResponse settings =
        client
            .toBlocking()
            .retrieve(HttpRequest.GET("/api/host-settings"), HostSettingsResponse.class);
    assertEquals("Europe/Berlin", settings.timezone());
    assertEquals(List.of(30), settings.allowedDurations());
  }

  @Test
  void weekdaysExposeSlotsOnTheGridAndWeekendsDoNot() {
    LocalDate weekday = nextWeekday();
    List<Instant> starts = slotsFor(weekday);
    assertFalse(starts.isEmpty());
    Instant windowOpen = weekday.atTime(9, 0).atZone(BERLIN).toInstant();
    Instant windowClose = weekday.atTime(17, 0).atZone(BERLIN).toInstant();
    assertEquals(windowOpen, starts.get(0));
    assertEquals(windowClose.minus(Duration.ofMinutes(30)), starts.get(starts.size() - 1));
    starts.forEach(start -> assertTrue(BookingRules.isAligned(start)));

    assertTrue(slotsFor(nextWeekendDay()).isEmpty());
  }

  @Test
  void bookingRoundTripFreesTheSlotAgain() {
    Instant slot = slotsFor(nextWeekday()).get(0);

    BookingResponse created =
        client
            .toBlocking()
            .retrieve(HttpRequest.POST("/api/bookings", booking(slot)), BookingResponse.class);
    assertEquals("active", created.state());
    assertFalse(created.cancellationToken().isBlank());

    BookingResponse fetched =
        client
            .toBlocking()
            .retrieve(
                HttpRequest.GET("/api/bookings/" + created.cancellationToken()),
                BookingResponse.class);
    assertEquals(slot, fetched.start());

    BookingResponse cancelled =
        client
            .toBlocking()
            .retrieve(
                HttpRequest.create(
                    HttpMethod.POST, "/api/bookings/" + created.cancellationToken() + "/cancel"),
                BookingResponse.class);
    assertEquals("cancelled", cancelled.state());

    // Cancellation frees the interval immediately (invariant #4)
    BookingResponse rebooked =
        client
            .toBlocking()
            .retrieve(HttpRequest.POST("/api/bookings", booking(slot)), BookingResponse.class);
    assertEquals("active", rebooked.state());
  }

  @Test
  void doubleBookingIsRejectedWithProblemJson() {
    Instant slot = slotsFor(nextWeekday()).get(0);
    client
        .toBlocking()
        .retrieve(HttpRequest.POST("/api/bookings", booking(slot)), BookingResponse.class);

    HttpClientResponseException ex =
        assertThrows(
            HttpClientResponseException.class,
            () -> client.toBlocking().exchange(HttpRequest.POST("/api/bookings", booking(slot))));
    assertEquals(409, ex.getStatus().getCode());
    assertTrue(ex.getResponse().getContentType().toString().contains("application/problem+json"));
    String body = ex.getResponse().getBody(String.class).orElseThrow();
    assertTrue(body.contains("Slot no longer available"));
  }

  @Test
  void nonBookableSlotsAre409AndMalformedInputIs400() {
    Instant tooSoon = BookingRules.alignUp(clock.instant().plus(Duration.ofMinutes(30)));
    assertStatus(409, HttpRequest.POST("/api/bookings", booking(tooSoon)));

    Instant misaligned = slotsFor(nextWeekday()).get(0).plusSeconds(60);
    assertStatus(409, HttpRequest.POST("/api/bookings", booking(misaligned)));

    assertStatus(409, HttpRequest.POST("/api/bookings", booking(nextWeekdayBeyondHorizonAt9())));
    assertStatus(
        409, HttpRequest.POST("/api/bookings", booking(Instant.parse("2020-01-01T09:00:00Z"))));

    assertStatus(
        400,
        HttpRequest.POST(
            "/api/bookings",
            new CreateBookingRequest("not-an-instant", 30, "Ada", "ada@example.com")));
    assertStatus(
        400,
        HttpRequest.POST(
            "/api/bookings",
            new CreateBookingRequest(Instant.now().toString(), 45, "Ada", "ada@example.com")));
    assertStatus(400, HttpRequest.GET("/api/slots?date=2026-13-40&durationMinutes=30"));
    assertStatus(400, HttpRequest.GET("/api/slots?date=" + nextWeekday() + "&durationMinutes=45"));
  }

  @Test
  void unknownTokenIs404() {
    assertStatus(404, HttpRequest.GET("/api/bookings/" + UNKNOWN_TOKEN));
    assertStatus(
        404, HttpRequest.create(HttpMethod.POST, "/api/bookings/" + UNKNOWN_TOKEN + "/cancel"));
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

  private void assertStatus(int expected, HttpRequest<?> request) {
    HttpClientResponseException ex =
        assertThrows(
            HttpClientResponseException.class, () -> client.toBlocking().exchange(request));
    assertEquals(
        expected,
        ex.getStatus().getCode(),
        () -> ex.getResponse().getBody(String.class).orElse(""));
  }

  /** The first bookable instant on a weekday at least 120 days out (beyond the 90-day horizon). */
  private Instant nextWeekdayBeyondHorizonAt9() {
    LocalDate date = LocalDate.now(BERLIN).plusDays(120);
    while (date.getDayOfWeek() == DayOfWeek.SATURDAY || date.getDayOfWeek() == DayOfWeek.SUNDAY) {
      date = date.plusDays(1);
    }
    return date.atTime(9, 0).atZone(BERLIN).toInstant();
  }

  private static LocalDate nextWeekday() {
    LocalDate date = LocalDate.now(BERLIN).plusDays(2);
    while (date.getDayOfWeek() == DayOfWeek.SATURDAY || date.getDayOfWeek() == DayOfWeek.SUNDAY) {
      date = date.plusDays(1);
    }
    return date;
  }

  private static LocalDate nextWeekendDay() {
    LocalDate date = LocalDate.now(BERLIN).plusDays(2);
    while (date.getDayOfWeek() != DayOfWeek.SATURDAY) {
      date = date.plusDays(1);
    }
    return date;
  }

  // ---------------------------------------------------------------------------
  // Host view: list bookings + cancel by id (UC-5/UC-6)
  // ---------------------------------------------------------------------------

  @Test
  void hostListsUpcomingAndOmitsPastAndCancelledTokens() throws Exception {
    Instant now = clock.instant();
    insertBooking(
        "Grace Hopper",
        "grace@example.com",
        now.minus(Duration.ofHours(2)),
        now.minus(Duration.ofHours(1)),
        "active",
        "past-token-1234567890ab");
    long ongoingId =
        insertBooking(
            "Ongoing Agora",
            "ongoing@example.com",
            now.minus(Duration.ofMinutes(15)),
            now.plus(Duration.ofMinutes(15)),
            "active",
            "ongoing-token-12345678");
    long futureActiveId =
        insertBooking(
            "Ada Lovelace",
            "ada@example.com",
            now.plus(Duration.ofHours(3)),
            now.plus(Duration.ofHours(3).plusMinutes(30)),
            "active",
            "future-token-1234567890");
    long futureCancelledId =
        insertBooking(
            "Cancelled Cassin",
            "cass@example.com",
            now.plus(Duration.ofHours(4)),
            now.plus(Duration.ofHours(4).plusMinutes(30)),
            "cancelled",
            "cancelled-token-12345");

    List<HostBookingResponse> listed =
        client
            .toBlocking()
            .retrieve(
                HttpRequest.GET("/api/bookings"),
                new GenericArgument<List<HostBookingResponse>>() {});

    // Past bookings are excluded (frozen history; invariant #3 says bookings are cancelled before
    // starting, so an active booking whose end is in the past should never happen — but if one
    // does, the host list hides it). Only the past-active booking was inserted for that property.
    assertEquals(3, listed.size());
    assertEquals(ongoingId, listed.get(0).id());
    assertEquals(futureActiveId, listed.get(1).id());
    assertEquals(futureCancelledId, listed.get(2).id());
    assertEquals("active", listed.get(1).state());
    assertEquals("cancelled", listed.get(2).state());

    // The host list must NOT leak the secret cancellation token (HostBookingResponse intentionally
    // omits it; this asserts the contract holds end-to-end through the JSON serialiser).
    String rawList = client.toBlocking().retrieve(HttpRequest.GET("/api/bookings"), String.class);
    assertFalse(rawList.contains("cancellationToken"));
    assertFalse(rawList.contains("future-token-1234567890"));
  }

  @Test
  void hostCancelByIdReturnsCancelledState() throws Exception {
    Instant now = clock.instant();
    long id =
        insertBooking(
            "Ada Lovelace",
            "ada@example.com",
            now.plus(Duration.ofHours(3)),
            now.plus(Duration.ofHours(3).plusMinutes(30)),
            "active",
            "future-token-1234567890");

    HostBookingResponse cancelled =
        client
            .toBlocking()
            .retrieve(
                HttpRequest.create(HttpMethod.POST, "/api/host/bookings/" + id + "/cancel"),
                HostBookingResponse.class);

    assertEquals(id, cancelled.id());
    assertEquals("cancelled", cancelled.state());
  }

  @Test
  void hostCancelByIdIsIdempotentForAlreadyCancelled() throws Exception {
    Instant now = clock.instant();
    long id =
        insertBooking(
            "Ada Lovelace",
            "ada@example.com",
            now.plus(Duration.ofHours(3)),
            now.plus(Duration.ofHours(3).plusMinutes(30)),
            "cancelled",
            "future-token-1234567890");

    HostBookingResponse cancelled =
        client
            .toBlocking()
            .retrieve(
                HttpRequest.create(HttpMethod.POST, "/api/host/bookings/" + id + "/cancel"),
                HostBookingResponse.class);

    assertEquals("cancelled", cancelled.state());
  }

  @Test
  void hostCancelByIdOnceStartedIs409() throws Exception {
    Instant now = clock.instant();
    long id =
        insertBooking(
            "Ongoing Agora",
            "ongoing@example.com",
            now.minus(Duration.ofMinutes(15)),
            now.plus(Duration.ofMinutes(15)),
            "active",
            "ongoing-token-12345678");

    HttpClientResponseException ex =
        assertThrows(
            HttpClientResponseException.class,
            () ->
                client
                    .toBlocking()
                    .exchange(
                        HttpRequest.create(
                            HttpMethod.POST, "/api/host/bookings/" + id + "/cancel")));
    assertEquals(409, ex.getStatus().getCode());
    assertTrue(ex.getResponse().getContentType().toString().contains("application/problem+json"));
    String body = ex.getResponse().getBody(String.class).orElseThrow();
    assertTrue(body.contains("can no longer be cancelled"));
  }

  @Test
  void hostCancelByIdUnknownIs404() {
    assertStatus(404, HttpRequest.create(HttpMethod.POST, "/api/host/bookings/9999999/cancel"));
  }

  @Test
  void hostListUnknownIsExcludedButDoesNotExplode() throws Exception {
    Instant now = clock.instant();
    insertBooking(
        "Ada Lovelace",
        "ada@example.com",
        now.plus(Duration.ofHours(3)),
        now.plus(Duration.ofHours(3).plusMinutes(30)),
        "active",
        "future-token-1234567890");

    List<HostBookingResponse> listed =
        client
            .toBlocking()
            .retrieve(
                HttpRequest.GET("/api/bookings"),
                new GenericArgument<List<HostBookingResponse>>() {});
    assertEquals(1, listed.size());
    assertTrue(listed.get(0).id() > 0);
  }

  /**
   * Inserts a raw booking row so the host list tests don't depend on the seeded booking windows or
   * the slot alignment rules. Returns the generated id.
   */
  private long insertBooking(
      String name, String email, Instant start, Instant end, String state, String token)
      throws Exception {
    try (Connection connection = dataSource.getConnection();
        PreparedStatement statement =
            connection.prepareStatement(
                "INSERT INTO booking (guest_name, guest_email, start_at, end_at, state,"
                    + " cancellation_token) VALUES (?, ?, ?, ?, ?, ?)",
                Statement.RETURN_GENERATED_KEYS)) {
      statement.setString(1, name);
      statement.setString(2, email);
      statement.setTimestamp(3, Timestamp.from(start));
      statement.setTimestamp(4, Timestamp.from(end));
      statement.setString(5, state);
      statement.setString(6, token);
      statement.executeUpdate();
      try (ResultSet keys = statement.getGeneratedKeys()) {
        keys.next();
        return keys.getLong(1);
      }
    }
  }
}
