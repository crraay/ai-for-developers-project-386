package com.callcalendar.domain;

import java.time.Instant;

/**
 * A guest's reservation of a specific interval. State per glossary: active | cancelled. The {@code
 * bookingTypeId} is the booking type the guest picked; the duration is derived server-side from it
 * (GLOSSARY.md: "Booking type").
 */
public record Booking(
    long id,
    String guestName,
    String guestEmail,
    Instant start,
    Instant end,
    String state,
    long bookingTypeId,
    String cancellationToken) {

  public static final String STATE_ACTIVE = "active";
  public static final String STATE_CANCELLED = "cancelled";

  public boolean isActive() {
    return STATE_ACTIVE.equals(state);
  }
}
