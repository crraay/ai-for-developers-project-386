package com.callcalendar.api;

import com.callcalendar.service.BookingService;
import io.micronaut.http.HttpResponse;
import io.micronaut.http.annotation.Body;
import io.micronaut.http.annotation.Controller;
import io.micronaut.http.annotation.Get;
import io.micronaut.http.annotation.PathVariable;
import io.micronaut.http.annotation.Post;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.ArraySchema;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.time.Clock;
import java.util.List;

@Tag(name = "booking")
@Controller("/api/bookings")
public class BookingController {

  private final BookingService bookingService;
  private final Clock clock;

  public BookingController(BookingService bookingService, Clock clock) {
    this.bookingService = bookingService;
    this.clock = clock;
  }

  @Post
  @Operation(summary = "Book an available slot", operationId = "createBooking")
  @ApiResponse(
      responseCode = "201",
      description = "Booking created; cancellationToken unlocks UC-4",
      content = @Content(schema = @Schema(implementation = BookingResponse.class)))
  @ApiResponse(
      responseCode = "400",
      description = "Malformed body, missing meetingTypeId, or inactive booking type",
      content =
          @Content(
              mediaType = "application/problem+json",
              schema = @Schema(implementation = ProblemDetail.class)))
  @ApiResponse(
      responseCode = "409",
      description = "Slot no longer available (taken, past, too soon, or outside availability)",
      content =
          @Content(
              mediaType = "application/problem+json",
              schema = @Schema(implementation = ProblemDetail.class)))
  public HttpResponse<BookingResponse> create(@Body CreateBookingRequest request) {
    return HttpResponse.created(
        BookingResponse.from(
            bookingService.create(
                request.start(),
                request.meetingTypeId(),
                request.guestName(),
                request.guestEmail())));
  }

  @Get
  @Operation(summary = "List upcoming bookings", operationId = "listBookings")
  @ApiResponse(
      responseCode = "200",
      description =
          "Bookings with end_at > now, both states, sorted by start_at ascending. The host UI"
              + " splits the response into a 'Happening now' section (start <= now < end) and"
              + " the upcoming list (start > now).",
      content =
          @Content(
              array = @ArraySchema(schema = @Schema(implementation = HostBookingResponse.class))))
  public List<HostBookingResponse> list() {
    return bookingService.listUpcoming(clock.instant()).stream()
        .map(HostBookingResponse::from)
        .toList();
  }

  @Get("/{token}")
  @Operation(summary = "Booking details by secret cancellation token", operationId = "getBooking")
  @ApiResponse(
      responseCode = "200",
      description = "The booking",
      content = @Content(schema = @Schema(implementation = BookingResponse.class)))
  @ApiResponse(
      responseCode = "404",
      description = "No booking for this token",
      content =
          @Content(
              mediaType = "application/problem+json",
              schema = @Schema(implementation = ProblemDetail.class)))
  public BookingResponse get(@PathVariable String token) {
    return BookingResponse.from(bookingService.getByToken(token));
  }

  @Post("/{token}/cancel")
  @Operation(summary = "Cancel a booking via its secret token", operationId = "cancelBooking")
  @ApiResponse(
      responseCode = "200",
      description = "The booking, now cancelled; the slot is free again",
      content = @Content(schema = @Schema(implementation = BookingResponse.class)))
  @ApiResponse(
      responseCode = "404",
      description = "No booking for this token",
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
  public BookingResponse cancel(@PathVariable String token) {
    return BookingResponse.from(bookingService.cancel(token));
  }
}
