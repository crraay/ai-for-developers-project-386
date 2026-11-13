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
 * Regression: browse offers every start on the last day of the inclusive 14-calendar-day window,
 * not just those before a rolling 14*24h instant. docs/domain.md bounds the start to "before the
 * start of the 15th host-local calendar day" (today is day 1). Runs on a fixed clock so the horizon
 * deterministically intersects the seeded 09:00-17:00 window.
 */
@MicronautTest(environments = "fixed-clock")
class SlotServiceHorizonTest {

  private static final ZoneId BERLIN = ZoneId.of("Europe/Berlin");

  @Inject SlotService slotService;

  @Test
  void horizonDayOffersAllSlotsBeforeEndOfDay() {
    List<Instant> starts = slotService.slotsFor(LocalDate.of(2026, 10, 29), 1L /* Quick chat */);

    // 2026-10-16T13:10Z is 15:10 in Berlin (CEST). The inclusive 14-calendar-day window ends at the
    // start of 2026-10-30 Berlin (the last bookable date is 2026-10-29), which is 2026-10-29T23:00Z
    // (CET, UTC+1 after the Oct 25 DST change). The seeded window on Thursday 29 Oct is
    // 09:00-17:00 CET = 08:00Z-16:00Z.
    assertEquals(Instant.parse("2026-10-29T08:00:00Z"), starts.get(0));
    // 16:30 Berlin = 15:30Z is the last 30-minute start that still fits inside the window.
    assertEquals(Instant.parse("2026-10-29T15:30:00Z"), starts.get(starts.size() - 1));
    assertEquals(LocalDate.of(2026, 10, 29), starts.get(0).atZone(BERLIN).toLocalDate());
  }

  @Test
  void dayAfterHorizonOffersNoSlots() {
    // 2026-10-30 Berlin is the first day beyond the inclusive 14-calendar-day window.
    assertEquals(List.of(), slotService.slotsFor(LocalDate.of(2026, 10, 30), 1L));
  }
}
