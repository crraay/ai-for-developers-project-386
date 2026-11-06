package com.callcalendar.api;

import com.callcalendar.domain.Booking;
import io.micronaut.serde.annotation.Serdeable;
import java.time.Instant;

/**
 * Bookings payload the host page needs. Mirrors {@link BookingResponse} minus the secret
 * cancellation token: the token is meant to be per-guest (docs/domain.md), and listing every
 * guest's token in one unauthenticated response would contradict that. The id is included so the
 * host view can drive host-side cancellation by id (UC-6).
 */
@Serdeable
public record HostBookingResponse(
    long id, String guestName, String guestEmail, Instant start, Instant end, String state) {

  public static HostBookingResponse from(Booking booking) {
    return new HostBookingResponse(
        booking.id(),
        booking.guestName(),
        booking.guestEmail(),
        booking.start(),
        booking.end(),
        booking.state());
  }
}
