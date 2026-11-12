package com.callcalendar.api;

import com.callcalendar.domain.Booking;
import io.micronaut.serde.annotation.Serdeable;

/**
 * Bookings payload the host page needs. Mirrors BookingResponse minus the secret cancellation
 * token: the token is meant to be per-guest (docs/domain.md), and listing every guest's token in
 * one unauthenticated response would contradict that. The id is included so the host view can drive
 * host-side cancellation by id (UC-6). {@code meetingTypeId} lets the host page render the booking
 * type of each row (which one the guest chose).
 */
@Serdeable
public record HostBookingResponse(
    long id,
    String guestName,
    String guestEmail,
    String start,
    String end,
    String state,
    long meetingTypeId) {

  public static HostBookingResponse from(Booking booking) {
    return new HostBookingResponse(
        booking.id(),
        booking.guestName(),
        booking.guestEmail(),
        booking.start().toString(),
        booking.end().toString(),
        booking.state(),
        booking.meetingTypeId());
  }
}
