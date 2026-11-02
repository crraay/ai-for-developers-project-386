package com.callcalendar.service;

/** No booking exists for the supplied secret cancellation token. */
public class BookingNotFoundException extends RuntimeException {

  public BookingNotFoundException(String message) {
    super(message);
  }
}
