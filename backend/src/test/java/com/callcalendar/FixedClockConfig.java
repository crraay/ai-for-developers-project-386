package com.callcalendar;

import io.micronaut.context.annotation.Factory;
import io.micronaut.context.annotation.Requires;
import jakarta.inject.Singleton;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;

/**
 * Deterministic clock for tests sensitive to rolling windows (the 90-day booking horizon). Only
 * active for tests running with the {@code fixed-clock} environment; TimeConfig's system clock
 * steps aside there.
 */
@Factory
@Requires(env = "fixed-clock")
public class FixedClockConfig {

  /**
   * 2026-10-16T13:10Z: the horizon lands at 2027-01-14T13:10Z (14:10 Berlin, Thursday), cutting the
   * seeded 09:00-17:00 window mid-day.
   */
  @Singleton
  Clock clock() {
    return Clock.fixed(Instant.parse("2026-10-16T13:10:00Z"), ZoneOffset.UTC);
  }
}
