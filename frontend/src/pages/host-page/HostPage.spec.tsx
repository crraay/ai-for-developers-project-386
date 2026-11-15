import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse, http } from 'msw';
import { describe, expect, it } from 'vitest';

import { renderWithProviders } from '../../test/render';
import { server } from '../../test/server';
import HostPage from './HostPage';

const API = 'http://localhost:8080';
const TIMEZONE = 'Europe/Berlin';

function asHostBooking(
  overrides: Partial<{
    id: number;
    guestName: string;
    guestEmail: string;
    start: string;
    end: string;
    state: 'active' | 'cancelled';
    bookingTypeId: number;
  }> = {},
) {
  const start = new Date(Date.now() + 3 * 3_600_000);
  const end = new Date(start.getTime() + 30 * 60_000);
  return {
    id: 1,
    guestName: 'Ada Lovelace',
    guestEmail: 'ada@example.com',
    start: start.toISOString(),
    end: end.toISOString(),
    state: 'active' as const,
    bookingTypeId: 1,
    ...overrides,
  };
}

const TYPES_RESPONSE = [
  { id: 1, title: 'Quick chat', description: '', durationMinutes: 30, sortOrder: 10, active: true },
  { id: 2, title: 'Deep dive', description: '', durationMinutes: 60, sortOrder: 20, active: true },
];

/** Serves the page's three boot queries; `bookings` may be a status+body pair. */
function serve(bookings: unknown[] | { status: number; detail: string }) {
  server.use(
    http.get(`${API}/api/host-settings`, () => HttpResponse.json({ timezone: TIMEZONE })),
    http.get(`${API}/api/host/booking-types`, () => HttpResponse.json(TYPES_RESPONSE)),
    http.get(`${API}/api/bookings`, () => {
      if (Array.isArray(bookings)) {
        return HttpResponse.json(bookings);
      }
      return HttpResponse.json(
        {
          type: 'about:blank',
          title: 'Server error',
          status: bookings.status,
          detail: bookings.detail,
        },
        { status: bookings.status },
      );
    }),
  );
}

describe('HostPage', () => {
  it('renders upcoming bookings with the configured timezone', async () => {
    serve([asHostBooking({ id: 42, guestName: 'Ada Lovelace' })]);
    renderWithProviders(<HostPage />);

    expect(await screen.findByRole('heading', { name: 'Upcoming bookings' })).toBeInTheDocument();
    expect(await screen.findByText('Ada Lovelace')).toBeInTheDocument();
    expect(screen.getByText('ada@example.com')).toBeInTheDocument();
    expect(screen.getAllByText(new RegExp(TIMEZONE)).length).toBeGreaterThan(0);
    expect(screen.getByText('30 min')).toBeInTheDocument();
    expect(screen.getByText('Quick chat')).toBeInTheDocument();
    // The wide table lives in its own scroll region so it cannot push the page
    // beyond the viewport on a phone.
    expect(screen.getByRole('region', { name: 'Upcoming bookings' })).toBeInTheDocument();
    // At least one cancel button per row.
    expect(
      screen.getAllByRole('button', { name: /Cancel Ada Lovelace’s booking/ }).length,
    ).toBeGreaterThan(0);
  });

  it('hides the cancel button on already-cancelled bookings', async () => {
    serve([asHostBooking({ id: 7, state: 'cancelled' })]);
    renderWithProviders(<HostPage />);

    expect(await screen.findByRole('cell', { name: 'Cancelled' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Cancel .* booking/ })).toBeNull();
  });

  it('promotes the only ongoing booking to the Happening now section', async () => {
    const now = Date.now();
    serve([
      asHostBooking({
        id: 9,
        guestName: 'Ongoing Agora',
        start: new Date(now - 15 * 60_000).toISOString(),
        end: new Date(now + 15 * 60_000).toISOString(),
      }),
    ]);
    renderWithProviders(<HostPage />);

    const ongoing = await screen.findByRole('status');
    expect(ongoing).toHaveTextContent('Happening now');
    expect(screen.getByText('Ongoing Agora')).toBeInTheDocument();
    // Ongoing bookings are frozen; the table row shows the booking but no cancel button.
    expect(screen.queryByRole('button', { name: /Cancel .* booking/ })).toBeNull();
  });

  it('filters by Active and Cancelled bubbles', async () => {
    const user = userEvent.setup();
    serve([
      asHostBooking({ id: 1, guestName: 'Active Ada', state: 'active' }),
      asHostBooking({ id: 2, guestName: 'Cancelled Cassin', state: 'cancelled' }),
    ]);
    renderWithProviders(<HostPage />);

    await screen.findByText('Active Ada');
    const filters = screen.getAllByRole('button', { name: /^(All|Active|Cancelled)$/ });
    expect(filters.map((button) => button.textContent?.trim())).toEqual([
      'All',
      'Active',
      'Cancelled',
    ]);

    await user.click(screen.getByRole('button', { name: 'Active' }));
    expect(screen.getByText('Active Ada')).toBeInTheDocument();
    expect(screen.queryByText('Cancelled Cassin')).toBeNull();

    await user.click(screen.getByRole('button', { name: 'Cancelled' }));
    expect(screen.getByText('Cancelled Cassin')).toBeInTheDocument();
    expect(screen.queryByText('Active Ada')).toBeNull();
  });

  it('shows the friendly error and retry button when the list fails', async () => {
    const user = userEvent.setup();
    let failing = true;
    server.use(
      http.get(`${API}/api/host-settings`, () => HttpResponse.json({ timezone: TIMEZONE })),
      http.get(`${API}/api/host/booking-types`, () => HttpResponse.json(TYPES_RESPONSE)),
      http.get(`${API}/api/bookings`, () => {
        if (failing) {
          return HttpResponse.json(
            { type: 'about:blank', title: 'Server error', status: 500, detail: 'boom' },
            { status: 500 },
          );
        }
        return HttpResponse.json([asHostBooking({ guestName: 'Recovered Guest' })]);
      }),
    );
    renderWithProviders(<HostPage />);

    expect(await screen.findByText('boom')).toBeInTheDocument();
    failing = false;
    await user.click(screen.getByRole('button', { name: 'Retry' }));

    expect(await screen.findByText('Recovered Guest')).toBeInTheDocument();
  });
});
