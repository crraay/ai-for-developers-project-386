import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import type { ReactElement } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router';

/**
 * Renders with the same providers the app bootstraps, minus the browser
 * router: a fresh QueryClient per test (no cross-test cache) and a memory
 * history so a spec can open any route.
 */
export function renderWithProviders(ui: ReactElement, route = '/'): RenderResult {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });

  return render(ui, {
    wrapper: ({ children }) => (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[route]}>{children}</MemoryRouter>
      </QueryClientProvider>
    ),
  });
}

/** Renders a single page under its real path, as the router would match it. */
export function renderAtRoute(path: string, element: ReactElement, route: string): RenderResult {
  return renderWithProviders(
    <Routes>
      <Route path={path} element={element} />
    </Routes>,
    route,
  );
}
