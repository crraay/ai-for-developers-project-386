# Call Calendar

A booking calendar service: a host publishes availability, guests book call slots.

## Language

**Host**:
The single owner of the calendar who defines when guests can book calls.
_Avoid_: owner, admin, user

**Guest**:
A person who books a call with the host through the public booking page.
_Avoid_: visitor, invitee, customer, user

**Booking**:
A guest's reservation of a specific time interval with the host.
_Avoid_: appointment, meeting, event, reservation

**Ongoing booking**:
A booking whose interval has started but not yet ended. Always active and frozen: it can no longer be cancelled.
_Avoid_: in progress, live booking, current booking

**Availability**:
The set of time intervals when the host can be booked.
_Avoid_: schedule, working hours

**Recurring window**:
A weekly repeating period of availability (e.g. Mondays 09:00–17:00) that repeats indefinitely.
_Avoid_: shift, regular hours

**Slot**:
A concrete time interval within availability that a guest can book. Its duration comes from the booking type the guest chose; a slot aligns to the 15-minute grid and fits fully inside availability.
_Avoid_: time slot, opening, vacancy

**Booking type**:
A host-defined **shape** of booking — a title, a description and a duration — that the guest picks instead of a bare duration. One active row per offering; the duration is derived server-side from the chosen type.
_Avoid_: meeting type, appointment type, event type

**Booking window**:
The 14 calendar days a guest can book, starting with today in the host's timezone. Today is day 1, so the last available date is today + 13; today + 14 is the first day beyond the window.
_Avoid_: horizon, booking range, lookahead

**Blackout**:
A date or interval when the host is unavailable; suppresses availability that recurring windows would otherwise produce.
_Avoid_: exception, day off, blocked time

**One-off window**:
A non-repeating period of availability on a specific date, in addition to recurring windows.
_Avoid_: ad-hoc slot, extra availability
