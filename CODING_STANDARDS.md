# Coding standards

Read at **review** time (`/code-review`, Standards axis), not at implementation time. Only
judgement calls that no tool here can enforce live in this file: eslint, spotless, stylelint,
Error Prone/NullAway, vacuum and betterleaks already own everything mechanical, so a rule
tooling could check is absent by design.

## Tests

- **Form interactions flush.** A spec that drives a form input awaits
  `fixture.whenStable()` before dispatching the `input` event and again after.
  NgModel wires its value-accessor listener on a microtask (an earlier dispatch
  silently hits a no-op handler) and propagates view→model asynchronously, so
  without both flushes the model reads stale. Reference implementation: `fillField`
  in `frontend/src/app/pages/book-form-page/book-form-page.spec.ts`.
- **Fixture secrets are non-hex.** Fake tokens and keys in tests are placeholder
  text (`test-cancellation-token-000000`), never 32-char hex — betterleaks flags
  hex-shaped strings as `generic-api-key`, and the fix belongs in the fixture, not
  in a scanner allowlist.

## Backend

- **Domain errors map in one place.** `SlotUnavailableException`,
  `BookingNotFoundException` and `InvalidRequestException` become problem+json
  only in `api/ApiExceptionHandler`. Add new domain errors as a case there (with a
  `BookingFlowTest` assertion), not as a handler elsewhere. Why a separate handler
  class silently 500s: see the class javadoc.
