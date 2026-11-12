package com.callcalendar.service;

/** No booking type exists for the supplied id. */
public class BookingTypeNotFoundException extends RuntimeException {

  public BookingTypeNotFoundException(String message) {
    super(message);
  }
}
