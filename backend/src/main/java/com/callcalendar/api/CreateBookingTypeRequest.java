package com.callcalendar.api;

import io.micronaut.serde.annotation.Serdeable;

/** Body of POST /api/host/booking-types. Fields are nullable because input is untrusted. */
@Serdeable
public record CreateBookingTypeRequest(String title, String description, Integer durationMinutes) {}
