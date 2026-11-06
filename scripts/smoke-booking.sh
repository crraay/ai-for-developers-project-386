#!/usr/bin/env bash
# Smoke: browse slots, book one, and cancel it again through the public API
# (UC-2 + UC-3 + UC-4 against the seeded compose stack).
set -euo pipefail

base_url="${SMOKE_BASE_URL:-http://localhost:8080}"

# Seeded availability is Mon-Fri, so walk up to nine days ahead to find a day
# with slots regardless of when the smoke runs. The `|| true` on the slot
# extraction swallows the harmless case where the day's slots response is `[]`
# (weekends, fully-booked days): `grep` returns 1 on no match, and without
# that OR-clause `set -euo pipefail` would silently abort the whole script
# before the loop could move on to the next date.
slot=""
target_date=""
for offset in $(seq 2 9); do
  target_date="$(date -u -d "+${offset} days" +%Y-%m-%d)"
  slots="$(curl -fsS "${base_url}/api/slots?date=${target_date}&durationMinutes=30")"
  slot="$(printf '%s' "$slots" | grep -o '"[^"]*"' | head -n 1 | tr -d '"' || true)"
  if [ -n "${slot}" ]; then
    break
  fi
done

if [ -z "${slot}" ]; then
  echo "smoke-booking: no slots found in the next 9 days" >&2
  exit 1
fi

booking="$(curl -fsS -X POST "${base_url}/api/bookings" \
  -H 'Content-Type: application/json' \
  -d "{\"start\":\"${slot}\",\"durationMinutes\":30,\"guestName\":\"Smoke Test\",\"guestEmail\":\"smoke@example.com\"}")"
token="$(printf '%s' "${booking}" | grep -o '"cancellationToken":"[^"]*"' | sed 's/^"cancellationToken":"//; s/"$//')"

if [ -z "${token}" ]; then
  echo "smoke-booking: no cancellation token in response: ${booking}" >&2
  exit 1
fi

cancelled="$(curl -fsS -X POST "${base_url}/api/bookings/${token}/cancel")"
if ! printf '%s' "${cancelled}" | grep -q '"state":"cancelled"'; then
  echo "smoke-booking: booking was not cancelled: ${cancelled}" >&2
  exit 1
fi

echo "smoke-booking: book + cancel ok (date=${target_date} slot=${slot})"
