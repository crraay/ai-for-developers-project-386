package com.callcalendar;

import static org.junit.jupiter.api.Assertions.assertEquals;

import com.callcalendar.domain.Interval;
import com.callcalendar.service.AvailabilityService;
import io.micronaut.test.extensions.junit5.annotation.MicronautTest;
import jakarta.inject.Inject;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import org.junit.jupiter.api.Test;

/**
 * Golden tests for rrule expansion across both DST transitions of the seeded host zone (ADR-0005).
 * Europe/Berlin springs forward on 2027-03-28 and falls back on 2027-10-31 (both Sundays); the
 * seeded window is Mon-Fri, so the first affected occurrences are the Mondays after.
 */
@MicronautTest
class AvailabilityServiceTest {

  private static final ZoneId BERLIN = ZoneId.of("Europe/Berlin");

  @Inject AvailabilityService availabilityService;

  @Test
  void expansionIsWallClockCorrectAcrossSpringForward() {
    List<Interval> merged = intervalsOn(LocalDate.of(2027, 3, 29));
    assertEquals(1, merged.size());
    // 09:00-17:00 Berlin is UTC+2 (CEST) on that date
    assertEquals(Instant.parse("2027-03-29T07:00:00Z"), merged.get(0).start());
    assertEquals(Instant.parse("2027-03-29T15:00:00Z"), merged.get(0).end());
  }

  @Test
  void expansionIsWallClockCorrectAcrossFallBack() {
    List<Interval> merged = intervalsOn(LocalDate.of(2027, 11, 1));
    assertEquals(1, merged.size());
    // 09:00-17:00 Berlin is UTC+1 (CET) on that date
    assertEquals(Instant.parse("2027-11-01T08:00:00Z"), merged.get(0).start());
    assertEquals(Instant.parse("2027-11-01T16:00:00Z"), merged.get(0).end());
  }

  private List<Interval> intervalsOn(LocalDate date) {
    Instant from = date.atStartOfDay(BERLIN).toInstant();
    return availabilityService.mergedIntervals(
        from, date.plusDays(1).atStartOfDay(BERLIN).toInstant());
  }
}
