package com.callcalendar.api;

import com.callcalendar.domain.BookingType;
import io.micronaut.serde.annotation.Serdeable;

/** Public payload for a booking type — used by both the guest list and host CRUD responses. */
@Serdeable
public record BookingTypeResponse(
    long id, String title, String description, int durationMinutes, int sortOrder, boolean active) {

  public static BookingTypeResponse from(BookingType type) {
    return new BookingTypeResponse(
        type.id(),
        type.title(),
        type.description(),
        type.durationMinutes(),
        type.sortOrder(),
        type.active());
  }
}
