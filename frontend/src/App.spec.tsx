import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import App from './App';
import { renderWithProviders } from './test/render';

describe('App', () => {
  it('should create the app', () => {
    const { container } = renderWithProviders(<App />);

    expect(container).toBeTruthy();
  });

  it('should render the title and the routed page', () => {
    renderWithProviders(<App />);

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Call Calendar');
    // The outlet equivalent: the landing route is mounted inside the shell.
    expect(
      screen.getByRole('heading', { name: 'Book a call, no account needed' }),
    ).toBeInTheDocument();
  });

  it('shows the guest/host mode switch with the guest segment active at the landing route', () => {
    renderWithProviders(<App />);

    const links = screen.getAllByRole('link', { name: /^(Guest|Host)$/ });
    expect(links.map((link) => link.textContent?.trim())).toEqual(['Guest', 'Host']);
    expect(links[0]?.getAttribute('href')).toBe('/');
    expect(links[1]?.getAttribute('href')).toBe('/host');
    // Class names are environment-specific (CSS modules); the active segment is
    // asserted through the accessible state instead.
    expect(links[0]?.getAttribute('aria-current')).toBe('page');
    expect(links[1]?.getAttribute('aria-current')).toBeNull();
  });
});
