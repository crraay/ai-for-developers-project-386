package com.callcalendar;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.callcalendar.api.BookingResponse;
import com.callcalendar.api.BookingTypeResponse;
import com.callcalendar.api.CreateBookingRequest;
import io.micronaut.core.annotation.Nullable;
import io.micronaut.core.type.GenericArgument;
import io.micronaut.http.HttpRequest;
import io.micronaut.http.client.HttpClient;
import io.micronaut.http.client.annotation.Client;
import io.micronaut.http.client.exceptions.HttpClientResponseException;
import io.micronaut.serde.annotation.Serdeable;
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

/**
 * Booking type CRUD + the guest booking flow against active types. Two types are seeded by
 * Liquibase changeset 11-booking-type-seed, so the tests pin behaviour against real seeded data
 * without recreating it (the create test cleans up after itself).
 */
@MicronautTest
class BookingTypeFlowTest {

  private static final ZoneId BERLIN = ZoneId.of("Europe/Berlin");

  @Inject
  @Client("/")
  HttpClient client;

  @Inject DataSource dataSource;
  @Inject Clock clock;

  @BeforeEach
  void clearBookingsAndCustomTypes() throws Exception {
    try (Connection connection = dataSource.getConnection();
        Statement statement = connection.createStatement()) {
      statement.executeUpdate("DELETE FROM booking");
      // Keep the two seeded types; only delete types the tests created.
      statement.executeUpdate("DELETE FROM booking_type WHERE id > 2");
    }
  }

  @Test
  void twoTypesAreSeededWithDifferentDurations() {
    List<BookingTypeResponse> types = listPublic();
    assertEquals(2, types.size());
    assertEquals("Quick chat", types.get(0).title());
    assertEquals(30, types.get(0).durationMinutes());
    assertTrue(types.get(0).active());
    assertEquals("Deep dive", types.get(1).title());
    assertEquals(60, types.get(1).durationMinutes());
    assertTrue(types.get(1).active());
  }

  @Test
  void hostCreatesUpdatesAndDeletesAType() {
    BookingTypeResponse created = createType("Strategy call", null, 45);
    assertTrue(created.id() > 0);
    assertEquals("Strategy call", created.title());
    assertEquals(45, created.durationMinutes());
    assertTrue(created.active());

    BookingTypeResponse updated =
        client
            .toBlocking()
            .retrieve(
                HttpRequest.PUT(
                    "/api/host/booking-types/" + created.id(),
                    new UpdateTypeBody("Strategy sync", "Quarterly review", 90, 5, false)),
                BookingTypeResponse.class);
    assertEquals("Strategy sync", updated.title());
    assertEquals("Quarterly review", updated.description());
    assertEquals(90, updated.durationMinutes());
    assertEquals(5, updated.sortOrder());
    assertFalse(updated.active());

    // Inactive types do not appear in the public listing.
    assertEquals(2, listPublic().size());

    client.toBlocking().exchange(HttpRequest.DELETE("/api/host/booking-types/" + created.id()));
    assertEquals(2, listPublic().size());
    assertNotFound(
        () ->
            client
                .toBlocking()
                .exchange(HttpRequest.DELETE("/api/host/booking-types/" + created.id())));
  }

  @Test
  void deletingATypeUsedByABookingHidesItInstead() {
    BookingTypeResponse created = createType("Referenced type", null, 30);
    Instant slot = firstSlotOnWeekday(created.id());
    BookingResponse booking = book(slot, created.id());
    assertEquals(created.id(), booking.bookingTypeId());

    var deleteResponse =
        client.toBlocking().exchange(HttpRequest.DELETE("/api/host/booking-types/" + created.id()));
    assertEquals(204, deleteResponse.code());

    // Hidden from guests, but still listed for the host so existing bookings keep their label.
    assertTrue(listPublic().stream().noneMatch(type -> type.id() == created.id()));
    BookingTypeResponse hidden =
        listHost().stream().filter(type -> type.id() == created.id()).findFirst().orElseThrow();
    assertFalse(hidden.active());
    assertEquals("Referenced type", hidden.title());
  }

  @Test
  void creatingATypeWithBlankTitleOrOutOfRangeDurationIs400() {
    assertStatus(
        400, HttpRequest.POST("/api/host/booking-types", new CreateTypeBody("  ", null, 30)));
    // The 5-240 minute bounds match the booking-types page; anything outside is a 400.
    assertStatus(
        400, HttpRequest.POST("/api/host/booking-types", new CreateTypeBody("Ok", null, 0)));
    assertStatus(
        400, HttpRequest.POST("/api/host/booking-types", new CreateTypeBody("Ok", null, -5)));
    assertStatus(
        400, HttpRequest.POST("/api/host/booking-types", new CreateTypeBody("Ok", null, 4)));
    assertStatus(
        400, HttpRequest.POST("/api/host/booking-types", new CreateTypeBody("Ok", null, 241)));
    assertStatus(
        400, HttpRequest.POST("/api/host/booking-types", new CreateTypeBody("Ok", null, null)));
  }

  @Test
  void updatingOrDeletingUnknownIdReturns404() {
    assertNotFound(
        () ->
            client
                .toBlocking()
                .exchange(
                    HttpRequest.PUT(
                        "/api/host/booking-types/999999",
                        new UpdateTypeBody("Late", null, 15, 1, true))));
    assertNotFound(
        () -> client.toBlocking().exchange(HttpRequest.DELETE("/api/host/booking-types/999999")));
  }

