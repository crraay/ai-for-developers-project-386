package com.callcalendar;

import io.micronaut.context.annotation.Factory;
import io.micronaut.context.annotation.Requires;
import jakarta.inject.Singleton;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;

/**
 * Deterministic clock for tests sensitive to rolling windows (the 14-day booking horizon). Only
 * active for tests running with the {@code fixed-clock} environment; TimeConfig's system clock
 * steps aside there.
 */
@Factory
@Requires(env = "fixed-clock")
public class FixedClockConfig {

  /**
   * 2026-10-16T13:10Z: the 14th host-local calendar day from then ends at the start of 2026-10-31
   * Berlin, which is 2026-10-30T23:00Z (CET after the Oct 25 DST change).
   */
  @Singleton
  Clock clock() {
    return Clock.fixed(Instant.parse("2026-10-16T13:10:00Z"), ZoneOffset.UTC);
  }
}
