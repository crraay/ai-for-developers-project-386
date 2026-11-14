# Frontend: React + Vite replaces Angular

Refs #44

## Status

Accepted

## Context

ADR-0001 chose an Angular SPA as part of a deliberately heavy learning stack.
The app that stack produced was small: seven standalone components, 773 lines of
hand-written TypeScript, six eagerly loaded routes, signals for state, and no
NgModules, guards, interceptors, pipes, UI library or i18n. Its safety net was 30
Vitest cases through Angular's `TestBed`/`HttpTestingController`, four Playwright
flows against the real Compose stack, and a generated `HttpClient`/RxJS client
(ADR-0003, ADR-0008).

What changed is the learning goal, not a technical defect: the stack we want
experience with is React. Two facts made the switch cheap now:

- Host availability management (UC-1, issues #8–#12) is still unbuilt, so its UI
  would otherwise be written twice.
- The surface is small enough that a behaviour-parity gate is credible.

## Decision

The SPA in `frontend/` is **React 19.3.1 + Vite 8 + TypeScript 6.0.3**, replaced
in place in one change; Angular is removed rather than kept side by side.

- **Routing**: `react-router` v8 declarative mode (`BrowserRouter`/`Routes`).
  Every path, including the `**` redirect, is unchanged.
- **Server state**: TanStack Query, driven by the options the generator emits.
  `retry: false` in both directions, so a request still has one outcome and the
  pages keep owning their error state and Retry button.
- **Local state**: `useState`; no Redux/Zustand.
- **Styles**: one CSS module per page, ported 1:1 from the per-page SCSS, with
  deterministic scoped names (`book-page__slot-link`) instead of hashes so
  browser selectors stay readable and greppable.
- **Forms**: native validation plus component state; no form library until UC-1's
  settings form actually needs one.
- **API client**: `@hey-api/openapi-ts` generates the SDK, types and TanStack
  Query options into `frontend/src/api/`; the output is committed and gated by
  `mise run check:generated`. The pipeline shape of ADR-0008 is untouched —
  TypeSpec → `openapi/api.yml` → generated client.
- **Configuration**: Vite modes replace Angular's `fileReplacements` and
  `--configuration`. `.env.development` (`http://localhost:8080`) and
  `.env.production` (the Render service) set `VITE_API_BASE_URL`;
  `vite build --mode=$MODE` is the single knob.
- **TypeScript**: `strict` + `noUncheckedIndexedAccess` (the Angular app was
  non-strict).
- **Accessibility**: `@axe-core/playwright` scans the five main pages in the
  browser suite, and `eslint-plugin-react-hooks`' recommended rules — including
  the compiler purity rules — run in ESLint.

## Considered options

- **Keep Angular.** The cheapest option for this codebase: zoneless Angular 22
  with signals is close to free at seven components, and React buys no product
  capability here (no SSR need, v1 is not publicly deployed for SEO). Rejected
  because it does not serve the stated reason for changing.
- **Next.js instead of Vite.** Adds server rendering, routing conventions and a
  Node runtime the Micronaut backend already provides. The app is a static SPA
  served by nginx behind a URL baked at build time; Vite matches that shape.
- **Side-by-side `frontend-react/`.** Lets flows migrate one at a time and keeps
  a live comparison, but doubles CI, Docker, Compose and `mise` configuration,
  and nothing forces the second copy to be deleted.
- **`orval` or `openapi-typescript` + `openapi-fetch`.** Both work. hey-api
  generates the TanStack Query options too, so the app carries no hand-written
  hooks, and it keeps ADR-0008's "contract in, committed client out" shape.
- **React Compiler.** Automatic memoization is not needed while TanStack Query
  does the caching for seven components; the build stays boring and revisitable.

## Consequences

- **Parity is the gate.** The four browser flows and the 30 unit tests were
  ported in intent; a test that needed a different assertion was treated as a
  signal that behaviour changed. Class-name selectors in the browser suite moved
  to the scoped names; everything else is role-, label- or text-based.
- **The accessibility gate changed shape.** ADR-0004 leaned on angular-eslint's
  template rules. `eslint-plugin-jsx-a11y` still caps at ESLint 9, so it is not
  installed; axe in the browser suite is the gate instead, and it also catches
  the runtime-composed ARIA that static linting never saw.
- **TypeScript is pinned to 6.0.3, not 7.** `@hey-api/openapi-ts` reads the
  compiler API (`ts.SyntaxKind`) and crashes on the native 7.x port. Revisit when
  the generator supports it; the app code itself is 7-ready.
- **`noPropertyAccessFromIndexSignature` is off.** CSS module imports are index
  signatures and dot access (`styles.slotLink`) is the readable form. Every other
  strictness flag, including `noUncheckedIndexedAccess`, stays on.
- **Unit tests assert roles and ARIA, not classes.** Vitest's CSS pipeline hashes
  module class names differently from the production build, so class assertions
  would be environment-specific; the browser suite covers the scoped names.
- **One step leaves the repo.** Render builds the static site from dashboard
  settings, so the publish directory must move to `frontend/dist` out of band
  before the next deploy succeeds. The issue checklist tracks it.
- **The domain is untouched.** `GLOSSARY.md` and `docs/product.md` describe
  bookings, not frameworks; no vocabulary changed.
- **UC-1 frontend work follows this migration**, so issues #8–#12 land once, in
  React.
