# AGENTS.md

## Working in this repo

Run at most one build command at a time per directory (`gradlew`, `npm`, `docker compose`) — a second concurrent build corrupts shared build/test state.

Agent shells on this machine: `mise` is not on PATH — full path: `C:\Users\Konstantin\AppData\Local\Microsoft\WinGet\Packages\jdx.mise_Microsoft.Winget.Source_8wekyb3d8bbwe\mise\bin\mise.exe`. Prepend that directory to `$env:PATH` before `git commit`/`git push` (hk hooks exec `mise x`) and before running tasks that nest `mise run`.

The agent shell reports a spurious "exit code 1" whenever a command writes to stderr (docker, gradle, npm, hk all do) — trust command output and explicit markers (e.g. `BUILD SUCCESSFUL`), never the wrapper's exit code.

`mise run check` runs every check (lint, tests, spec lint, repo hygiene, generated-code freshness) and must pass before a change is done; CI runs the same command on every push. `mise run fix` applies the safe autofixes.

Generated files — `openapi/api.yml` and `frontend/src/app/api/` — are never edited by hand. Change the source (backend annotations / `ng-openapi-gen.json`) and run `mise run generate`; CI fails on stale output.

Lint rules are never disabled to get a change through. Exceptions are narrow (one path, one rule), carry a written reason, and need a human decision.

## Agent skills

### Issue tracker

Issues live in this repo's GitHub Issues, managed via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Default vocabulary: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: root `GLOSSARY.md`, `docs/domain.md` (model), `docs/product.md` (scope), `docs/adr/`. See `docs/agents/domain.md`.
