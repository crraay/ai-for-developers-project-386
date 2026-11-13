// Vitest configuration used by the Angular `unit-test` builder.
//
// On Windows, running the full gate (`mise run check`, where the backend checks
// run in parallel) intermittently failed to start the Vitest workers at all
// ("Timeout waiting for worker to respond"). Running the spec files one at a
// time keeps the gate deterministic without changing the tests.
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    fileParallelism: false,
    maxWorkers: 1,
    minWorkers: 1,
  },
});
