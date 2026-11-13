import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

/**
 * Scoped class names are deterministic (`book-page__slot-link`) rather than
 * hashed: the browser suite at the repo root selects slot links by class, and a
 * stable name keeps those selectors readable and greppable.
 */
function scopedClassName(localName: string, filename: string): string {
  const base = filename.split(/[\\/]/).pop() ?? 'style';
  return `${base.replace(/\.module\.scss$/, '')}__${localName}`;
}

export default defineConfig({
  plugins: [react()],
  server: { port: 4200 },
  preview: { port: 4200 },
  css: {
    modules: {
      generateScopedName: scopedClassName,
      // The stylesheets use kebab-case class names; this exposes them as
      // `styles.slotLink` while the emitted CSS class stays `book-page__slot-link`.
      localsConvention: 'camelCaseOnly',
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    // On Windows, running the full gate (`mise run check`, where the backend
    // checks run in parallel) intermittently failed to start the Vitest workers
    // at all ("Timeout waiting for worker to respond"). Running the spec files
    // one at a time keeps the gate deterministic without changing the tests.
    fileParallelism: false,
    maxWorkers: 1,
    restoreMocks: true,
  },
});
