# Call Calendar — Domain

Invariant rules and entity details. Terminology per `GLOSSARY.md`; product
scope per `docs/product.md`.

## Entities

- **Host settings** (single row): timezone (IANA, e.g. `Europe/Berlin`).
- **Booking type** (host-defined, per `GLOSSARY.md`): title, description,
  duration in minutes (5–240), sort order, visible flag. The guest picks one
  instead of a bare duration; the duration is derived server-side from the
  picked type. Seeded: *Quick chat* (30 min) and *Deep dive* (60 min).
- **Recurring window**: day(s) of week + time-of-day range, expressed as an
  rrule; repeats indefinitely. v1 constraint: an occurrence never crosses
  midnight — its end is its start plus the window length, computed on the
  host-local clock.
- **One-off window**: a concrete date + start/end time.
- **Blackout**: a concrete date or date+time interval.
- **Booking**: guest name, guest email, start, end (stored in UTC), state
  (`active` | `cancelled`), the picked booking type, secret cancellation
  token.

## Availability computation

```
availability = (recurring windows ∪ one-off windows) − blackouts
```

Overlapping windows merge silently; overlap is never an error.

## Slot generation

For the duration `d` of the chosen booking type, a valid slot start is:

- aligned to a 15-minute boundary (:00, :15, :30, :45),
- fully contained within availability: `[start, start + d] ⊆ availability`,
- at least 1 hour in the future,
- before the start of the 15th host-local calendar day, counting today as day 1 (the window ends
  at the end of the 14th calendar day; the last available date is today + 13).

## Invariants

1. **Double-booking**: at most one *active* booking covers any instant.
   Concurrent booking attempts: first commit wins, the other gets
   "slot no longer available".
2. Past slots are never bookable.
3. A booking can be cancelled (by guest or host) at any time **before it
   starts**; afterwards it is frozen history.
4. Cancellation frees the interval immediately.
5. A blackout that overlaps existing active bookings requires an explicit host
   choice: abort the blackout, or save it and cancel the overlapping bookings.
   Never automatic, never silent.
6. Blackouts and cancellations never alter past bookings.
7. A booking has exactly two states: `active` and `cancelled`. No "completed",
   no "no-show".

## Timezones

- All instants are stored in UTC.
- Window times are interpreted in the host's configured timezone.
- The guest UI renders times in the guest's browser-local timezone, clearly
  labeled.

## Constants (v1)

| Constant            | Value                                     |
| ------------------- | ----------------------------------------- |
| Booking horizon     | 14 calendar days **including today** (today is day 1; last date is today + 13), host-local; ends at the start of day 15 (today + 14) |
| Minimum notice      | 1 hour                                    |
| Slot alignment grid | 15 minutes                                |
| Type duration range | 5–240 min (host-defined; seeded 30 / 60)  |

Constants may become host settings later; that is a trivial change by design.

**Seeded availability (v1):** Mon-Fri 09:00-17:00 in the host timezone
`Europe/Berlin` (one recurring window, `02-schedule.xml`). The window start is
the current host-local day; the window boundary is recorded in the constants
table above.

The booking horizon was narrowed from 90 rolling days to 14 calendar days
**including today**, host-local, to match the product decision recorded in the
project spec (see docs/product.md). If today is 1 November, the last available
date is 14 November.
