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

/** A Date as a yyyy-mm-dd value for date inputs. */
export function toDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function addDays(date: Date, days: number): Date {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}
