package com.callcalendar;

import static org.junit.jupiter.api.Assertions.assertEquals;

import com.callcalendar.service.SlotService;
import io.micronaut.test.extensions.junit5.annotation.MicronautTest;
import jakarta.inject.Inject;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import org.junit.jupiter.api.Test;

/**
 * Regression: browse only offered starts whose whole slot fit inside the 14-day horizon, hiding the
 * last starts of the horizon day although BookingService accepts them (docs/domain.md bounds the
 * start: "at most 14 days in the future"). Runs on a fixed clock so the horizon deterministically
 * cuts the seeded 09:00-17:00 window.
 */
@MicronautTest(environments = "fixed-clock")
class SlotServiceHorizonTest {

  private static final ZoneId BERLIN = ZoneId.of("Europe/Berlin");

  @Inject SlotService slotService;

  @Test
  void horizonDayOffersStartsUpToTheHorizonInstant() {
    List<Instant> starts = slotService.slotsFor(LocalDate.of(2026, 10, 30), 30);

    // Window opens 09:00 Berlin = 08:00Z (CET, UTC+1 after the Oct 25 DST change)
    // on that Friday.
    assertEquals(Instant.parse("2026-10-30T08:00:00Z"), starts.get(0));
    // 14:00 Berlin = 13:00Z is inside the window and before the horizon (13:10Z);
    // the old start+duration <= horizon bound stopped at 13:30 Berlin.
    assertEquals(Instant.parse("2026-10-30T13:00:00Z"), starts.get(starts.size() - 1));
    assertEquals(LocalDate.of(2026, 10, 30), starts.get(0).atZone(BERLIN).toLocalDate());
  }
}
