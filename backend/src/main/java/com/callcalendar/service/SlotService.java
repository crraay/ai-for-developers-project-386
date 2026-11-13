package com.callcalendar.service;

import com.callcalendar.domain.BookingType;
import com.callcalendar.domain.Interval;
import com.callcalendar.repo.BookingRepository;
import jakarta.inject.Singleton;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;

/**
 * Slot generation per docs/domain.md: slot starts are aligned to the 15-minute grid, fully
 * contained in availability, at least 1 hour in the future and inside the inclusive 14-calendar-day
 * window (the last date is today + 13), and free of active bookings. The duration comes from the
 * booking type the guest picked (Issue #28). The queried day itself is resolved in the caller's
 * timezone — the guest's calendar day, not the host's (UC-2, Issue #1); availability, the 1-hour
 * notice and the booking window remain host-local rules on the same instants.
 */
@Singleton
public class SlotService {

  private final AvailabilityService availabilityService;
  private final BookingTypeService bookingTypeService;
  private final BookingRepository bookingRepository;
  private final Clock clock;

  public SlotService(
      AvailabilityService availabilityService,
      BookingTypeService bookingTypeService,
      BookingRepository bookingRepository,
      Clock clock) {
    this.availabilityService = availabilityService;
    this.bookingTypeService = bookingTypeService;
    this.bookingRepository = bookingRepository;
    this.clock = clock;
  }

  /**
   * Available slot start instants (UTC) for one <em>host-local</em> day and a single booking type.
   * This is the contract when the client sends no {@code timeZone}.
   */
  public List<Instant> slotsFor(LocalDate date, long bookingTypeId) {
    return slotsFor(date, bookingTypeId, availabilityService.hostZone());
  }

  /**
   * Available slot start instants (UTC) for one calendar day of {@code dayZone} (UC-2, Issue #1):
   * the guest picks a date in their own calendar, so {@code date} spans {@code dayZone}'s midnight
   * to midnight. Everything else stays host-local — availability and the 14-day window are the
   * host's rules, evaluated on the same UTC instants.
   */
  public List<Instant> slotsFor(LocalDate date, long bookingTypeId, ZoneId dayZone) {
    BookingType type = bookingTypeService.requireActive(bookingTypeId);
    int durationMinutes = type.durationMinutes();
    ZoneId zone = availabilityService.hostZone();
    Duration duration = Duration.ofMinutes(durationMinutes);
    Instant dayStart = date.atStartOfDay(dayZone).toInstant();
    Instant dayEnd = date.plusDays(1).atStartOfDay(dayZone).toInstant();

    Instant now = clock.instant();
    // The horizon bounds the start, not the whole slot (docs/domain.md: a valid
    // slot start lies inside the inclusive 14-calendar-day window). BookingService
    // accepts the same starts, so browse must offer them too.
    Instant horizon = BookingRules.horizonEnd(zone, now);
    Instant from = max(dayStart, BookingRules.alignUp(now.plus(BookingRules.MIN_NOTICE)));
    if (!from.isBefore(dayEnd) || !from.isBefore(horizon)) {
      return List.of();
    }

    // Read windows and busy bookings past the bounds: a slot starting just
    // inside them extends beyond by its duration.
    Instant rangeEnd = min(dayEnd, horizon).plus(duration);
    List<Interval> windows = availabilityService.mergedIntervals(from, rangeEnd);
    List<Interval> busy = bookingRepository.findActiveOverlapping(from, rangeEnd);

    List<Instant> slots = new ArrayList<>();
    for (Instant start = from;
        start.isBefore(dayEnd) && start.isBefore(horizon);
        start = start.plus(BookingRules.SLOT_GRID)) {
      Instant end = start.plus(duration);
      if (isFree(windows, busy, start, end)) {
        slots.add(start);
      }
    }
    return slots;
  }

  private static boolean isFree(
      List<Interval> windows, List<Interval> busy, Instant start, Instant end) {
    boolean contained = windows.stream().anyMatch(window -> window.contains(start, end));
    if (!contained) {
      return false;
    }
    return busy.stream().noneMatch(blocked -> blocked.overlaps(start, end));
  }

  private static Instant max(Instant a, Instant b) {
    return a.isAfter(b) ? a : b;
  }

  private static Instant min(Instant a, Instant b) {
    return a.isBefore(b) ? a : b;
  }
}
