# Releases start from v0.1.0: git tags line up with the OpenAPI 0.1 line

> **Status: Accepted.**

Releases are produced by **release-please** from the Conventional Commit
history (commitlint already enforces the convention on commit messages and,
since this change, on PR titles too). The repository is a single releasable
unit, so the manifest config manages one root package (`"."`) in
`release-please-config.json`, with the current version seeded at **0.1.0** in
[`.release-please-manifest.json`](../../.release-please-manifest.json).

The starting version is deliberately **0.1.0** so git tags line up with the
API version this project already declares: `info.version: "0.1"` in
[`openapi/api.yml`](../../openapi/api.yml) (generated from
`Application.java`'s `@Info(version = "0.1")`), `version = "0.1"` in
`backend/build.gradle`, and the spec URL served by CI
(`/swagger/call-calendar-0.1.yml`). Tags carry a `v` prefix (`v0.1.0`) and no
component prefix (single package, `include-component-in-tag: false`).

## Considered Options

- **Manifest mode with a seeded root version (chosen)**: config + manifest +
  CHANGELOG boot committed up front; release-please treats 0.1.0 as the
  current/starting version and derives every future tag from it.
- **Non-manifest mode**: release-please would guess the previous release from
  tags/releases — there are none, and first-run behaviour would be implicit.
  Rejected: the manifest is the explicit, reviewable record of the starting
  version.
- **Starting at 0.0.0 or an arbitrary version**: rejected — it would put the
  tag line out of sync with the API version the repo already ships.

## Deliberate deviations and scoping

- **No `extra-files` version bumps yet**: bumping `Application.java`'s
  `@Info(version = ...)` regenerates `openapi/api.yml` and changes the served
  filename that is hardcoded in `ci.yml`, the `mise.toml` smoke task, and
  `README.md`. release-please cannot run `mise run generate`, so a bot release
  PR touching those files would fail the generated-code freshness gate
  (`check:generated`) on every run. Source versions therefore stay at `0.1`
  until that coupling is designed.
- **`release-type: simple`**: only maintains `CHANGELOG.md` (it would also
  update a `version.txt`, but `createIfMissing: false` and none exists), so
  no source file is rewritten by releases.
- **No `bootstrap-sha` yet**: it can only be set to a commit that exists on
  `main`, so the first release PR collects conventional commits from the whole
  history (non-conforming messages are ignored). Adding a `bootstrap-sha` to
  trim the first changelog is the first release's business, not adoption's.
- **Driving the first release is out of scope**: issue #14 owns merging the
  first release PR, deciding the exact first tag version, and any
  `release-as` / `bootstrap-sha` tuning. The seed here defines where that
  decision starts from.

## Consequences

- Once the workflow lands on `main`, release-please opens a persistent release
  PR (`chore(main): release ...`); merging it is the release — it tags the
  merge commit (`vX.Y.Z`) and publishes the GitHub Release from
  `CHANGELOG.md`.
- The current version of record lives in `.release-please-manifest.json`;
  source files (`Application.java`, `build.gradle`) intentionally disagree
  only in shape (`0.1` vs `0.1.0`) and are not machine-synced — see the
  deviations above before "fixing" that.
- Next step: [#14 — First release with release-please](https://github.com/crraay/ai-for-developers-project-386/issues/14).
