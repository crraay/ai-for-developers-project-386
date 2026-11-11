package com.callcalendar.service;

import java.time.Duration;
import java.time.Instant;

/**
 * The v1 booking constants from docs/domain.md: 15-minute slot grid, 1 hour minimum notice, 14-day
 * rolling booking horizon.
 */
public final class BookingRules {

  public static final Duration SLOT_GRID = Duration.ofMinutes(15);
  public static final Duration MIN_NOTICE = Duration.ofHours(1);
  public static final Duration HORIZON = Duration.ofDays(14);

  private BookingRules() {}

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
