# iCal4j for RRULE parsing and expansion

> **Status: Accepted.**

Recurring windows are stored as RFC 5545 RRULE strings (plus a host-local
DTSTART/DTEND), and the backend expands them into concrete UTC instants for
slot generation. We use **iCal4j** (`org.mnode.ical4j:ical4j`, BSD-3) through
its standalone `Recur<ZonedDateTime>` API: bare rule expansion against a
`java.time` seed in the host's IANA zone, with no `.ics` parsing or VTIMEZONE
ceremony (4.x bundles and, if needed, synthesizes timezone definitions
locally; network updates are off by default).

## Considered Options

- **lib-recur** (`org.dmfs:lib-recur`, Apache-2): purpose-built RRULE engine
  with a tiny footprint (~341 KB), but effectively dormant since April 2024,
  an API the author explicitly has not frozen, `java.util.TimeZone`-era types,
  and an open DST-correctness defect (#17).
- **Hand-rolled weekly expansion**: rejected because we deliberately chose
  real RRULE support (the domain model promises it) rather than a constrained
  day-of-week form; a bespoke parser would inherit that promise without the
  standard's edge-case coverage.
- No other maintained pure-RRULE Java libraries exist on Maven Central
  (verified at decision time: "rrule4j" does not exist anywhere).

## Consequences

- Call `Recur.getDates(...)` directly; the component-level
  `RecurrenceSupport.calculateRecurrenceSet()` has an open DST bug
  (ical4j #661) and a synthetic-timezone defect.
- Stored rules carry an explicit `WKST=MO`; without it ical4j falls back to
  the locale default week start (ical4j #716).
- Golden tests cover both DST transitions for the host zone. The DST
  overlap fix (ical4j commit 4301630, Oct 2026) landed after the 4.4.0 tag —
  bump to 4.4.1+ when released.
