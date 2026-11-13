package com.callcalendar.api;

import io.micronaut.serde.annotation.Serdeable;

/**
 * Public host settings the guest UI needs: timezone and the number of calendar days a guest can
 * book ahead, including today. The seeded availability is Mon-Fri 09:00-17:00 host-local
 * (Europe/Berlin); allowed durations live in booking_type.
 */
@Serdeable
public record HostSettingsResponse(String timezone, int bookingHorizonDays) {}
