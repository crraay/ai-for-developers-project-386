package com.callcalendar.domain;

import java.time.Duration;
import java.time.LocalDateTime;

/**
 * A weekly repeating period of availability. Times are wall-clock in the host's timezone;
 * occurrences are produced by expanding {@link #rrule()} from {@link #dtstartLocal()}.
 */
public record RecurringWindow(LocalDateTime dtstartLocal, LocalDateTime dtendLocal, String rrule) {

  /** Length of one occurrence on the host-local clock. */
  public Duration length() {
    return Duration.between(dtstartLocal, dtendLocal);
  }
}
