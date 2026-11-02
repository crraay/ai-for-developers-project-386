package com.callcalendar.api;

import io.micronaut.serde.annotation.Serdeable;

/** Body of POST /api/bookings. Fields are nullable because input is untrusted. */
@Serdeable
public record CreateBookingRequest(
    String start, Integer durationMinutes, String guestName, String guestEmail) {}
