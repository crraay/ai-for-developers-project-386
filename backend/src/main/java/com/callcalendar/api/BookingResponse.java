package com.callcalendar.api;

import com.callcalendar.domain.Booking;
import io.micronaut.serde.annotation.Serdeable;

/** Payload returned to guests (UC-3, UC-4) — exposes the secret cancellation token. */
@Serdeable
public record BookingResponse(
    String guestName,
    String guestEmail,
    String start,
    String end,
    String state,
    long meetingTypeId,
    String cancellationToken) {

  public static BookingResponse from(Booking booking) {
    return new BookingResponse(
        booking.guestName(),
        booking.guestEmail(),
        booking.start().toString(),
        booking.end().toString(),
        booking.state(),
        booking.meetingTypeId(),
        booking.cancellationToken());
  }
}
