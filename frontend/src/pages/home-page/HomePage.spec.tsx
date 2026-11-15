import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import HomePage from './HomePage';
import { renderWithProviders } from '../../test/render';

describe('HomePage', () => {
  it('presents the service and links into the booking flow', () => {
    renderWithProviders(<HomePage />);

    expect(screen.getByText('Book a call, no account needed')).toBeInTheDocument();
    const cta = screen.getByRole('link', { name: 'Book a call' });
    expect(cta.textContent?.trim()).toBe('Book a call');
    expect(cta.getAttribute('href')).toBe('/book');
  });

  it('explains the booking flow in three steps', () => {
    renderWithProviders(<HomePage />);

    const titles = screen.getAllByRole('heading', { level: 3 }).map((el) => el.textContent?.trim());
    expect(titles).toEqual(['Choose a slot', 'Add your details', 'Keep your link']);
  });
});
