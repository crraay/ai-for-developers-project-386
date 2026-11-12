# Smoke: browse slots, book one, and cancel it again through the public API
# (UC-2 + UC-3 + UC-4 against the seeded compose stack).
$ErrorActionPreference = 'Stop'

$baseUrl = if ($env:SMOKE_BASE_URL) { $env:SMOKE_BASE_URL } else { 'http://localhost:8080' }

# Seeded availability is Mon-Fri, so walk up to nine days ahead to find a day
# with slots regardless of when the smoke runs.
$slot = $null
$targetDate = $null
foreach ($offset in 2..9) {
  $targetDate = (Get-Date).ToUniversalTime().AddDays($offset).ToString('yyyy-MM-dd')
  # bookingTypeId 1 is the seeded 30-minute "Quick chat" type (see README).
  $slots = Invoke-RestMethod -Uri "$baseUrl/api/slots?date=$targetDate&bookingTypeId=1"
  if ($slots.Count -gt 0) {
    $slot = $slots[0]
    break
  }
}

if (-not $slot) {
  throw "smoke-booking: no slots found in the next 9 days"
}

$body = @{
  start           = $slot
  bookingTypeId   = 1
  guestName       = 'Smoke Test'
  guestEmail      = 'smoke@example.com'
} | ConvertTo-Json
$booking = Invoke-RestMethod -Method Post -Uri "$baseUrl/api/bookings" -ContentType 'application/json' -Body $body

# -Body/-ContentType on purpose: bare POST in Windows PowerShell defaults to
# application/x-www-form-urlencoded, which the API rejects with 415.
$cancelled = Invoke-RestMethod -Method Post -Uri "$baseUrl/api/bookings/$($booking.cancellationToken)/cancel" -ContentType 'application/json' -Body '{}'
if ($cancelled.state -ne 'cancelled') {
  throw "smoke-booking: booking was not cancelled (state=$($cancelled.state))"
}

Write-Output "smoke-booking: book + cancel ok (date=$targetDate slot=$slot)"
