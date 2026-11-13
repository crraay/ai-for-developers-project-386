import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse, http } from 'msw';
import { describe, expect, it } from 'vitest';

import { localTimeZone } from '../../lib/time';
import { renderAtRoute } from '../../test/render';
import { server } from '../../test/server';
import BookingPage from './BookingPage';

const API = 'http://localhost:8080';
const TOKEN = 'test-cancellation-token-000000';
const FUTURE = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

function activeBooking() {
  return {
    guestName: 'Ada Lovelace',
    guestEmail: 'ada@example.com',
    start: FUTURE,
    end: FUTURE,
    state: 'active',
    cancellationToken: TOKEN,
  };
}

function renderPage() {
  return renderAtRoute('/booking/:token', <BookingPage />, `/booking/${TOKEN}`);
}

describe('BookingPage', () => {
  it('shows booking details from the secret link', async () => {
    server.use(http.get(`${API}/api/bookings/${TOKEN}`, () => HttpResponse.json(activeBooking())));
    renderPage();

    expect(await screen.findByText('Ada Lovelace')).toBeInTheDocument();
    expect(screen.getByText('Confirmed')).toBeInTheDocument();
    // The "When" row is rendered in the guest's browser timezone, clearly labeled (docs/domain.md)
    expect(screen.getByText(new RegExp(localTimeZone()))).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel booking' })).toBeInTheDocument();
  });

  it('cancels the booking and frees the slot', async () => {
    const user = userEvent.setup();
    server.use(
      http.get(`${API}/api/bookings/${TOKEN}`, () => HttpResponse.json(activeBooking())),
      http.post(`${API}/api/bookings/${TOKEN}/cancel`, () =>
        HttpResponse.json({ ...activeBooking(), state: 'cancelled' }),
      ),
    );
    renderPage();

    await user.click(await screen.findByRole('button', { name: 'Cancel booking' }));

    expect(await screen.findByText('Cancelled')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Cancel booking' })).toBeNull();
    expect(screen.getByText(/free again/)).toBeInTheDocument();
  });

  it('reports unknown tokens', async () => {
    server.use(
      http.get(`${API}/api/bookings/${TOKEN}`, () =>
        HttpResponse.json(
          { title: 'Booking not found', status: 404, detail: 'booking not found' },
          { status: 404 },
        ),
      ),
    );
    renderPage();

    expect(await screen.findByText(/Booking not found/)).toBeInTheDocument();
  });
});
