/**
 * Time display helpers. The API speaks UTC instants only; rendering in the
 * guest's browser timezone is a UI responsibility (docs/domain.md).
 */

export function localTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

export function formatLocalTime(isoInstant: string): string {
  return new Date(isoInstant).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function formatLocalDateTime(isoInstant: string): string {
  return new Date(isoInstant).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
}

export function formatInTimeZone(
  isoInstant: string,
  timeZone: string,
  options: Intl.DateTimeFormatOptions = {},
): string {
  return new Intl.DateTimeFormat('en-GB', { timeZone, ...options }).format(new Date(isoInstant));
}

/** 30 min → "30 min"; 60 min → "1 hr". */
export function durationLabel(start: string, end: string): string {
  const minutes = Math.round((Date.parse(end) - Date.parse(start)) / 60_000);
  return minutes >= 60 ? `${minutes / 60} hr` : `${minutes} min`;
}

/**
 * The current calendar date in the given IANA timezone, as a yyyy-mm-dd string.
 * Used for the booking calendar bounds so the window is interpreted in the host's timezone,
 * matching the server's horizon rule (docs/domain.md).
 */
export function dateInTimeZone(timeZone: string, date: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  return parts
    .filter((part) => part.type === 'year' || part.type === 'month' || part.type === 'day')
    .map((part) => part.value)
    .join('-');
}

/**
 * Add calendar days to a yyyy-mm-dd date string that is interpreted in the given IANA timezone.
 */
export function addDaysToDateString(dateString: string, days: number, timeZone: string): string {
  // Slicing instead of destructuring keeps the helper free of index-access
  // assertions: a malformed input yields NaN and an Invalid Date, which the
  // formatter rejects loudly rather than silently shifting the day.
  const year = Number(dateString.slice(0, 4));
  const month = Number(dateString.slice(5, 7));
  const day = Number(dateString.slice(8, 10));
  // Start at noon UTC for the given calendar date, then nudge until the formatted host-local date
  // matches. This keeps the instant safely inside the intended day before adding days.
  const MAX_NUDGE_ITERATIONS = 3;
  let instant = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  for (let i = 0; i < MAX_NUDGE_ITERATIONS; i++) {
    const formatted = dateInTimeZone(timeZone, instant);
    if (formatted === dateString) break;
    const formattedYear = Number(formatted.slice(0, 4));
    const formattedMonth = Number(formatted.slice(5, 7));
    const formattedDay = Number(formatted.slice(8, 10));
    instant = new Date(
      instant.getTime() +
        (Date.UTC(year, month - 1, day) -
          Date.UTC(formattedYear, formattedMonth - 1, formattedDay)),
    );
  }
  instant.setUTCDate(instant.getUTCDate() + days);
  return dateInTimeZone(timeZone, instant);
}

/**
 * The date the booking calendar opens on (UC-2, issue #1): the guest's own today when it lies
 * inside the booking window, otherwise the nearest window edge. The bounds are the host's
 * window (docs/domain.md), so the default can never leave it — a guest whose local day is
 * already over starts on the window's first day, a guest ahead of the host books their own
 * today.
 */
export function defaultBookingDate(minDate: string, maxDate: string, guestToday: string): string {
  if (guestToday < minDate) {
    return minDate;
  }
  if (guestToday > maxDate) {
    return maxDate;
  }
  return guestToday;
}
