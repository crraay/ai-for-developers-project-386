package com.callcalendar;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import io.micronaut.core.type.GenericArgument;
import io.micronaut.http.HttpRequest;
import io.micronaut.http.client.HttpClient;
import io.micronaut.http.client.annotation.Client;
import io.micronaut.http.client.exceptions.HttpClientResponseException;
import io.micronaut.test.extensions.junit5.annotation.MicronautTest;
import jakarta.inject.Inject;
import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import org.junit.jupiter.api.Test;

/**
 * UC-2 / Issue #1: the day a guest picks is <em>the guest's</em> calendar day. {@code GET
 * /api/slots} resolves {@code date} in the requested IANA {@code timeZone} (the browser's), not in
 * the host's, so a guest whose UTC offset differs from {@code Europe/Berlin} no longer sees the
 * previous/next day's start times under the date they chose. The booking window itself stays
 * host-local (docs/domain.md) and omitting {@code timeZone} keeps the old host-local behaviour.
 *
 * <p>The guest zone used here sits 10-12 hours <em>ahead</em> of Berlin in every DST combination,
 * which is the discriminating case: their day closes while the host's 09:00-17:00 window still has
 * hours left, so the guest-day answer is provably shorter than the host-day one. A zone behind
 * Berlin would return the same starts for this seeded window and prove nothing.
 */
@MicronautTest
class SlotGuestZoneTest {

  private static final ZoneId BERLIN = ZoneId.of("Europe/Berlin");
  private static final ZoneId GUEST_AHEAD = ZoneId.of("Pacific/Auckland");

  /** Issue #28: a 30-minute type, so the day's tail is cut off long before the window closes. */
  private static final long QUICK_CHAT_ID = 1L;

  @Inject
  @Client("/")
  HttpClient client;

  @Test
  void thePickedDayIsResolvedInTheGuestsTimezone() {
    LocalDate day = nextWeekday();
    List<Instant> hostDay = slotsFor(day);
    List<Instant> guestDay = slotsFor(day, GUEST_AHEAD.getId());

    assertFalse(guestDay.isEmpty(), "the guest's own day still offers bookable slots");
    // Every start offered under the picked date falls on that date in the guest's calendar...
    guestDay.forEach(start -> assertEquals(day, start.atZone(GUEST_AHEAD).toLocalDate()));
    // ...while the host-local answer (sent when timeZone is omitted) runs past the guest's
    // midnight — those are the wrong-day times Issue #1 reports, so it must be a strict superset.
    assertTrue(
        hostDay.size() > guestDay.size(),
        () -> "host day " + hostDay.size() + " starts, guest day " + guestDay.size() + " starts");
    hostDay.forEach(start -> assertEquals(day, start.atZone(BERLIN).toLocalDate()));
  }

  @Test
  void anUnknownTimezoneIsA400ProblemJson() {
    HttpClientResponseException ex =
        assertThrows(
            HttpClientResponseException.class, () -> slotsFor(nextWeekday(), "Mars/Olympus_Mons"));
    assertEquals(400, ex.getStatus().getCode());
    assertTrue(ex.getResponse().getContentType().toString().contains("application/problem+json"));
    String body = ex.getResponse().getBody(String.class).orElseThrow();
    assertTrue(body.contains("timeZone"));
  }

  @Test
  void anEmptyTimeZoneFallsBackToTheHostLocalDay() {
    LocalDate day = nextWeekday();
    assertEquals(slotsFor(day), slotsFor(day, ""));
  }

  /** The host-local default: the contract before Issue #1, still valid when no zone is sent. */
  private List<Instant> slotsFor(LocalDate date) {
    return client
        .toBlocking()
        .retrieve(
            HttpRequest.GET("/api/slots?date=" + date + "&bookingTypeId=" + QUICK_CHAT_ID),
            new GenericArgument<List<Instant>>() {});
  }

  private List<Instant> slotsFor(LocalDate date, String timeZone) {
    String uri =
        "/api/slots?date=" + date + "&bookingTypeId=" + QUICK_CHAT_ID + "&timeZone=" + timeZone;
    return client
        .toBlocking()
        .retrieve(HttpRequest.GET(uri), new GenericArgument<List<Instant>>() {});
  }

  /** A weekday at least two days out: inside the 14-day window and past the 1-hour notice. */
  private static LocalDate nextWeekday() {
    LocalDate date = LocalDate.now(BERLIN).plusDays(2);
    while (date.getDayOfWeek() == DayOfWeek.SATURDAY || date.getDayOfWeek() == DayOfWeek.SUNDAY) {
      date = date.plusDays(1);
    }
    return date;
  }
}
