# AGENTS.md

## Working in this repo

Run at most one build command at a time per directory (`gradlew`, `npm`, `docker compose`) — a second concurrent build corrupts shared build/test state.

## Agent skills

### Issue tracker

Issues live in this repo's GitHub Issues, managed via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Default vocabulary: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: root `GLOSSARY.md`, `docs/domain.md` (model), `docs/product.md` (scope), `docs/adr/`. See `docs/agents/domain.md`.
