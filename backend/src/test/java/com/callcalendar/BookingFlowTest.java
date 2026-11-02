package com.callcalendar;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.callcalendar.api.BookingResponse;
import com.callcalendar.api.CreateBookingRequest;
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
import java.sql.Statement;
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
}
