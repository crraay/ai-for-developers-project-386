package com.callcalendar.api;

import io.micronaut.serde.annotation.Serdeable;

/** RFC 7807 problem detail; served as application/problem+json. */
@Serdeable
public record ProblemDetail(String type, String title, int status, String detail) {}
