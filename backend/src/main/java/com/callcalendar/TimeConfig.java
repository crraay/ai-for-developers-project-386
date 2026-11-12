package com.callcalendar;

import io.micronaut.context.annotation.Factory;
import io.micronaut.context.annotation.Requires;
import jakarta.inject.Singleton;
import java.time.Clock;

@Factory
public class TimeConfig {

  /**
   * Steps aside for the {@code fixed-clock} test environment, which provides its own deterministic
   * Clock (FixedClockConfig in test sources) for tests sensitive to rolling windows like the 14-day
   * booking horizon.
   */
  @Singleton
  @Requires(notEnv = "fixed-clock")
  Clock clock() {
    return Clock.systemUTC();
  }
}
