package com.callcalendar.api;

import com.callcalendar.domain.SlotUnavailableException;
import com.callcalendar.service.BookingNotFoundException;
import com.callcalendar.service.InvalidRequestException;
import io.micronaut.http.HttpResponse;
import io.micronaut.http.HttpStatus;
import io.micronaut.http.MediaType;
import io.micronaut.http.annotation.Controller;
import io.micronaut.http.annotation.Error;
import jakarta.inject.Singleton;

/**
 * Maps domain errors to RFC 7807 problem+json responses. Must be a @Controller: Micronaut
 * registers @Error methods as error routes, which are only collected from controller beans (global
 * = true makes them match exceptions from every route).
 */
@Controller
@Singleton
public class ApiExceptionHandler {

  public static final MediaType PROBLEM_JSON = MediaType.of("application/problem+json");

  @Error(exception = SlotUnavailableException.class, global = true)
  public HttpResponse<ProblemDetail> slotUnavailable(SlotUnavailableException e) {
    return problem(HttpStatus.CONFLICT, "Slot no longer available", detail(e));
  }

  @Error(exception = BookingNotFoundException.class, global = true)
  public HttpResponse<ProblemDetail> bookingNotFound(BookingNotFoundException e) {
    return problem(HttpStatus.NOT_FOUND, "Booking not found", detail(e));
  }

  @Error(exception = InvalidRequestException.class, global = true)
  public HttpResponse<ProblemDetail> invalidRequest(InvalidRequestException e) {
    return problem(HttpStatus.BAD_REQUEST, "Invalid request", detail(e));
  }

  private static String detail(RuntimeException e) {
    String message = e.getMessage();
    return message != null ? message : "";
  }

  private static HttpResponse<ProblemDetail> problem(
      HttpStatus status, String title, String detail) {
    return HttpResponse.<ProblemDetail>status(status)
        .contentType(PROBLEM_JSON)
        .body(new ProblemDetail("about:blank", title, status.getCode(), detail));
  }
}
