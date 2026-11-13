// Vitest configuration used by the Angular `unit-test` builder.
//
// The default pool starts one forked worker per spec file. On Windows, running
// the full gate (`mise run check`, where the backend checks run in parallel)
// intermittently made those workers miss their startup timeout, failing the
// frontend task with "Timeout waiting for worker to respond". Running the spec
// files one at a time keeps the gate deterministic without changing the tests.
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    fileParallelism: false,
    maxWorkers: 1,
    minWorkers: 1,
  },
});
