import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { Link } from 'react-router';

import {
  cancelBookingByIdMutation,
  getHostSettingsOptions,
  listAllBookingTypesOptions,
  listBookingsOptions,
  listBookingsQueryKey,
} from '../../api/@tanstack/react-query.gen';
import type { HostBookingResponse } from '../../api/types.gen';
import { errorMessage } from '../../lib/api-errors';
import { durationLabel, formatInTimeZone } from '../../lib/time';
import { useDocumentTitle } from '../../lib/use-document-title';
import styles from './host-page.module.scss';

type Filter = 'all' | 'active' | 'cancelled';

function matchesFilter(booking: HostBookingResponse, filter: Filter): boolean {
  switch (filter) {
    case 'active':
      return booking.state === 'active';
    case 'cancelled':
      return booking.state === 'cancelled';
    default:
      return true;
  }
}

/** UC-5 + UC-6: the host's view of upcoming bookings, with cancellation by id. */
function HostPage() {
  useDocumentTitle('Host — Upcoming bookings');

  const queryClient = useQueryClient();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [confirmingId, setConfirmingId] = useState<number | null>(null);

  const settings = useQuery(getHostSettingsOptions());
  const types = useQuery(listAllBookingTypesOptions());
  const bookings = useQuery(listBookingsOptions());

  const cancellation = useMutation({
    ...cancelBookingByIdMutation(),
    onSuccess: (updated) => {
      queryClient.setQueryData<HostBookingResponse[]>(listBookingsQueryKey(), (list) =>
        list?.map((booking) => (booking.id === updated.id ? updated : booking)),
      );
      closeCancelDialog();
    },
  });

  // A single clock snapshot per mount: the ongoing/upcoming split and the
  // cancel affordance must agree with each other, and reading the clock during
  // render is impure (react-hooks/purity).
  const [now] = useState(() => Date.now());
  const zone = settings.data?.timezone ?? 'UTC';
  const list = bookings.data ?? [];
  const typesById = new Map((types.data ?? []).map((type) => [type.id, type]));

  const ongoing =
    list.find((booking) => Date.parse(booking.start) <= now && now < Date.parse(booking.end)) ??
    null;
  const upcoming = list.filter(
    (booking) => Date.parse(booking.start) > now && matchesFilter(booking, filter),
  );
  const confirming = list.find((booking) => booking.id === confirmingId) ?? null;
  const loadError = bookings.isError
    ? errorMessage(bookings.error, 'Could not load bookings.')
    : null;
  const dialogError =
    cancellation.error === null ? null : errorMessage(cancellation.error, 'Cancellation failed.');

  const emptyMessage =
    filter === 'active'
      ? 'No active bookings.'
      : filter === 'cancelled'
        ? 'No cancelled bookings.'
        : 'No upcoming bookings.';

  function refresh(): void {
    void settings.refetch();
    void types.refetch();
    void bookings.refetch();
  }

  function canCancelRow(booking: HostBookingResponse): boolean {
    return booking.state === 'active' && Date.parse(booking.start) > now;
  }

  function formatDate(iso: string): string {
    return formatInTimeZone(iso, zone, {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  function formatTimeRange(start: string, end: string): string {
    const options: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit' };
    return `${formatInTimeZone(start, zone, options)}–${formatInTimeZone(end, zone, options)}`;
  }

  function typeTitle(bookingTypeId: number): string {
    return typesById.get(bookingTypeId)?.title ?? '—';
  }

  function handleDialogClose(): void {
    setConfirmingId(null);
    cancellation.reset();
  }

  function openCancelDialog(booking: HostBookingResponse): void {
    setConfirmingId(booking.id);
    cancellation.reset();
    dialogRef.current?.showModal?.();
  }

  function closeCancelDialog(): void {
    dialogRef.current?.close?.();
    handleDialogClose();
  }

  function confirmCancel(): void {
    if (confirmingId === null) {
      return;
    }
    cancellation.mutate({ path: { id: confirmingId } });
  }

  return (
    <section className="page">
      <h2>Upcoming bookings</h2>
      <p>
        <Link to="/host/booking-types">Manage booking types</Link>
      </p>

      {bookings.isPending ? (
        <p className={styles.hint}>Loading…</p>
      ) : loadError !== null ? (
        <>
          <p className={styles.error} role="alert">
            {loadError}
          </p>
          <button type="button" onClick={refresh}>
            Retry
          </button>
        </>
      ) : (
        <>
          {ongoing !== null && (
            <div className={styles.ongoing} role="status">
              <p className={styles.ongoingLabel}>Happening now</p>
              <p>
                <strong>{ongoing.guestName}</strong> ({ongoing.guestEmail})<br />
                {typeTitle(ongoing.bookingTypeId)} · {formatDate(ongoing.start)},{' '}
                {formatTimeRange(ongoing.start, ongoing.end)} (
                {durationLabel(ongoing.start, ongoing.end)})
              </p>
              <p className={styles.zone}>Times shown in {zone}.</p>
            </div>
          )}

          <div className={styles.filters} role="toolbar" aria-label="Filter bookings">
            <button
              type="button"
              className={filter === 'all' ? styles.active : undefined}
              aria-pressed={filter === 'all'}
              onClick={() => setFilter('all')}
            >
              All
            </button>
            <button
              type="button"
              className={filter === 'active' ? styles.active : undefined}
              aria-pressed={filter === 'active'}
              onClick={() => setFilter('active')}
            >
              Active
            </button>
            <button
              type="button"
              className={filter === 'cancelled' ? styles.active : undefined}
              aria-pressed={filter === 'cancelled'}
              onClick={() => setFilter('cancelled')}
            >
              Cancelled
            </button>
            <span className={styles.zone}>{zone}</span>
          </div>

          {upcoming.length === 0 ? (
            <p className={styles.hint}>{emptyMessage}</p>
          ) : (
            // Wide table: keep it scrollable on its own instead of overflowing the
            // page on phones. tabindex makes the scroll region keyboard-reachable.
            <div
              className={styles.tableScroll}
              role="region"
              aria-label="Upcoming bookings"
              tabIndex={0}
            >
              <table className={styles.bookings}>
                <thead>
                  <tr>
                    <th scope="col">Date</th>
                    <th scope="col">Time</th>
                    <th scope="col">Duration</th>
                    <th scope="col">Type</th>
                    <th scope="col">Name</th>
                    <th scope="col">Email</th>
                    <th scope="col">Status</th>
                    <th scope="col">
                      <span className={styles.visuallyHidden}>Action</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {upcoming.map((booking) => (
                    <tr
                      key={booking.id}
                      className={booking.state === 'cancelled' ? styles.cancelled : undefined}
                    >
                      <td>{formatDate(booking.start)}</td>
                      <td>{formatTimeRange(booking.start, booking.end)}</td>
                      <td>{durationLabel(booking.start, booking.end)}</td>
                      <td>{typeTitle(booking.bookingTypeId)}</td>
                      <td>{booking.guestName}</td>
                      <td>{booking.guestEmail}</td>
                      <td>{booking.state === 'active' ? 'Confirmed' : 'Cancelled'}</td>
                      <td>
                        {canCancelRow(booking) && (
                          <button
                            type="button"
                            className={styles.danger}
                            aria-label={`Cancel ${booking.guestName}’s booking`}
                            onClick={() => openCancelDialog(booking)}
                          >
                            Cancel
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      <dialog ref={dialogRef} className={styles.cancelDialog} onClose={handleDialogClose}>
        {confirming !== null && (
          <form
            method="dialog"
            className={styles.dialogBody}
            onSubmit={(event) => event.preventDefault()}
          >
            <h3>Cancel this booking?</h3>
            <p>
              <strong>{confirming.guestName}</strong> ({confirming.guestEmail})<br />
              {typeTitle(confirming.bookingTypeId)} · {formatDate(confirming.start)},{' '}
              {formatTimeRange(confirming.start, confirming.end)} (
              {durationLabel(confirming.start, confirming.end)})
            </p>
            <p className={styles.hint}>The slot becomes available again.</p>
            {dialogError !== null && (
              <p className={styles.error} role="alert">
                {dialogError}
              </p>
            )}
            <div className={styles.dialogActions}>
              <button
                type="button"
                className={styles.danger}
                disabled={cancellation.isPending}
                onClick={confirmCancel}
              >
                Yes, cancel booking
              </button>
              <button type="button" disabled={cancellation.isPending} onClick={closeCancelDialog}>
                Keep it
              </button>
            </div>
          </form>
        )}
      </dialog>
    </section>
  );
}

export default HostPage;
