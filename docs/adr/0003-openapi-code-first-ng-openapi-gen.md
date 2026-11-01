# OpenAPI: code-first spec, ng-openapi-gen client, committed generated code

The API contract is generated **code-first**: Micronaut controller annotations
produce `openapi/api.yml` at compile time (micronaut-openapi 7.x, exported by
the `exportOpenApi` Gradle task), and the Angular client is generated from that
file by **ng-openapi-gen** into `frontend/src/app/api/`. Both artifacts are
**committed**, and CI regenerates them and fails on any diff (generated-code
freshness gate), so PRs show contract drift explicitly and hand edits are
caught.

## Considered Options

- **openapi-generator (typescript-angular)**: needs a JRE on the frontend path
  and emits a verbose multi-directory client — heavy for this API's size.
- **orval**: strong alternative (HttpClient services plus MSW mocks and
  signal-based helpers); its extra surface is unneeded while the API is one
  endpoint. Revisit if we want generated mocks.
- **openapi-typescript**: types-only (no HttpClient/DI semantics — services
  would be hand-written around fetch) and had no official TypeScript 6 support
  at decision time.
- **Spec-first** (hand-written `openapi.yml`, generated server stubs): rejected
  for now — code-first keeps the contract drift-free by construction and is the
  idiomatic Micronaut flow. oasdiff breaking-change checks are deferred until
  the API has real surface (walking skeleton).

## Consequences

- Changing an endpoint means: change the controller, `mise run generate`,
  commit the spec and client diffs together with the source change.
- The frontend never builds request URLs by hand; tests use
  `HttpTestingController` against the generated client.
- The spec is served at runtime (`/swagger/…`, Swagger UI at `/swagger-ui/`)
  and linted by vacuum in `mise run check`.