  @Test
  void bookingDerivesDurationFromTheChosenActiveType() {
    // The two seeded types (Quick chat, Deep dive) get ids 1 and 2 by insert order
    // (BIGSERIAL). The booking duration is derived exclusively from the chosen type.
    Instant slot = firstSlotOnWeekday(1L /* Quick chat, 30 min */);
    BookingResponse created = book(slot, 1L);
    assertEquals(1L, created.bookingTypeId());
    assertEquals(slot.plus(Duration.ofMinutes(30)), Instant.parse(created.end()));
  }

  @Test
  void unknownOrInactiveTypeIdRejectsTheBooking() {
    Instant slot = firstSlotOnWeekday(1L);

    HttpClientResponseException unknown =
        assertThrows(HttpClientResponseException.class, () -> book(slot, 999_999L));
    assertEquals(404, unknown.getStatus().getCode());
    assertTrue(
        unknown
            .getResponse()
            .getBody(String.class)
            .orElseThrow()
            .contains("Booking type not found"));

    // Disable the seeded 30-minute type and try to book against its id: a hand-crafted
    // request must not silently book against a hidden offering.
    client
        .toBlocking()
        .exchange(
            HttpRequest.PUT(
                "/api/host/booking-types/1",
                new UpdateTypeBody("Quick chat", null, 30, 10, false)));

    HttpClientResponseException inactive =
        assertThrows(HttpClientResponseException.class, () -> book(slot, 1L));
    assertEquals(400, inactive.getStatus().getCode());
    assertTrue(inactive.getResponse().getBody(String.class).orElseThrow().contains("not active"));
  }

  @Test
  void slotsReturnedForOneTypeDoNotIncludeStartsOfAnother() {
    // The seeded types are different durations (30 and 60 min) — the same 09:00 start is
    // bookable for both, but each duration's slot list reflects what fits inside 09:00–17:00.
    LocalDate weekday = nextWeekday();
    List<Instant> thirtyMinStarts = slots(weekday, 1L /* Quick chat, 30 */);
    List<Instant> sixtyMinStarts = slots(weekday, 2L /* Deep dive, 60 */);
    assertFalse(thirtyMinStarts.isEmpty());
    assertFalse(sixtyMinStarts.isEmpty());
    // 09:00 is bookable for both.
    Instant start = weekday.atTime(9, 0).atZone(BERLIN).toInstant();
    assertTrue(thirtyMinStarts.contains(start));
    assertTrue(sixtyMinStarts.contains(start));
    // 30-minute slots reach 16:30 (16:30–17:00 fits). 60-minute slots stop at 16:00 (16:00–17:00).
    Instant last30 = weekday.atTime(16, 30).atZone(BERLIN).toInstant();
    Instant last60 = weekday.atTime(16, 0).atZone(BERLIN).toInstant();
    assertTrue(thirtyMinStarts.contains(last30));
    assertTrue(sixtyMinStarts.contains(last60));
  }

  // --- helpers -------------------------------------------------------------

  private List<BookingTypeResponse> listPublic() {
    return client
        .toBlocking()
        .retrieve(
            HttpRequest.GET("/api/booking-types"),
            new GenericArgument<List<BookingTypeResponse>>() {});
  }

  private List<BookingTypeResponse> listHost() {
    return client
        .toBlocking()
        .retrieve(
            HttpRequest.GET("/api/host/booking-types"),
            new GenericArgument<List<BookingTypeResponse>>() {});
  }

  private BookingTypeResponse createType(String title, @Nullable String description, int duration) {
    return client
        .toBlocking()
        .retrieve(
            HttpRequest.POST(
                "/api/host/booking-types", new CreateTypeBody(title, description, duration)),
            BookingTypeResponse.class);
  }

  private BookingResponse book(Instant start, long bookingTypeId) {
    return client
        .toBlocking()
        .retrieve(
            HttpRequest.POST(
                "/api/bookings",
                new CreateBookingRequest(
                    start.toString(), bookingTypeId, "Ada Lovelace", "ada@example.com")),
            BookingResponse.class);
  }

  private Instant firstSlotOnWeekday(long bookingTypeId) {
    List<Instant> starts = slots(nextWeekday(), bookingTypeId);
    assertFalse(starts.isEmpty());
    return starts.get(0);
  }

  private List<Instant> slots(LocalDate date, long bookingTypeId) {
    return client
        .toBlocking()
        .retrieve(
            HttpRequest.GET("/api/slots?date=" + date + "&bookingTypeId=" + bookingTypeId),
            new GenericArgument<List<Instant>>() {});
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

  private void assertNotFound(Runnable action) {
    HttpClientResponseException ex =
        assertThrows(HttpClientResponseException.class, () -> action.run());
    assertEquals(404, ex.getStatus().getCode());
  }

  private static LocalDate nextWeekday() {
    LocalDate date = LocalDate.now(BERLIN).plusDays(2);
    while (date.getDayOfWeek() == DayOfWeek.SATURDAY || date.getDayOfWeek() == DayOfWeek.SUNDAY) {
      date = date.plusDays(1);
    }
    return date;
  }

  /** Body of POST /api/host/booking-types (re-declared; requests are Serdeable records). */
  @Serdeable
  private record CreateTypeBody(
      String title, @Nullable String description, @Nullable Integer durationMinutes) {}

  /** Body of PUT /api/host/booking-types/{id}. */
  @Serdeable
  private record UpdateTypeBody(
      String title,
      @Nullable String description,
      Integer durationMinutes,
      Integer sortOrder,
      Boolean active) {}
}
