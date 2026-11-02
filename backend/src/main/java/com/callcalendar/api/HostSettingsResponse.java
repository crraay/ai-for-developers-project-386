package com.callcalendar.api;

import io.micronaut.serde.annotation.Serdeable;
import java.util.List;

/** Public host settings the guest UI needs: timezone label + allowed durations. */
@Serdeable
public record HostSettingsResponse(String timezone, List<Integer> allowedDurations) {}
