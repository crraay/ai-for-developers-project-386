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

The host sets their timezone, defines the booking types guests can pick from
(title, description, duration — see `GLOSSARY.md`), and manages availability:
recurring windows (weekly, via rrule), one-off windows, and blackouts.

- When a new blackout overlaps existing active bookings, the host must choose:
  abort the blackout, or save it and cancel the overlapping bookings.

### UC-2: Guest browses available slots

The guest picks a day and a booking type, and sees the available start times,
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

The host opens the host page (`/host`, reached via the top-right **Guest / Host**
toggle in the page header — unauthenticated by design, see below). The page
shows:

- A **"Happening now"** section above the list when a booking is ongoing
  (`start_at <= now < end_at`). The ongoing booking carries no cancel button:
  starting marks it frozen history (invariant #3), so displaying it without a
  cancel affordance is deliberate, not an oversight.
- The **upcoming list** (`start_at > now`), sorted soonest-first, with columns
  for date, start–end timeslot (rendered in the host's configured timezone,
  labelled), booking type, guest name, guest email, state.
- **Filter bubbles** `All` / `Active` / `Cancelled` above the list. Filtering is
  done client-side; the result set is bounded by the 14-day horizon. The
  default is `All`; empty-state copy reflects the active filter ("No active
  bookings.", "No cancelled bookings.", "No upcoming bookings.").
- A loading state, an error message via `errorMessage()` plus a **Retry**
  button on failure.

`GET /api/bookings` returns the result set (bookings with `end_at > now`, both
states, sorted by `start_at` ascending). The response is a host-specific
payload (`HostBookingResponse`: id + guest fields + state) that intentionally
omits the secret cancellation token, which is never sent outside the guest
flows that already know it.

### UC-6: Host cancels a booking

The host cancels an active, not-yet-started booking from the list. Clicking
**Cancel** opens a native `<dialog>` ("Cancel this booking? — slot becomes
available again"). Confirm calls `POST /api/host/bookings/{id}/cancel`; the
row flips to the **cancelled** badge and stays visible under `All` and
`Cancelled`, disappears under `Active`. The slot becomes available again
immediately. The guest is not notified (no notifications in v1).

Semantics mirror the guest-side cancellation: idempotent if the booking is
already cancelled (200), 409 if the booking has started (race against the
invariant).

### UC-7: Host manages booking types

The host manages the booking types the guest picks from, at
`/host/booking-types`: create, edit (title, description, duration, sort order,
visible/hidden), and delete. Hiding a type removes it from the guest picker
without touching past bookings; deleting is permanent for the row itself.
The CRUD surface is `GET/POST /api/host/booking-types` and
`PUT/DELETE /api/host/booking-types/{id}`; the guest sees only the public
`GET /api/booking-types` (visible rows).

## First milestone: walking skeleton

The first spec proves the thinnest end-to-end path: **UC-2 + UC-3 + UC-4 over
seeded data** (one recurring window, one booking type, no blackouts, host
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
