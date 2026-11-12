package com.callcalendar.service;

import com.callcalendar.domain.Booking;
import com.callcalendar.domain.BookingType;
import com.callcalendar.domain.Interval;
import com.callcalendar.domain.SlotUnavailableException;
import com.callcalendar.repo.BookingRepository;
import io.micronaut.core.annotation.Nullable;
import jakarta.inject.Singleton;
import java.security.SecureRandom;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.format.DateTimeParseException;
import java.util.HexFormat;
import java.util.List;

/**
 * Booking use cases: create (UC-3) and cancel via secret token (UC-4). The duration is derived
 * server-side from the booking type the guest picked (Issue #28; GLOSSARY.md: "Booking type"). The
 * double-booking invariant is ultimately enforced by the database (ADR-0006); the checks here
 * produce friendly 409s before we get there.
 */
@Singleton
public class BookingService {

  private static final SecureRandom RANDOM = new SecureRandom();

  private final BookingRepository bookingRepository;
  private final BookingTypeService bookingTypeService;
  private final AvailabilityService availabilityService;
  private final Clock clock;

  public BookingService(
      BookingRepository bookingRepository,
      BookingTypeService bookingTypeService,
      AvailabilityService availabilityService,
      Clock clock) {
    this.bookingRepository = bookingRepository;
    this.bookingTypeService = bookingTypeService;
    this.availabilityService = availabilityService;
    this.clock = clock;
  }

  public Booking create(
      String startRaw, @Nullable Long meetingTypeIdRaw, String guestName, String guestEmail) {
    Instant start = parseStart(startRaw);
    if (meetingTypeIdRaw == null) {
      throw new InvalidRequestException("meetingTypeId is required");
    }
    BookingType type = bookingTypeService.requireActive(meetingTypeIdRaw);
    int duration = type.durationMinutes();
    if (isBlank(guestName) || isBlank(guestEmail)) {
      throw new InvalidRequestException("guestName and guestEmail are required");
    }
    Instant end = start.plus(Duration.ofMinutes(duration));
    validateBookable(start, end);
    String token = generateToken();
    bookingRepository.insert(guestName.trim(), guestEmail.trim(), start, end, type.id(), token);
    return new Booking(
        0, guestName.trim(), guestEmail.trim(), start, end, Booking.STATE_ACTIVE, type.id(), token);
  }

  public Booking getByToken(String token) {
    return bookingRepository
        .findByToken(token)
        .orElseThrow(() -> new BookingNotFoundException("booking not found"));
  }

  /**
   * UC-5: book bookings with {@code end > now} (ongoing + future), both states, sorted ascending.
   * The caller decides how to split the result into "Happening now" vs the upcoming list.
   */
  public List<Booking> listUpcoming(Instant now) {
    return bookingRepository.findUpcomingEndingAfter(now);
  }

  /** Idempotent for already-cancelled bookings; refuses once the booking has started. */
  public Booking cancel(String token) {
    return cancelInternal(
        bookingRepository
            .findByToken(token)
            .orElseThrow(() -> new BookingNotFoundException("booking not found")));
  }

  /**
   * UC-6: host-side cancellation by numeric id. Same semantics as the token-based cancel:
   * idempotent if already cancelled, refuses once the booking has started (invariant #3).
   */
  public Booking cancelById(long id) {
    return cancelInternal(
        bookingRepository
            .findById(id)
            .orElseThrow(() -> new BookingNotFoundException("booking not found")));
  }

  private Booking cancelInternal(Booking booking) {
    if (!booking.isActive()) {
      return booking;
    }
    if (!booking.start().isAfter(clock.instant())) {
      throw new SlotUnavailableException("booking can no longer be cancelled");
    }
    bookingRepository.markCancelled(booking.id());
    return new Booking(
        booking.id(),
        booking.guestName(),
        booking.guestEmail(),
        booking.start(),
        booking.end(),
        Booking.STATE_CANCELLED,
        booking.meetingTypeId(),
        booking.cancellationToken());
  }

  private void validateBookable(Instant start, Instant end) {
    Instant now = clock.instant();
    // Every non-bookable reason shares the product's single "slot no longer
    // available" copy (taken, past, too soon, beyond horizon, off-grid, outside
    // availability); only the DB constraint enforces the taken case.
    if (!BookingRules.isAligned(start)
        || start.isBefore(now.plus(BookingRules.MIN_NOTICE))
        || start.isAfter(now.plus(BookingRules.HORIZON))) {
      throw new SlotUnavailableException("slot no longer available");
    }
    List<Interval> windows =
        availabilityService.mergedIntervals(start.minus(Duration.ofDays(1)), end);
    boolean contained = windows.stream().anyMatch(window -> window.contains(start, end));
    if (!contained) {
      throw new SlotUnavailableException("slot no longer available");
    }
    List<Interval> busy = bookingRepository.findActiveOverlapping(start, end);
    if (busy.stream().anyMatch(blocked -> blocked.overlaps(start, end))) {
      throw new SlotUnavailableException("slot no longer available");
    }
  }

  private static Instant parseStart(String startRaw) {
    if (isBlank(startRaw)) {
      throw new InvalidRequestException("start is required");
    }
    try {
      return Instant.parse(startRaw);
    } catch (DateTimeParseException e) {
      throw new InvalidRequestException("start must be an ISO-8601 instant");
    }
  }

  private static boolean isBlank(String value) {
    return value == null || value.isBlank();
  }

  private static String generateToken() {
    byte[] bytes = new byte[16];
    RANDOM.nextBytes(bytes);
    return HexFormat.of().formatHex(bytes);
  }
}
