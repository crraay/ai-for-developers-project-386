import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HttpResponse, http } from 'msw';
import { describe, expect, it } from 'vitest';

import { renderWithProviders } from '../../test/render';
import { server } from '../../test/server';
import HostBookingTypesPage from './HostBookingTypesPage';

const API = 'http://localhost:8080';

interface Type {
  id: number;
  title: string;
  description: string;
  durationMinutes: number;
  sortOrder: number;
  active: boolean;
}

function asType(overrides: Partial<Type> = {}): Type {
  return {
    id: 1,
    title: 'Quick chat',
    description: 'A short sync-up.',
    durationMinutes: 30,
    sortOrder: 10,
    active: true,
    ...overrides,
  };
}

interface RecordedRequest {
  method: string;
  url: string;
  body: unknown;
}

/**
 * A stateful stand-in for the host booking-types API: writes change the list the
 * next GET returns, so the page's post-save refetch is exercised for real.
 */
function serve(initial: Type[] | { status: number; detail: string }) {
  let list = Array.isArray(initial) ? [...initial] : [];
  const requests: RecordedRequest[] = [];

  server.use(
    http.get(`${API}/api/host/booking-types`, () => {
      if (Array.isArray(initial)) {
        return HttpResponse.json(list);
      }
      return HttpResponse.json(
        {
          type: 'about:blank',
          title: 'Server error',
          status: initial.status,
          detail: initial.detail,
        },
        { status: initial.status },
      );
    }),
    http.post(`${API}/api/host/booking-types`, async ({ request }) => {
      const body = (await request.json()) as Omit<Type, 'id' | 'sortOrder' | 'active'>;
      requests.push({ method: 'POST', url: request.url, body });
      const created = { ...body, id: 99, sortOrder: 100, active: true };
      list = [...list, created];
      return HttpResponse.json(created, { status: 201 });
    }),
    http.put(`${API}/api/host/booking-types/:id`, async ({ request, params }) => {
      const body = (await request.json()) as Omit<Type, 'id'>;
      requests.push({ method: 'PUT', url: request.url, body });
      const updated = { id: Number(params.id), ...body };
      list = list.map((type) => (type.id === updated.id ? updated : type));
      return HttpResponse.json(updated);
    }),
    http.delete(`${API}/api/host/booking-types/:id`, ({ request, params }) => {
      requests.push({ method: 'DELETE', url: request.url, body: null });
      list = list.filter((type) => type.id !== Number(params.id));
      return new HttpResponse(null, { status: 204 });
    }),
  );

  return { requests };
}

describe('HostBookingTypesPage', () => {
  it('lists the loaded booking types', async () => {
    serve([
      asType({ id: 1, title: 'Quick chat', sortOrder: 10 }),
      asType({
        id: 2,
        title: 'Deep dive',
        description: 'Long-form working session.',
        durationMinutes: 60,
        sortOrder: 20,
      }),
    ]);
    renderWithProviders(<HostBookingTypesPage />);

    expect(await screen.findByText('Quick chat')).toBeInTheDocument();
    expect(screen.getByText('Deep dive')).toBeInTheDocument();
    expect(screen.getByText('30 min')).toBeInTheDocument();
    expect(screen.getByText('60 min')).toBeInTheDocument();
  });

  it('opens the editor with a blank draft when creating', async () => {
    const user = userEvent.setup();
    serve([asType({ id: 1 })]);
    renderWithProviders(<HostBookingTypesPage />);
    await screen.findByText('Quick chat');

    await user.click(screen.getByRole('button', { name: 'New booking type' }));

    expect(screen.getByRole('region', { name: 'Booking type editor' })).toBeInTheDocument();
    expect(screen.getByLabelText('Title')).toHaveValue('');
    expect(screen.getByLabelText('Description')).toHaveValue('');
  });

  it('POSTs the new booking type when Create is clicked', async () => {
    const user = userEvent.setup();
    const { requests } = serve([asType({ id: 1 })]);
    renderWithProviders(<HostBookingTypesPage />);
    await screen.findByText('Quick chat');

    await user.click(screen.getByRole('button', { name: 'New booking type' }));
    await user.type(screen.getByLabelText('Title'), 'Coffee');
    await user.click(screen.getByRole('button', { name: 'Create' }));

    await waitFor(() => expect(requests).toHaveLength(1));
    expect(requests[0]).toMatchObject({
      method: 'POST',
      body: { title: 'Coffee', description: '', durationMinutes: 30 },
    });
    expect(await screen.findByText('Coffee')).toBeInTheDocument();
  });

  it('PUTs the edited booking type when Save is clicked', async () => {
    const user = userEvent.setup();
    const { requests } = serve([asType({ id: 1, title: 'Quick chat' })]);
    renderWithProviders(<HostBookingTypesPage />);
    await screen.findByText('Quick chat');

    await user.click(screen.getByRole('button', { name: 'Edit' }));
    const title = screen.getByLabelText('Title');
    await user.clear(title);
    await user.type(title, 'Quick sync');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(requests).toHaveLength(1));
    expect(requests[0]).toMatchObject({
      method: 'PUT',
      body: {
        title: 'Quick sync',
        description: 'A short sync-up.',
        durationMinutes: 30,
        sortOrder: 10,
        active: true,
      },
    });
    expect(requests[0]?.url).toContain('/api/host/booking-types/1');

    await waitFor(() => expect(screen.queryByText('Quick chat')).toBeNull());
    expect(screen.getByText('Quick sync')).toBeInTheDocument();
  });

  it('removes the booking type after the confirmation dialog', async () => {
    const user = userEvent.setup();
    const { requests } = serve([asType({ id: 1 })]);
    renderWithProviders(<HostBookingTypesPage />);
    await screen.findByText('Quick chat');

    await user.click(screen.getByRole('button', { name: 'Delete' }));
    expect(screen.getByText('Delete this booking type?')).toBeInTheDocument();
    expect(screen.getByText(/hidden instead of removed/)).toBeInTheDocument();

    const dialog = screen.getByText('Delete this booking type?').closest('dialog');
    expect(dialog).not.toBeNull();
    // jsdom does not open the dialog, so its content stays outside the
    // accessibility tree and user-event's pointer checks refuse the click.
    fireEvent.click(
      within(dialog as HTMLElement).getByRole('button', { name: 'Delete', hidden: true }),
    );

    await waitFor(() => expect(requests).toHaveLength(1));
    expect(requests[0]).toMatchObject({ method: 'DELETE' });
    expect(await screen.findByText(/No booking types yet/)).toBeInTheDocument();
  });

  it('surfaces the server message when loading fails', async () => {
    serve({ status: 500, detail: 'boom' });
    renderWithProviders(<HostBookingTypesPage />);

    expect(await screen.findByText('boom')).toBeInTheDocument();
  });
});
