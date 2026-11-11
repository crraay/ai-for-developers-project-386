package com.callcalendar.api;

import com.callcalendar.service.AvailabilityService;
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
      summary = "Public host settings: timezone and allowed booking durations",
      operationId = "getHostSettings")
  @ApiResponse(
      responseCode = "200",
      description = "Host settings",
      content = @Content(schema = @Schema(implementation = HostSettingsResponse.class)))
  public HostSettingsResponse getHostSettings() {
    var settings = availabilityService.hostSettings();
    // Sorted ascending: the domain stores allowed durations as a Set (Set.copyOf
    // has unspecified iteration order) and the guest UI picks durations[0] as its
    // default, so the API must not leak that order.
    return new HostSettingsResponse(
        settings.timezone(), settings.allowedDurationMinutes().stream().sorted().toList());
  }
}
