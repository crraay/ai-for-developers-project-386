package com.callcalendar;

import io.micronaut.runtime.Micronaut;
import io.swagger.v3.oas.annotations.OpenAPIDefinition;
import io.swagger.v3.oas.annotations.info.Info;
import io.swagger.v3.oas.annotations.servers.Server;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.slf4j.bridge.SLF4JBridgeHandler;

@OpenAPIDefinition(
    info =
        @Info(
            title = "call-calendar",
            version = "0.1",
            description =
                "Booking calendar API: hosts publish availability, guests book call slots."),
    tags = {
      @Tag(name = "ping", description = "Connectivity check"),
      @Tag(name = "slots", description = "Browsing available slots"),
      @Tag(name = "booking", description = "Booking and cancelling slots"),
      @Tag(name = "booking-types", description = "Host-defined booking types the guest picks"),
      @Tag(name = "host-settings", description = "Public host settings")
    },
    servers = {@Server(url = "/")})
public class Application {

  public static void main(String[] args) {
    SLF4JBridgeHandler.removeHandlersForRootLogger();
    SLF4JBridgeHandler.install();
    Micronaut.run(Application.class, args);
  }
}
