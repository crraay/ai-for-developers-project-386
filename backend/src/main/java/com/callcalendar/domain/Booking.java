package com.callcalendar.domain;

import java.time.Instant;

/** A guest's reservation of a specific interval. State per glossary: active | cancelled. */
public record Booking(
    long id,
    String guestName,
    String guestEmail,
    Instant start,
    Instant end,
    String state,
    String cancellationToken) {

  public static final String STATE_ACTIVE = "active";
  public static final String STATE_CANCELLED = "cancelled";

  public boolean isActive() {
    return STATE_ACTIVE.equals(state);
  }
}
