package com.callcalendar.domain;

/** The single host_settings row (timezone only — allowed durations live on booking_type). */
public record HostSettings(String timezone) {}
