package com.callcalendar;

import io.micronaut.http.MediaType;
import io.micronaut.http.annotation.Controller;
import io.micronaut.http.annotation.Get;
import io.micronaut.http.annotation.Produces;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

@Tag(name = "ping")
@Controller("/api")
public class PingController {

  @Get("/ping")
  @Produces(MediaType.TEXT_PLAIN)
  @Operation(
      summary = "Connectivity check used to prove frontend/backend wiring",
      operationId = "ping")
  public String ping() {
    return "pong";
  }
}
