import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router';

import {
  getHostSettingsOptions,
  getSlotsOptions,
  listActiveBookingTypesOptions,
} from '../../api/@tanstack/react-query.gen';
import {
  addDaysToDateString,
  dateInTimeZone,
  defaultBookingDate,
  formatLocalTime,
  localTimeZone,
} from '../../lib/time';
import { useDocumentTitle } from '../../lib/use-document-title';
import styles from './book-page.module.scss';

/** UC-2: pick a day and booking type, browse available start times. */
function BookPage() {
  useDocumentTitle('Available times');

  const timeZone = localTimeZone();
  const settings = useQuery(getHostSettingsOptions());
  const types = useQuery(listActiveBookingTypesOptions());

  const hostSettings = settings.data;
  const minDate = hostSettings === undefined ? null : dateInTimeZone(hostSettings.timezone);
  // bookingHorizonDays counts today, so the last selectable date is today + (days - 1).
  const maxDate =
    hostSettings === undefined || minDate === null
      ? null
      : addDaysToDateString(minDate, hostSettings.bookingHorizonDays - 1, hostSettings.timezone);

  // Issue #1: the bounds stay the host's 14-day window, but the day the guest books is
  // their own — open on their today when it lies inside the window.
  const [pickedDate, setPickedDate] = useState<string | null>(null);
  const date =
    pickedDate ??
    (minDate !== null && maxDate !== null
      ? defaultBookingDate(minDate, maxDate, dateInTimeZone(timeZone))
      : '');

  const [pickedTypeId, setPickedTypeId] = useState<number | null>(null);
  const bookingTypeId = pickedTypeId ?? types.data?.[0]?.id ?? null;

  const slots = useQuery({
    // The server must read the picked date in the guest's own calendar (UC-2, issue #1).
    ...getSlotsOptions({
      query: { date, bookingTypeId: bookingTypeId ?? 0, timeZone },
    }),
    enabled: date !== '' && bookingTypeId !== null,
  });

  const settingsError =
    settings.isError || types.isError ? 'Could not load booking settings.' : null;
  const error = settingsError ?? (slots.isError ? 'Could not load slots.' : null);
  const slotStarts = slots.data ?? [];

  return (
    <section className="page">
      <h2>Pick a time</h2>
      <p className={styles.hint}>Times shown in {timeZone}.</p>

      <div className={styles.controls}>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>Day</span>
          <input
            type="date"
            value={date}
            min={minDate ?? undefined}
            max={maxDate ?? undefined}
            onChange={(event) => setPickedDate(event.target.value)}
          />
        </label>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>Booking type</span>
          <select
            value={bookingTypeId ?? ''}
            onChange={(event) => setPickedTypeId(Number(event.target.value))}
          >
            {(types.data ?? []).map((option) => (
              <option key={option.id} value={option.id}>
                {option.title} ({option.durationMinutes} min) — {option.description}
              </option>
            ))}
          </select>
        </label>
      </div>

      {error !== null && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}

      {slotStarts.length > 0 ? (
        <ul className={styles.slots}>
          {slotStarts.map((slot) => (
            <li key={slot}>
              <Link className={styles.slotLink} to={`/book/${slot}?bookingTypeId=${bookingTypeId}`}>
                {formatLocalTime(slot)}
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        error === null && <p className={styles.hint}>No available slots on this day.</p>
      )}
    </section>
  );
}

export default BookPage;
