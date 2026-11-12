package com.callcalendar.api;

import com.callcalendar.service.InvalidRequestException;
import com.callcalendar.service.SlotService;
import io.micronaut.http.annotation.Controller;
import io.micronaut.http.annotation.Get;
import io.micronaut.http.annotation.QueryValue;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.time.Instant;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.List;

@Tag(name = "slots")
@Controller("/api/slots")
public class SlotController {

  private final SlotService slotService;

  public SlotController(SlotService slotService) {
    this.slotService = slotService;
  }

  @Get
  @Operation(
      summary = "Available slot start times for a host-local day, filtered by booking type",
      operationId = "getSlots")
  @ApiResponse(responseCode = "200", description = "Slot start times as UTC instants")
  @ApiResponse(
      responseCode = "400",
      description = "Malformed date or unknown / inactive meetingTypeId",
      content =
          @Content(
              mediaType = "application/problem+json",
              schema = @Schema(implementation = ProblemDetail.class)))
  public List<Instant> getSlots(@QueryValue String date, @QueryValue long meetingTypeId) {
    LocalDate parsed;
    try {
      parsed = LocalDate.parse(date);
    } catch (DateTimeParseException e) {
      throw new InvalidRequestException("date must be formatted YYYY-MM-DD");
    }
    return slotService.slotsFor(parsed, meetingTypeId);
  }
}
