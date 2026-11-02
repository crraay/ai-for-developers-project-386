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
