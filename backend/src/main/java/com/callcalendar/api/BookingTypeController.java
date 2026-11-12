package com.callcalendar.api;

import com.callcalendar.domain.BookingType;
import com.callcalendar.repo.BookingTypeRepository;
import com.callcalendar.service.InvalidRequestException;
import io.micronaut.http.HttpResponse;
import io.micronaut.http.annotation.Body;
import io.micronaut.http.annotation.Controller;
import io.micronaut.http.annotation.Delete;
import io.micronaut.http.annotation.Get;
import io.micronaut.http.annotation.PathVariable;
import io.micronaut.http.annotation.Post;
import io.micronaut.http.annotation.Put;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.ArraySchema;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;

/**
 * Booking-type CRUD. The guest surface is the public list (active rows, sorted); the host surface
 * sits under {@code /api/host/booking-types}. Lives in one controller so the path prefixes are
 * declared next to each other and cannot silently drift.
 */
@Tag(name = "booking-types")
@Controller
public class BookingTypeController {

  private final BookingTypeRepository repository;

  public BookingTypeController(BookingTypeRepository repository) {
    this.repository = repository;
  }

  @Get("/api/booking-types")
  @Operation(
      summary = "Active booking types for the guest picker",
      operationId = "listActiveBookingTypes")
  @ApiResponse(
      responseCode = "200",
      description = "Active types, sorted for the picker (lowest sort_order first)",
      content =
          @Content(array = @ArraySchema(schema = @Schema(implementation = BookingTypeResponse.class))))
  public List<BookingTypeResponse> listActive() {
    return repository.findActive().stream().map(BookingTypeResponse::from).toList();
  }

  @Get("/api/host/booking-types")
  @Operation(
      summary = "All booking types (host view), including inactive and drafts",
      operationId = "listAllBookingTypes")
  @ApiResponse(
      responseCode = "200",
      description = "Every row, ordered for the host settings page",
      content =
          @Content(array = @ArraySchema(schema = @Schema(implementation = BookingTypeResponse.class))))
  public List<BookingTypeResponse> listAll() {
    return repository.findAll().stream().map(BookingTypeResponse::from).toList();
  }

  @Post("/api/host/booking-types")
  @Operation(summary = "Create a booking type", operationId = "createBookingType")
  @ApiResponse(
      responseCode = "201",
      description = "The new type, with database-assigned id and sort_order",
      content = @Content(schema = @Schema(implementation = BookingTypeResponse.class)))
  @ApiResponse(
      responseCode = "400",
      description = "Missing or invalid fields (blank title, non-positive duration)",
      content =
          @Content(
              mediaType = "application/problem+json",
              schema = @Schema(implementation = ProblemDetail.class)))
  public HttpResponse<BookingTypeResponse> create(@Body CreateBookingTypeRequest body) {
    String title = validateTitle(body.title());
    int duration = validateDuration(body.durationMinutes());
    BookingType created = repository.insert(title, body.description(), duration);
    return HttpResponse.created(BookingTypeResponse.from(created));
  }

  @Put("/api/host/booking-types/{id}")
  @Operation(summary = "Update a booking type", operationId = "updateBookingType")
  @ApiResponse(
      responseCode = "200",
      description = "The updated type",
      content = @Content(schema = @Schema(implementation = BookingTypeResponse.class)))
  @ApiResponse(
      responseCode = "400",
      description = "Missing or invalid fields",
      content =
          @Content(
              mediaType = "application/problem+json",
              schema = @Schema(implementation = ProblemDetail.class)))
  @ApiResponse(
      responseCode = "404",
      description = "No booking type with this id",
      content =
          @Content(
              mediaType = "application/problem+json",
              schema = @Schema(implementation = ProblemDetail.class)))
  public BookingTypeResponse update(@PathVariable long id, @Body UpdateBookingTypeRequest body) {
    String title = validateTitle(body.title());
    int duration = validateDuration(body.durationMinutes());
    Integer sortOrder = body.sortOrder();
    if (sortOrder == null) {
      throw new InvalidRequestException("sortOrder is required");
    }
    Boolean active = body.active();
    if (active == null) {
      throw new InvalidRequestException("active is required");
    }
    return repository
        .update(id, title, body.description(), duration, sortOrder, active)
        .map(BookingTypeResponse::from)
        .orElseThrow(() -> new com.callcalendar.service.BookingTypeNotFoundException(
            "no booking type with id " + id));
  }

  @Delete("/api/host/booking-types/{id}")
  @Operation(summary = "Delete a booking type", operationId = "deleteBookingType")
  @ApiResponse(responseCode = "204", description = "Type deleted")
  @ApiResponse(
      responseCode = "404",
      description = "No booking type with this id",
      content =
          @Content(
              mediaType = "application/problem+json",
              schema = @Schema(implementation = ProblemDetail.class)))
  public HttpResponse<?> delete(@PathVariable long id) {
    if (!repository.deleteById(id)) {
      throw new com.callcalendar.service.BookingTypeNotFoundException(
          "no booking type with id " + id);
    }
    return HttpResponse.noContent();
  }

  private static String validateTitle(String raw) {
    if (raw == null || raw.isBlank()) {
      throw new InvalidRequestException("title is required");
    }
    return raw.trim();
  }

  private static int validateDuration(Integer raw) {
    if (raw == null || raw <= 0) {
      throw new InvalidRequestException("durationMinutes must be a positive integer");
    }
    return raw;
  }
}
