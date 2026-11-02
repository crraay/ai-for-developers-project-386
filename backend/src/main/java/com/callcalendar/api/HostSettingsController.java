package com.callcalendar.api;

import com.callcalendar.service.AvailabilityService;
import io.micronaut.http.annotation.Controller;
import io.micronaut.http.annotation.Get;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;

@Tag(name = "host-settings")
@Controller("/api/host-settings")
public class HostSettingsController {

  private final AvailabilityService availabilityService;

  public HostSettingsController(AvailabilityService availabilityService) {
    this.availabilityService = availabilityService;
  }

  @Get
  @Operation(
      summary = "Public host settings: timezone and allowed booking durations",
      operationId = "getHostSettings")
  @ApiResponse(
      responseCode = "200",
      description = "Host settings",
      content = @Content(schema = @Schema(implementation = HostSettingsResponse.class)))
  public HostSettingsResponse getHostSettings() {
    var settings = availabilityService.hostSettings();
    return new HostSettingsResponse(
        settings.timezone(), List.copyOf(settings.allowedDurationMinutes()));
  }
}
