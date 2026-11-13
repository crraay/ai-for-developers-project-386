import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'react-router';
import { useState } from 'react';

import {
  cancelBookingMutation,
  getBookingOptions,
  getBookingQueryKey,
} from '../../api/@tanstack/react-query.gen';
import { errorMessage } from '../../lib/api-errors';
import { formatLocalDateTime, formatLocalTime, localTimeZone } from '../../lib/time';
import { useDocumentTitle } from '../../lib/use-document-title';
import styles from './booking-page.module.scss';

/** UC-4: the secret cancellation link — booking details plus cancel action. */
function BookingPage() {
  useDocumentTitle('Your booking');

  const { token = '' } = useParams<{ token: string }>();
  const queryClient = useQueryClient();
  const timeZone = localTimeZone();

  const bookingQuery = useQuery(getBookingOptions({ path: { token } }));
  const booking = bookingQuery.data ?? null;

  const cancellation = useMutation({
    ...cancelBookingMutation(),
    onSuccess: (updated) => {
      queryClient.setQueryData(getBookingQueryKey({ path: { token } }), updated);
    },
  });

  const error =
    cancellation.error === null ? null : errorMessage(cancellation.error, 'Cancellation failed.');

  /** Invariant #3: cancellation is allowed only before the booking starts. */
  const [now] = useState(() => Date.now());
  const canCancel =
    booking !== null && booking.state === 'active' && new Date(booking.start).getTime() > now;

  if (bookingQuery.isError) {
    return (
      <section className="page">
        <h2>Your booking</h2>
        <p className={styles.error} role="alert">
          Booking not found. Check your cancellation link.
        </p>
        <p>
          <Link to="/book">Back to available times</Link>
        </p>
      </section>
    );
  }

  return (
    <section className="page">
      <h2>Your booking</h2>

      {booking !== null && (
        <>
          <dl className={styles.details}>
            <dt>When</dt>
            <dd>
              {formatLocalDateTime(booking.start)} – {formatLocalTime(booking.end)} ({timeZone})
            </dd>
            <dt>Name</dt>
            <dd>{booking.guestName}</dd>
            <dt>Email</dt>
            <dd>{booking.guestEmail}</dd>
            <dt>Status</dt>
            <dd>{booking.state === 'active' ? 'Confirmed' : 'Cancelled'}</dd>
          </dl>

          {booking.state === 'active' ? (
            <>
              {canCancel && (
                <button
                  className={styles.danger}
                  type="button"
                  disabled={cancellation.isPending}
                  onClick={() => cancellation.mutate({ path: { token } })}
                >
                  Cancel booking
                </button>
              )}
              {error !== null && (
                <p className={styles.error} role="alert">
                  {error}
                </p>
              )}
              <p className={styles.hint}>This page is your secret cancellation link — keep it.</p>
            </>
          ) : (
            <>
              <p className={styles.hint}>This booking is cancelled; the slot is free again.</p>
              <p>
                <Link to="/book">Book another time</Link>
              </p>
            </>
          )}
        </>
      )}
    </section>
  );
}

export default BookingPage;
