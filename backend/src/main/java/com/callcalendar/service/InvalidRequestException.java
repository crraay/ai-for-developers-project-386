package com.callcalendar.service;

/** The request is structurally invalid (malformed values, disallowed duration). */
public class InvalidRequestException extends RuntimeException {

  public InvalidRequestException(String message) {
    super(message);
  }
}
