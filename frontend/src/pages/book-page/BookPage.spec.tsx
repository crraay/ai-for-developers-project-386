import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse, http } from 'msw';
import { describe, expect, it } from 'vitest';

import {
  addDaysToDateString,
  dateInTimeZone,
  defaultBookingDate,
  formatLocalTime,
  localTimeZone,
} from '../../lib/time';
import { renderWithProviders } from '../../test/render';
import { server } from '../../test/server';
import BookPage from './BookPage';

const API = 'http://localhost:8080';

const hostSettings = {
  timezone: 'Europe/Berlin',
  bookingHorizonDays: 14,
};

const types = [
  {
    id: 1,
    title: 'Quick chat',
    description: '',
    durationMinutes: 30,
    sortOrder: 10,
    active: true,
  },
  {
    id: 2,
    title: 'Deep dive',
    description: '',
    durationMinutes: 60,
    sortOrder: 20,
    active: true,
  },
];

const SLOTS = ['2026-11-03T08:00:00Z', '2026-11-03T08:15:00Z'];

/** Every slots query the page sent, in order. */
let slotQueries: URLSearchParams[] = [];

/**
 * Serves the page's two boot queries plus slots. `slotsAfterFirst` models a day
 * change: only the first slots call returns data.
 */
function serve(
  options: { slots?: string[]; slotsAfterFirst?: string[]; slotsStatus?: number } = {},
) {
  slotQueries = [];
  const firstSlots = options.slots ?? [];
  const laterSlots = options.slotsAfterFirst ?? firstSlots;
  let slotCalls = 0;

  server.use(
    http.get(`${API}/api/host-settings`, () => HttpResponse.json(hostSettings)),
    http.get(`${API}/api/booking-types`, () => HttpResponse.json(types)),
    http.get(`${API}/api/slots`, ({ request }) => {
      slotQueries.push(new URL(request.url).searchParams);
      if (options.slotsStatus !== undefined) {
        return new HttpResponse('boom', { status: options.slotsStatus });
      }
      const body = slotCalls === 0 ? firstSlots : laterSlots;
      slotCalls += 1;
      return HttpResponse.json(body);
    }),
  );
}

describe('BookPage', () => {
  it('lists slots labeled in the browser timezone', async () => {
    serve({ slots: SLOTS });
    renderWithProviders(<BookPage />);

    const links = await screen.findAllByRole('link');
    expect(links).toHaveLength(2);
    expect(screen.getByText(formatLocalTime(SLOTS[0] as string))).toBeInTheDocument();
    expect(screen.getByText(`Times shown in ${localTimeZone()}.`)).toBeInTheDocument();
  });

  it('reloads slots when the day changes', async () => {
    const user = userEvent.setup();
    serve({ slots: SLOTS, slotsAfterFirst: [] });
    renderWithProviders(<BookPage />);
    await screen.findAllByRole('link');

    const day = screen.getByLabelText('Day');
    await user.clear(day);
    await user.type(day, '2026-11-04');

    await waitFor(() =>
      expect(slotQueries.some((query) => query.get('date') === '2026-11-04')).toBe(true),
    );
    expect(await screen.findByText('No available slots on this day.')).toBeInTheDocument();
    expect(screen.queryAllByRole('link')).toHaveLength(0);
  });

  it('shows an error when slots cannot be loaded', async () => {
    serve({ slotsStatus: 500 });
    renderWithProviders(<BookPage />);

    expect(await screen.findByText('Could not load slots.')).toBeInTheDocument();
  });

  it('sets the calendar min and max to today and today + bookingHorizonDays - 1 in the host timezone', async () => {
    serve();
    renderWithProviders(<BookPage />);

    const expectedMin = dateInTimeZone(hostSettings.timezone);
    const expectedMax = addDaysToDateString(
      expectedMin,
      hostSettings.bookingHorizonDays - 1,
      hostSettings.timezone,
    );

    const day = screen.getByLabelText('Day');
    await waitFor(() => expect(day).toHaveAttribute('min', expectedMin));
    expect(day).toHaveAttribute('max', expectedMax);
  });

  it('asks the server to resolve the picked day in the browser timezone (issue #1)', async () => {
    serve();
    renderWithProviders(<BookPage />);

    await waitFor(() => expect(slotQueries.length).toBeGreaterThan(0));
    expect(slotQueries[0]?.get('timeZone')).toBe(localTimeZone());
  });

  it('opens on the guest today when it lies inside the window, else on the window start', () => {
    // The window is host-local; the guest's today may lead it (guest ahead), match it, or lag it
    // (guest behind, whose today is already over from the host's point of view).
    expect(defaultBookingDate('2026-11-13', '2026-11-26', '2026-11-14')).toBe('2026-11-14');
    expect(defaultBookingDate('2026-11-13', '2026-11-26', '2026-11-13')).toBe('2026-11-13');
    expect(defaultBookingDate('2026-11-13', '2026-11-26', '2026-11-12')).toBe('2026-11-13');
    expect(defaultBookingDate('2026-11-13', '2026-11-26', '2026-11-27')).toBe('2026-11-26');
  });
});
