package com.callcalendar.api;

import com.callcalendar.service.BookingService;
import io.micronaut.http.annotation.Controller;
import io.micronaut.http.annotation.PathVariable;
import io.micronaut.http.annotation.Post;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;

/**
 * Host-only booking operations. The {@code /api/host/} prefix scopes the intentionally
 * unauthenticated endpoints (docs/product.md: deliberate v1 risk). Lives in its own controller so
 * the path can never collide with the guest-side {@code /api/bookings/\{token\}/cancel}.
 */
@Tag(name = "host-bookings")
@Controller("/api/host/bookings")
public class HostBookingController {

  private final BookingService bookingService;

  public HostBookingController(BookingService bookingService) {
    this.bookingService = bookingService;
  }

  @Post("/{id}/cancel")
  @Operation(
      summary = "Cancel a booking by its numeric id (host view)",
      operationId = "cancelBookingById")
  @ApiResponse(
      responseCode = "200",
      description = "The booking, now cancelled; the slot is free again",
      content = @Content(schema = @Schema(implementation = HostBookingResponse.class)))
  @ApiResponse(
      responseCode = "404",
      description = "No booking for this id",
      content =
          @Content(
              mediaType = "application/problem+json",
              schema = @Schema(implementation = ProblemDetail.class)))
  @ApiResponse(
      responseCode = "409",
      description = "The booking has started and can no longer be cancelled",
      content =
          @Content(
              mediaType = "application/problem+json",
              schema = @Schema(implementation = ProblemDetail.class)))
  public HostBookingResponse cancelById(@PathVariable long id) {
    return HostBookingResponse.from(bookingService.cancelById(id));
  }
}
