import '@testing-library/jest-dom/vitest';

import { cleanup, configure } from '@testing-library/react';
import { afterEach, beforeEach } from 'vitest';

import { client } from './src/api/client.gen';
import { server } from './src/test/server';

// The first test in each file pays the TypeScript transform cost, which can
// exceed the 1 s default and make `findBy*` queries flake on a cold worker.
configure({ asyncUtilTimeout: 5_000 });

// Mirrors the URL `environment.development` used before the React migration, so
// request assertions read the same as they did against the Angular client.
client.setConfig({ baseUrl: 'http://localhost:8080' });

beforeEach(() => server.listen({ onUnhandledFrame: 'error' }));

afterEach(() => {
  cleanup();
  server.resetHandlers();
  server.close();
});
