# Call Calendar — frontend

React SPA (React 19 + Vite + TypeScript) for the Call Calendar booking service.
See the repo root `README.md` for the full stack and `docs/adr/0009-react-frontend.md`
for why React replaced Angular.

## Local development

From the repository root, `mise run setup` installs the JS dependencies once.

```bash
npm start          # Vite dev server on http://localhost:4200
npm run build      # type-check, then production build into dist/
npm test           # Vitest + Testing Library, one worker (Windows-safe gate)
npm run lint       # ESLint (flat config)
npm run lint:scss  # stylelint over the SCSS modules
```

The Vite mode picks the API base URL from `.env.development` /
`.env.production` (`VITE_API_BASE_URL`); `npm run build -- --mode=development`
builds a bundle that talks to `http://localhost:8080`.

## Structure

- `src/main.tsx` — bootstraps the client, QueryClient and router.
- `src/App.tsx` — app shell (header, guest/host switch) plus the route table.
- `src/pages/**` — one folder per routed page: component, CSS module and spec.
- `src/lib/**` — timezone helpers, RFC 7807 error mapping, document title.
- `src/api/**` — **generated** from `openapi/api.yml` by `@hey-api/openapi-ts`
  (`mise run generate`); never edit these files by hand (ADR-0008).
- `src/test/**` — MSW server and the provider-aware render helpers.

## API client

`mise run generate` runs TypeSpec, then `npm run generate:api`, which writes the
typed SDK plus TanStack Query options into `src/api`. The committed output is
checked for freshness in CI.
