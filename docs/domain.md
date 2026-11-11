# Call Calendar — Domain

Invariant rules and entity details. Terminology per `GLOSSARY.md`; product
scope per `docs/product.md`.

## Entities

- **Host settings** (single row): timezone (IANA, e.g. `Europe/Berlin`),
  allowed durations (a subset of 15 / 30 / 60 minutes).
- **Recurring window**: day(s) of week + time-of-day range, expressed as an
  rrule; repeats indefinitely. v1 constraint: an occurrence never crosses
  midnight — its end is its start plus the window length, computed on the
  host-local clock.
- **One-off window**: a concrete date + start/end time.
- **Blackout**: a concrete date or date+time interval.
- **Booking**: guest name, guest email, start, end (stored in UTC), state
  (`active` | `cancelled`), secret cancellation token.

## Availability computation

```
availability = (recurring windows ∪ one-off windows) − blackouts
```

Overlapping windows merge silently; overlap is never an error.

## Slot generation

For a chosen duration `d` (from the host's allowed set), a valid slot start is:

- aligned to a 15-minute boundary (:00, :15, :30, :45),
- fully contained within availability: `[start, start + d] ⊆ availability`,
- at least 1 hour in the future,
- at most 14 days in the future.

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

| Constant            | Value            |
| ------------------- | ---------------- |
| Booking horizon     | 14 days, rolling |
| Minimum notice      | 1 hour           |
| Slot alignment grid | 15 minutes       |
| Duration options    | 15 / 30 / 60 min |

Constants may become host settings later; that is a trivial change by design.

The booking horizon was widened from 90 days to 14 days to match the product
decision recorded in the project spec (see docs/product.md).
