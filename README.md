# Call Calendar

[![hexlet-check](https://github.com/crraay/ai-for-developers-project-386/actions/workflows/hexlet-check.yml/badge.svg)](https://github.com/crraay/ai-for-developers-project-386/actions)

Building a booking calendar service together with AI

How it should work: https://files.hexlet.app/a/2ipc5m



## Tech Stack

Angular (frontend) · Java 25 + Micronaut (backend) · PostgreSQL · Docker Compose

See [ADR-0001](docs/adr/0001-tech-stack.md) for why this stack was chosen.



## Installation

Prerequisites: [mise](https://mise.jdx.dev) (`winget install jdx.mise` on
Windows) and Docker. Tool versions (Java 25, Node 24) are pinned in
`mise.toml`.

```bash
git clone https://github.com/crraay/ai-for-developers-project-386.git
cd ai-for-developers-project-386
mise install
```



## Usage

Run the whole stack:

```bash
docker compose up --build
```

- Frontend: http://localhost:4200
- Backend API: http://localhost:8080 (`GET /api/ping` → `pong`)
- Swagger UI: http://localhost:8080/swagger-ui/ (raw spec: `/swagger/call-calendar-0.1.yml`)
- PostgreSQL: localhost:5434 (`postgres`/`postgres`, db `callcalendar`; 5432 is used by a local PostgreSQL install on this machine)

Local development without Docker:

```bash
# backend (requires a PostgreSQL, e.g. `docker compose up -d db`;
# override the connection with DATASOURCES_DEFAULT_URL if needed)
cd backend && mise exec -- ./gradlew run

# frontend
cd frontend && mise exec -- npm start
```



## Deployment

The app runs on [Render](https://render.com) (free tier), and deploys **manually
only** — no service has auto-deploy enabled, and the deploy workflow has no push
or PR triggers:

| Resource | Render service | URL |
| --- | --- | --- |
| Frontend | static site `call-calendar` | https://call-calendar-es6x.onrender.com |
| Backend | web service `call-calendar-api` | https://call-calendar-api-55jr.onrender.com |
| Database | Postgres `call-calendar-db` (free) | internal, not exposed |

To deploy: push to `main`, then run the [`deploy`](.github/workflows/deploy.yml)
workflow by hand (GitHub → Actions → **deploy** → *Run workflow*), selecting
**`main`** in the branch dropdown — Render builds `main`, so the checked-out code
and the deployed code must be the same. (The *Run workflow* button is only
registered once the file exists on the default branch, `dev`; both branches carry
`deploy.yml`.) The workflow runs the same `mise run check` gate CI runs,
deploys the backend first and the static site
second, then verifies the live deployment (API ping, served index, CORS
preflight).

One-time setup: add a `RENDER_API_KEY` repository secret (Settings → Secrets and
variables → Actions) holding a Render API key with write access. The same key
sits in the gitignored `.env` (for local Render API scripting) and
`.render-api-key` (read by the `render` MCP server configured in
`opencode.json`); neither file is ever committed.

Free-tier caveats:

- Services spin down after ~15 minutes without traffic; the first request after
  idle takes 30–60 seconds to wake them.
- The free Postgres instance expires 30 days after creation (**2026-12-10**) and
  must then be recreated (data is not preserved).
- Render suffixes service URLs (`-es6x`, `-55jr`). If a service is recreated,
  update the URLs in `frontend/src/environments/environment.prod.ts`, the
  `CORS_ALLOWED_ORIGINS` env var of the backend service, and
  `.github/workflows/deploy.yml`.
- The frontend's API URL is baked in at build time via Angular `fileReplacements`
  (`environment.prod.ts`); the backend's allowed origin comes from the
  `CORS_ALLOWED_ORIGINS` Render env var (defaulting to `http://localhost:4200`
  locally).



## Testing

Tests are run automatically by Hexlet on every commit via the [`hexlet-check`](.github/workflows/hexlet-check.yml) GitHub Actions workflow. This repo's own [`ci.yml`](.github/workflows/ci.yml) additionally runs the full quality gate on every push.

The one command that runs everything (all linters, all tests, the OpenAPI spec lint, repo hygiene checks, and the generated-code freshness gate):

```bash
mise run check
```

Other tasks:

```bash
mise run fix        # apply safe autofixes (spotless, eslint, stylelint, prettier)
mise run generate   # regenerate openapi/api.yml + the frontend API client
mise run smoke      # docker compose stack end-to-end check (needs Docker)
```

Git hooks (fast pre-commit tier + commit-msg lint + pre-push `mise run check`)
are managed by hk; once per clone:

```bash
hk install --mise
```

Commits follow [Conventional Commits](https://www.conventionalcommits.org)
(enforced by commitlint in the commit-msg hook and in CI).

Run individual test suites locally:

```bash
cd backend && mise exec -- ./gradlew test   # JUnit 5 + Testcontainers PostgreSQL
cd frontend && mise exec -- npm test -- --watch=false   # Vitest
```

The frontend never calls the API through hand-written URLs: the typed client in
`frontend/src/app/api/` is generated from `openapi/api.yml` (exported from the
backend's Micronaut annotations) — see [ADR-0003](docs/adr/0003-openapi-code-first-ng-openapi-gen.md).

