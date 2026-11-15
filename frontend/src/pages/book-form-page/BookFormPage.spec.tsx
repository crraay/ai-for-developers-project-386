import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse, http } from 'msw';
import { Route, Routes } from 'react-router';
import { describe, expect, it } from 'vitest';

import { renderWithProviders } from '../../test/render';
import { server } from '../../test/server';
import BookFormPage from './BookFormPage';

const API = 'http://localhost:8080';
const START = '2026-11-03T08:00:00Z';
const TOKEN = 'test-cancellation-token-000000';

const ACTIVE_TYPES = [
  {
    id: 1,
    title: 'Quick chat',
    description: 'A short sync-up.',
    durationMinutes: 30,
    sortOrder: 10,
    active: true,
  },
  {
    id: 2,
    title: 'Deep dive',
    description: 'Long-form working session.',
    durationMinutes: 60,
    sortOrder: 20,
    active: true,
  },
];

/** The real page plus a stand-in for the secret-link route it navigates to. */
function renderPage(route = `/book/${START}?bookingTypeId=1`) {
  return renderWithProviders(
    <Routes>
      <Route path="/book/:start" element={<BookFormPage />} />
      <Route path="/booking/:token" element={<div>{TOKEN}</div>} />
    </Routes>,
    route,
  );
}

describe('BookFormPage', () => {
  it('shows the chosen booking type before booking', async () => {
    server.use(http.get(`${API}/api/booking-types`, () => HttpResponse.json(ACTIVE_TYPES)));
    renderPage();

    expect(await screen.findByText(/Quick chat/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Confirm booking' })).toBeDisabled();
  });

  it('books the slot and navigates to the secret link', async () => {
    const user = userEvent.setup();
    const posted: unknown[] = [];
    server.use(
      http.get(`${API}/api/booking-types`, () => HttpResponse.json(ACTIVE_TYPES)),
      http.post(`${API}/api/bookings`, async ({ request }) => {
        posted.push(await request.json());
        return HttpResponse.json(
          {
            guestName: 'Ada Lovelace',
            guestEmail: 'ada@example.com',
            start: START,
            end: '2026-11-03T08:30:00Z',
            state: 'active',
            cancellationToken: TOKEN,
          },
          { status: 201 },
        );
      }),
    );
    renderPage();
    await screen.findByText(/Quick chat/);

    await user.type(screen.getByLabelText('Your name'), 'Ada Lovelace');
    await user.type(screen.getByLabelText('Your email'), 'ada@example.com');
    await user.click(screen.getByRole('button', { name: 'Confirm booking' }));

    expect(await screen.findByText(TOKEN)).toBeInTheDocument();
    expect(posted).toEqual([
      {
        start: START,
        bookingTypeId: 1,
        guestName: 'Ada Lovelace',
        guestEmail: 'ada@example.com',
      },
    ]);
  });

  it('blocks submission when the link has no booking type', () => {
    // A link without a bookingTypeId (hand-typed or stale) must never fall back
    // to a default type: show the guard instead of the form.
    const { container } = renderPage(`/book/${START}`);

    expect(screen.getByText(/missing a booking type/)).toBeInTheDocument();
    expect(container.querySelector('form')).toBeNull();
    expect(screen.getByRole('link', { name: 'Pick a booking type and time' })).toHaveAttribute(
      'href',
      '/book',
    );
  });

  it('explains an invalid email next to the field', async () => {
    const user = userEvent.setup();
    server.use(http.get(`${API}/api/booking-types`, () => HttpResponse.json(ACTIVE_TYPES)));
    renderPage();
    await screen.findByText(/Quick chat/);

    const email = screen.getByLabelText('Your email');
    await user.type(email, 'not-an-email');
    await user.tab();

    expect(screen.getByText(/Enter a valid email address/)).toBeInTheDocument();
    expect(email).toHaveAttribute('aria-invalid', 'true');
    expect(email).toHaveAttribute('aria-describedby', 'email-error');
  });

  it('shows the problem detail when the slot is gone', async () => {
    const user = userEvent.setup();
    server.use(
      http.get(`${API}/api/booking-types`, () => HttpResponse.json(ACTIVE_TYPES)),
      http.post(`${API}/api/bookings`, () =>
        HttpResponse.json(
          {
            type: 'about:blank',
            title: 'Slot no longer available',
            status: 409,
            detail: 'slot no longer available',
          },
          { status: 409 },
        ),
      ),
    );
    renderPage();
    await screen.findByText(/Quick chat/);

    await user.type(screen.getByLabelText('Your name'), 'Ada Lovelace');
    await user.type(screen.getByLabelText('Your email'), 'ada@example.com');
    await user.click(screen.getByRole('button', { name: 'Confirm booking' }));

    const alert = await screen.findByRole('alert');
    expect(within(alert).getByText(/no longer available/i)).toBeInTheDocument();
  });
});
