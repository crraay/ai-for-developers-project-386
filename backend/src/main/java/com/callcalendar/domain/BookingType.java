package com.callcalendar.domain;

/**
 * A host-defined shape of booking (title, description, duration). The host creates them; the guest
 * picks one instead of a bare duration (GLOSSARY.md: "Booking type"). The duration is server-facing
 * only: clients ask {@code POST /api/bookings} with a {@code bookingTypeId} and the server derives
 * {@code durationMinutes} from the active type.
 */
public record BookingType(
    long id,
    String title,
    String description,
    int durationMinutes,
    int sortOrder,
    boolean active) {}
