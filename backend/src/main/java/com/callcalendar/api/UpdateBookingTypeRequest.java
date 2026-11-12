package com.callcalendar.api;

import io.micronaut.serde.annotation.Serdeable;

/**
 * Body of PUT /api/host/booking-types/{id}. {@code sortOrder} and {@code active} are host-only
 * bookkeeping fields, so the host can move the type to the top of the picker or hide it without
 * creating / deleting.
 */
@Serdeable
public record UpdateBookingTypeRequest(
    String title, String description, Integer durationMinutes, Integer sortOrder, Boolean active) {}
