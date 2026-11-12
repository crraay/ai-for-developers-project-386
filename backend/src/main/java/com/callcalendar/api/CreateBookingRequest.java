package com.callcalendar.api;

import io.micronaut.core.annotation.Nullable;
import io.micronaut.serde.annotation.Serdeable;

/**
 * Body of POST /api/bookings. The guest picks a booking type and the server derives {@code
 * durationMinutes} from it (GLOSSARY.md: "Booking type"). Fields are nullable because input is
 * untrusted.
 */
@Serdeable
public record CreateBookingRequest(
    String start, @Nullable Long meetingTypeId, String guestName, String guestEmail) {}
