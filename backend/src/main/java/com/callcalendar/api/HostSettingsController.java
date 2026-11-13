package com.callcalendar.api;

import com.callcalendar.service.AvailabilityService;
import com.callcalendar.service.BookingRules;
import io.micronaut.http.annotation.Controller;
import io.micronaut.http.annotation.Get;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;

@Tag(name = "host-settings")
@Controller("/api/host-settings")
public class HostSettingsController {

  private final AvailabilityService availabilityService;

  public HostSettingsController(AvailabilityService availabilityService) {
    this.availabilityService = availabilityService;
  }

  @Get
  @Operation(
      summary = "Public host settings: timezone and inclusive booking window",
      operationId = "getHostSettings")
  @ApiResponse(
      responseCode = "200",
      description =
          "Host timezone, the 14-calendar-day window including today, and the seeded"
              + " Mon-Fri 09:00-17:00 host-local availability",
      content = @Content(schema = @Schema(implementation = HostSettingsResponse.class)))
  public HostSettingsResponse getHostSettings() {
    return new HostSettingsResponse(
        availabilityService.hostSettings().timezone(), BookingRules.HORIZON_DAYS);
  }
}
