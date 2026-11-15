import { defineConfig } from '@hey-api/openapi-ts';

/**
 * The React client is generated from the committed contract (ADR-0008), never
 * edited by hand: `mise run generate` runs TypeSpec, then this generator.
 */
export default defineConfig({
  input: '../openapi/api.yml',
  output: {
    path: 'src/api',
    postProcess: ['prettier'],
  },
  plugins: ['@hey-api/client-fetch', '@tanstack/react-query'],
});
