# Quality gates: mise tasks + hk hooks + dev-quality-gates subset

All lint/test/hygiene checks are gathered into **`mise run check`** (mise
tasks), runnable locally and in CI as the same command ([`ci.yml`](../../.github/workflows/ci.yml)
runs it on every push). Git hooks via **hk** add a fast pre-commit tier
(typos, betterleaks, prettier on staged files) and commitlint on commit-msg.
There is no pre-push hook: `mise run check` is run explicitly (CI runs it on
every push). The tool selection follows
[dev-quality-gates](https://github.com/mokevnin/dev-quality-gates): backend =
Spotless + Error Prone + NullAway (all failing the build), frontend =
angular-eslint + prettier + stylelint, cross-cutting = typos, betterleaks,
hadolint, jactionlint, vacuum, osv-scanner, commitlint.

## Deliberate deviations and scoping

- **angular-eslint, not oxlint** (the list's JS pick): oxlint parses 0/39
  Angular template rules, and template linting (accessibility, syntax) is the
  higher-value check for this project.
- **osv-scanner runs scheduled-only** (`security.yml`, weekly), not on push: a
  new advisory must not break unrelated pushes (quality-gates pattern).
  Suppressions use `ignoreUntil` so they expire (`osv-scanner.toml`).
- **commitlint is not part of `mise run check`**: it validates commits, not
  code. Enforced in the commit-msg hook and over the pushed range in CI.
- **jactionlint runs on a fixed file list** (`ci.yml`, `security.yml`):
  `hexlet-check.yml` is managed externally and must not be edited, so it is
  excluded by omission.
- **squawk skipped**: it lints raw SQL migrations; ours are Liquibase XML.
- **Known gap**: backend Gradle dependencies are not vulnerability-scanned
  (osv-scanner needs a `gradle.lockfile`; dependency locking not yet enabled).
- **Deferred**: oasdiff (no API surface yet), ArchUnit (no architecture yet),
  renovate, knip/dependency-cruiser, diff-cover, axe-core/size-limit,
  rumdl/lychee, agnix, ast-grep/easement/conftest.

## Consequences

- Hook and CI cannot drift: both call the same mise tasks; a check that exists
  only in a hook is not enforcement, so everything also runs in CI.
- Tool versions are pinned once in `mise.toml` and CI reads the same file via
  `jdx/mise-action`; actions in workflows are pinned to commit SHAs
  (jactionlint enforces).
- Exceptions follow the repo rule: narrow (path + rule), written reason, human
  decision; security-relevant suppressions carry a review date.
