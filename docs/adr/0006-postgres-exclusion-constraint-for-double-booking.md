# PostgreSQL exclusion constraint enforces the no-double-booking invariant

"At most one active booking covers any instant" is enforced by the database,
not the application: a GiST exclusion constraint on
`tstzrange(start_at, end_at, '[)') WHERE state = 'active'` makes concurrent
booking attempts safe by construction — first commit wins, and the loser maps
the constraint violation (SQLState 23P01) to 409 "slot no longer available".
A check-then-insert service check would be racy and would only be as
trustworthy as the least careful future code path.

## Considered Options

- **Application-level check-then-insert**: simpler SQL, but racy under true
  concurrency; correctness would depend on transaction-isolation choices
  scattered through service code.
- **Unique index on `start_at`**: wrong granularity — the invariant is about
  overlapping intervals, not identical starts (a 30-minute booking at 09:00
  and one at 09:15 overlap without sharing a start).

## Consequences

- `CREATE EXTENSION btree_gist` is required; both the compose Postgres and the
  Testcontainers Postgres run as superuser, so the extension installs cleanly.
- The booking insert catches `PSQLException` with SQLState `23P01` and
  translates it into the domain error. The pre-insert availability check stays
  for the friendlier rejection paths (past, horizon, misalignment) but is not
  relied on for correctness.

## Amendments

- **2026-11-12 (issue #31)** — two facts the original wording hid, both now
  enforced by tests in `BookingOverlapTest`:
  - The exclusion operator must be `&&`, not `=`: an equality-based exclusion
    only rejects *identical* intervals, so partially overlapping inserts both
    landed while the service pre-check (which cannot see a racing transaction)
    passed them. Changeset `08-booking-overlap-operator` re-adds the constraint
    with `&&` over the same `'[)'` ranges, which keeps back-to-back bookings
    legal.
  - A lost race can surface as **SQLState `40P01`** ("deadlock detected … while
    checking exclusion constraint on … relation booking") rather than `23P01`:
    when both inserts reach the conflict check before either commits, Postgres
    aborts one of them as the victim. The insert treats `40P01` as the same lost
    race and refuses it with the same domain error, so a loser always gets 409
    instead of a 500.
