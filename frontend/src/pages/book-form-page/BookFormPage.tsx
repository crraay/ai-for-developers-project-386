import { useMutation, useQuery } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import type { ChangeEvent, FocusEvent, FormEvent } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';

import {
  createBookingMutation,
  listActiveBookingTypesOptions,
} from '../../api/@tanstack/react-query.gen';
import { errorMessage } from '../../lib/api-errors';
import { formatLocalDateTime } from '../../lib/time';
import { useDocumentTitle } from '../../lib/use-document-title';
import styles from './book-form-page.module.scss';

/**
 * The id parsed from the query string. null means the link itself is bad (hand-typed,
 * stale from before Issue #28, or just malformed) — never fall back to a default id.
 */
function parseBookingTypeId(raw: string | null): number | null {
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? value : null;
}

/** UC-3: name + email form for a chosen slot; on success opens the secret link. */
function BookFormPage() {
  useDocumentTitle('Book a call');

  const { start = '' } = useParams<{ start: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const bookingTypeId = parseBookingTypeId(searchParams.get('bookingTypeId'));

  const types = useQuery({
    ...listActiveBookingTypesOptions(),
    // A link without a usable id never triggers a lookup: the guard is shown instead.
    enabled: bookingTypeId !== null,
  });
  const chosen = types.data?.find((type) => type.id === bookingTypeId) ?? null;

  const formRef = useRef<HTMLFormElement>(null);
  const [guestName, setGuestName] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [canSubmit, setCanSubmit] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);
  const [emailInvalid, setEmailInvalid] = useState(false);

  const booking = useMutation({
    ...createBookingMutation(),
    onSuccess: (created) => {
      void navigate(`/booking/${created.cancellationToken}`);
    },
  });

  const error =
    booking.error === null
      ? null
      : errorMessage(booking.error, 'Booking failed — is the backend running?');

  function syncValidity(): void {
    setCanSubmit(formRef.current?.checkValidity() ?? false);
  }

  function onEmailChange(event: ChangeEvent<HTMLInputElement>): void {
    setGuestEmail(event.target.value);
    if (emailTouched) {
      setEmailInvalid(!event.target.validity.valid);
    }
    syncValidity();
  }

  function onEmailBlur(event: FocusEvent<HTMLInputElement>): void {
    setEmailTouched(true);
    setEmailInvalid(!event.target.validity.valid);
  }

  function submit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (booking.isPending || bookingTypeId === null || !canSubmit) {
      return;
    }
    if (guestName.trim() === '' || guestEmail.trim() === '') {
      return;
    }
    booking.mutate({
      body: { start, bookingTypeId, guestName, guestEmail },
    });
  }

  if (bookingTypeId === null) {
    return (
      <section className="page">
        <h2>Confirm your booking</h2>
        <p className={styles.error} role="alert">
          This link is missing a booking type — pick one on the booking page to continue.
        </p>
        <p>
          <Link to="/book">Pick a booking type and time</Link>
        </p>
      </section>
    );
  }

  return (
    <section className="page">
      <h2>Confirm your booking</h2>

      {chosen !== null ? (
        <>
          <p className={styles.summary}>
            {formatLocalDateTime(start)} · {chosen.title} ({chosen.durationMinutes} min)
          </p>
          {chosen.description !== '' && <p className={styles.hint}>{chosen.description}</p>}
        </>
      ) : (
        <p className={styles.summary}>{formatLocalDateTime(start)}</p>
      )}

      {error !== null && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}

      <form ref={formRef} onSubmit={submit} noValidate>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>Your name</span>
          <input
            type="text"
            name="guestName"
            value={guestName}
            onChange={(event) => {
              setGuestName(event.target.value);
              syncValidity();
            }}
            autoComplete="name"
            required
          />
        </label>
        {/* The error sits outside the <label> so it is not folded into the
            input's accessible name; aria-describedby still associates it. */}
        <div className={styles.field}>
          <label className={styles.fieldLabel} htmlFor="guest-email">
            Your email
          </label>
          <input
            id="guest-email"
            type="email"
            name="guestEmail"
            value={guestEmail}
            onChange={onEmailChange}
            onBlur={onEmailBlur}
            aria-invalid={emailInvalid}
            aria-describedby={emailInvalid ? 'email-error' : undefined}
            autoComplete="email"
            required
          />
          {emailInvalid && (
            <span id="email-error" className={styles.fieldError}>
              Enter a valid email address, e.g. name@example.com.
            </span>
          )}
        </div>
        <button className={styles.primary} type="submit" disabled={!canSubmit || booking.isPending}>
          Confirm booking
        </button>
      </form>

      <p>
        <Link to="/book">Pick another time</Link>
      </p>
    </section>
  );
}

export default BookFormPage;
