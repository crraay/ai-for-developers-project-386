import { setupServer } from 'msw/node';

/**
 * Network boundary for the unit tests: the generated client calls `fetch`, so
 * MSW stands in the same place `HttpTestingController` did before the React
 * migration. Handlers are registered per test; an unhandled request fails the
 * test instead of silently hitting the network.
 */
export const server = setupServer();
