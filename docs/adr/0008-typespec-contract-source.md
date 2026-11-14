# OpenAPI: TypeSpec as the contract source

Part of #19 · Refs #32

## Status

Accepted

## Context

ADR-0003 chose a code-first pipeline: Micronaut controller annotations generate
`openapi/api.yml`, and `ng-openapi-gen` produces the Angular client. That worked
for the walking skeleton, but as the surface grew it showed the same pain that
usually hits code-first APIs:

- The contract is scattered across Java controller files, annotation strings,
  and DTO classes. Reviewing a contract change means reading Java and mentally
  diffing the emitted YAML.
- Response descriptions, status codes, and content types are easy to drift from
  the actual implementation because they live in annotations, not in a readable
  spec.
- The generated spec depended on a full Gradle build and a custom `exportOpenApi`
  task, which had to be run clean-room to avoid reproducing stale output.

Step 6 of the delivery plan (#19) asked for a single, reviewable source of truth
for the API contract.

## Decision

The TypeSpec project in `typespec/` is now the **authoritative contract source**.
`npm run compile` (TypeSpec) emits `openapi/api.yml`, and a generated client is
produced from that file. `mise run generate` now runs `generate:spec` (TypeSpec)
then `generate:client`.

> **Generator note (ADR-0009).** `generate:client` now runs
> `@hey-api/openapi-ts`, which writes the SDK, types and TanStack Query options
> into `frontend/src/api/`. The decision below is unchanged; only the tool that
> turns `openapi/api.yml` into a committed client changed when the frontend moved
> to React.

### Why TypeSpec

- A dedicated spec language is more reviewable than Java annotations for
  contract changes.
- It keeps paths, methods, status codes, content types, and schemas in one
  place.
- It still produces OpenAPI 3, so the existing tooling (`vacuum`, and the client
  generator) continues to work unchanged.

### Backend annotations

The Micronaut OpenAPI annotations on controllers are **left in place but are no
longer authoritative**. They are kept only because the running backend still
serves the Swagger spec and Swagger UI at `/swagger/` and `/swagger-ui/` from
those annotations. Any intentional contract change must be made in
`typespec/main.tsp` first; the annotations should be updated to match, but they
are not the source of truth and are not used to regenerate `openapi/api.yml`.

### Drift detection

`mise run check:generated` regenerates `openapi/api.yml` and
`frontend/src/api/` and fails if the committed versions differ from the
freshly generated ones. The gate now stages untracked files before diffing, so a
newly generated client that was never `git add`ed is caught just like a modified
one.

## Consequences

- Changing an endpoint means changing `typespec/main.tsp`, running
  `mise run generate`, and committing the spec and client diffs together with
  the source change.
- The backend implementation must still honor the contract; TypeSpec does not
  replace runtime validation.
- The Swagger UI served at runtime may drift from `openapi/api.yml` if the
  annotations are not kept in sync. This is a deliberate, documented trade-off
  until the runtime serving strategy is revisited.
