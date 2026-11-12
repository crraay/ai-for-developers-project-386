package com.callcalendar.service;

import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;

/**
 * The v1 booking constants from docs/domain.md: 15-minute slot grid, 1 hour minimum notice, 14-day
 * calendar-day booking horizon.
 */
public final class BookingRules {

  public static final Duration SLOT_GRID = Duration.ofMinutes(15);
  public static final Duration MIN_NOTICE = Duration.ofHours(1);
  public static final int HORIZON_DAYS = 14;

  private BookingRules() {}

  /**
   * The exclusive end of the booking window: the start of the 15th host-local calendar day from
   * {@code now}. A slot starting at any instant strictly before this instant is inside the horizon.
   */
  public static Instant horizonEnd(ZoneId zone, Instant now) {
    return LocalDate.ofInstant(now, zone)
        .plusDays(HORIZON_DAYS + 1L)
        .atStartOfDay(zone)
        .toInstant();
  }

  /** The first instant at or after {@code instant} that lies on the slot grid. */
  public static Instant alignUp(Instant instant) {
    long gridSeconds = SLOT_GRID.toSeconds();
    long epoch = instant.getEpochSecond();
    long aligned = Math.floorDiv(epoch + gridSeconds - 1, gridSeconds) * gridSeconds;
    return Instant.ofEpochSecond(aligned);
  }

  /** True when {@code instant} lies exactly on the slot grid. */
  public static boolean isAligned(Instant instant) {
    return instant.getEpochSecond() % SLOT_GRID.toSeconds() == 0;
  }
}
