# Call Calendar — Product

## Vision

A Calendly-style booking calendar service: the host publishes when they're
available for calls, guests book a slot through a public page. Single host, no
accounts, no emails, no friction.

## Actors

- **Host** — the single owner of the calendar; defines availability and manages
  bookings. (See `GLOSSARY.md`.)
- **Guest** — anyone with the link; books and cancels calls, no account needed.

The app has an unauthenticated **host mode / guest mode** UI toggle. This is a
deliberate, documented v1 risk (the service runs locally; it is a learning
project).

## Use cases

### UC-1: Host configures availability

The host sets their timezone, picks allowed durations (subset of 15/30/60 min),
and manages availability: recurring windows (weekly, via rrule), one-off
windows, and blackouts.

- When a new blackout overlaps existing active bookings, the host must choose:
  abort the blackout, or save it and cancel the overlapping bookings.

### UC-2: Guest browses available slots

The guest picks a day and a duration, and sees the available start times,
rendered in their own browser timezone, clearly labeled.

### UC-3: Guest books a slot

The guest picks a start time, enters name + email, and gets a confirmation
screen showing the booking details and a unique secret cancellation link.

- If someone else booked the same slot concurrently, the guest sees
  "slot no longer available".

### UC-4: Guest cancels a booking

The guest opens the secret link from their confirmation and cancels. The slot
becomes available again immediately.

### UC-5: Host views upcoming bookings

The host sees a list of bookings: guest name, guest email, start/end, state
(active / cancelled).

### UC-6: Host cancels a booking

The host cancels an active booking from the list. The slot becomes available
again immediately. The guest is not notified (no notifications in v1).

## First milestone: walking skeleton

The first spec proves the thinnest end-to-end path: **UC-2 + UC-3 + UC-4 over
seeded data** (one recurring window, one allowed duration, no blackouts, host
timezone from config), persisted in PostgreSQL, runnable via
`docker compose up`. It proves stack wiring, slot generation, the
double-booking invariant, and cancellation — before any host UI exists.

## Out of scope for v1

- Multi-host / multi-tenancy
- Authentication of any kind
- Sending email, or any notification
- Rescheduling (cancel + book again instead)
- Payments
- Sync with external calendars (Google/Outlook)
- Buffers between bookings
- Group bookings (multiple guests per slot)
- Booking approval flow
- Meeting/call link
- Public deployment (local + CI is the bar)
