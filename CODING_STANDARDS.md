# Coding standards

Read at **review** time (`/code-review`, Standards axis), not at implementation time. Only
judgement calls that no tool here can enforce live in this file: eslint, spotless, stylelint,
Error Prone/NullAway, vacuum and betterleaks already own everything mechanical, so a rule
tooling could check is absent by design.

## Tests

- **Form interactions go through user-event.** A spec that types into a form
  field uses `userEvent.type`, never a direct `input.value = …` assignment: React
  tracks the previous value on the DOM node, so assigning it directly suppresses
  the `change` event and the controlled input stays stale. Reference
  implementation: `frontend/src/pages/book-form-page/BookFormPage.spec.tsx`.
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
