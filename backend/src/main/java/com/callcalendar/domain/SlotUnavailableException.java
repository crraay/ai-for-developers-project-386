package com.callcalendar.domain;

/** The requested slot cannot be booked: taken, past, too soon, or beyond the horizon. */
public class SlotUnavailableException extends RuntimeException {

  public SlotUnavailableException(String message) {
    super(message);
  }

  public SlotUnavailableException(String message, Throwable cause) {
    super(message, cause);
  }
}
