package com.callcalendar.api;

import io.micronaut.serde.annotation.Serdeable;

/**
 * Public host settings the guest UI needs: timezone and the number of calendar days a guest can
 * book ahead. Allowed durations now live in booking_type.
 */
@Serdeable
public record HostSettingsResponse(String timezone, int bookingHorizonDays) {}
