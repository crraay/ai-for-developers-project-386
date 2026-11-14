# AGENTS.md

## Working in this repo

### Commits

Commit messages follow [Conventional Commits](https://www.conventionalcommits.org) — enforced by `commitlint.config.mjs` (commit-msg hk hook) and CI (`commitlint` runs over the pushed range). PR titles follow the same ruleset: `pr-title.yml` pipes the title through `commitlint`, so a title without `type(scope):` fails CI even when every commit is fine. Inside an `/oc` run `gh` is unauthenticated (writes go through the action's App token), so report a title or description that a human must edit instead of looking for a credential.

Commits and PRs reference their ticket. `Refs #<n>` in the commit body points at the issue the change works on; `Closes #<n>` in the PR description closes it once the acceptance criteria are met; `Part of #<map>` covers work bundled under a decision map (see `docs/agents/issue-tracker.md`). An implementation commit without a referenceable issue is an exception — raise it with a human before merging.

Run at most one build command at a time per directory (`gradlew`, `npm`, `docker compose`) — a second concurrent build corrupts shared build/test state.

Agent shells on this machine: `mise` is not on PATH — full path: `C:\Program Files\mise\bin\mise.exe` (it has moved before: if that path is empty, re-find `mise.exe` under `C:\Program Files` and update this line). Prepend `C:\Program Files\mise\bin` to `$env:PATH` before `git commit`/`git push` (hk hooks exec `mise x`) and before running tasks that nest `mise run`. Prefer the `mise run` tasks for builds: bare `gradlew` resolves to this machine's system Java 17 (the build needs 25) and `mise x -- gradlew` fails with "cannot find binary path"; if you must invoke gradlew directly, set `$env:JAVA_HOME = (mise where java)` first.

The agent shell is PowerShell: use `curl.exe` for real curl flags (`curl` aliases Invoke-WebRequest), and edit file content with the edit tool — `-replace` over double-quoted strings interpolates `$(...)`/backticks and corrupts source files. Native-command arguments containing quotes or line breaks get re-split (PS 5.1): write long bodies and commit messages to a file and pass `gh --body-file` / `git commit -F`, and keep `--jq` expressions free of `"` (format the output in PowerShell instead).

The agent shell reports a spurious "exit code 1" whenever a command writes to stderr (docker, gradle, npm, hk all do) — trust command output and explicit markers (e.g. `BUILD SUCCESSFUL`), never the wrapper's exit code.

One-time per clone (after `mise install`): `mise run setup` installs the root, frontend and TypeSpec JS dependencies plus the Playwright Chromium. Docker must be running for the browser test. CI and the deploy workflow run the same setup task.

`mise run check` runs every check (lint, tests, spec lint, repo hygiene, generated-code freshness, browser test) and must pass before a change is done; CI runs the same command on every push. There is no pre-push hook — run it yourself. `mise run fix` applies the safe autofixes.

Stop a manually started `docker compose up` before running the gate: the backend tests boot a real Micronaut server on **8080**, so a running Compose backend makes every backend test fail with `Address already in use` (the browser test starts and tears down its own stack).

Generated files — `openapi/api.yml` and `frontend/src/api/` — are never edited by hand. The contract source is `typespec/main.tsp` (ADR-0008): change it, run `mise run generate` (TypeSpec → `openapi/api.yml` → React client), and commit the regenerated output; CI fails on stale output.

Lint rules are never disabled to get a change through. Exceptions are narrow (one path, one rule), carry a written reason, and need a human decision.

### Running the application

The fastest way to run the full stack from a clean clone is Docker Compose:

```bash
docker compose up --build
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:8080 (`GET /api/ping` → `pong`)
- PostgreSQL: localhost:5434

For local development without Docker, use the `mise`-wrapped commands already described in `README.md` (run `mise run setup` once first so `frontend/node_modules` exists):

```bash
# backend (requires a PostgreSQL, e.g. `docker compose up -d db`)
cd backend && mise exec -- ./gradlew run

# frontend
cd frontend && mise exec -- npm start
```

## Agent skills

### Issue tracker

Issues live in this repo's GitHub Issues, managed via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Default vocabulary: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: root `GLOSSARY.md`, `docs/domain.md` (model), `docs/product.md` (scope), `docs/adr/`. See `docs/agents/domain.md`.
