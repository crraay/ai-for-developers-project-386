package com.callcalendar.domain;

import java.time.Instant;

/** A half-open time interval [start, end). */
public record Interval(Instant start, Instant end) {

  public boolean contains(Instant s, Instant e) {
    return !s.isBefore(start) && !e.isAfter(end);
  }

  public boolean overlaps(Instant s, Instant e) {
    return s.isBefore(end) && e.isAfter(start);
  }
}
