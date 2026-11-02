package com.callcalendar.domain;

import java.util.Set;

/** The single host_settings row (timezone + allowed booking durations). */
public record HostSettings(String timezone, Set<Integer> allowedDurationMinutes) {

  public boolean allowsDuration(int minutes) {
    return allowedDurationMinutes.contains(minutes);
  }
}
