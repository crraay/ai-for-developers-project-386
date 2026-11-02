package com.callcalendar.api;

import com.callcalendar.domain.Booking;
import io.micronaut.serde.annotation.Serdeable;
import java.time.Instant;

@Serdeable
public record BookingResponse(
    String guestName,
    String guestEmail,
    Instant start,
    Instant end,
    String state,
    String cancellationToken) {

  public static BookingResponse from(Booking booking) {
    return new BookingResponse(
        booking.guestName(),
        booking.guestEmail(),
        booking.start(),
        booking.end(),
        booking.state(),
        booking.cancellationToken());
  }
}
