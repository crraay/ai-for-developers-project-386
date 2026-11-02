package com.callcalendar.service;

import com.callcalendar.domain.HostSettings;
import com.callcalendar.domain.Interval;
import com.callcalendar.domain.RecurringWindow;
import com.callcalendar.repo.HostSettingsRepository;
import com.callcalendar.repo.RecurringWindowRepository;
import jakarta.inject.Singleton;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import net.fortuna.ical4j.model.Recur;

/**
 * Availability = recurring windows − blackouts (blackouts come in a later milestone). Windows are
 * expanded with iCal4j (ADR-0005) and merged silently; overlap is never an error.
 */
@Singleton
public class AvailabilityService {

  /** Safety cap on rrule expansion; the rolling horizon keeps us far below it. */
  private static final int MAX_OCCURRENCES = 500;

  /** How far before the queried range window expansion starts. */
  private static final Duration EXPANSION_LOOKBACK = Duration.ofDays(1);

  private final HostSettingsRepository hostSettingsRepository;
  private final RecurringWindowRepository recurringWindowRepository;

  public AvailabilityService(
      HostSettingsRepository hostSettingsRepository,
      RecurringWindowRepository recurringWindowRepository) {
    this.hostSettingsRepository = hostSettingsRepository;
    this.recurringWindowRepository = recurringWindowRepository;
  }

  public HostSettings hostSettings() {
    return hostSettingsRepository.findSingle();
  }

  public ZoneId hostZone() {
    return ZoneId.of(hostSettings().timezone());
  }

  /**
   * Merged availability covering {@code [from, to)}: every recurring window occurrence overlapping
   * the range, sorted and merged so overlapping or touching windows read as one continuous
   * interval.
   */
  public List<Interval> mergedIntervals(Instant from, Instant to) {
    ZoneId zone = hostZone();
    List<Interval> occurrences = new ArrayList<>();
    for (RecurringWindow window : recurringWindowRepository.findAll()) {
      ZonedDateTime seed = window.dtstartLocal().atZone(zone);
      Duration length = window.length();
      // Start one day early so an occurrence beginning before the range still
      // contributes its tail (windows are same-day by schema, so one day is
      // the widest possible overlap).
      List<ZonedDateTime> starts =
          new Recur<ZonedDateTime>(window.rrule())
              .getDates(
                  seed,
                  from.minus(EXPANSION_LOOKBACK).atZone(zone),
                  to.atZone(zone),
                  MAX_OCCURRENCES);
      for (ZonedDateTime start : starts) {
        Interval interval = new Interval(start.toInstant(), start.plus(length).toInstant());
        if (interval.overlaps(from, to)) {
          occurrences.add(interval);
        }
      }
    }
    return merge(occurrences);
  }

  private static List<Interval> merge(List<Interval> intervals) {
    intervals.sort(Comparator.comparing(Interval::start));
    List<Interval> merged = new ArrayList<>();
    for (Interval interval : intervals) {
      if (merged.isEmpty()) {
        merged.add(interval);
        continue;
      }
      Interval last = merged.get(merged.size() - 1);
      if (!interval.start().isAfter(last.end())) {
        merged.set(
            merged.size() - 1,
            new Interval(
                last.start(), last.end().isAfter(interval.end()) ? last.end() : interval.end()));
      } else {
        merged.add(interval);
      }
    }
    return merged;
  }
}
