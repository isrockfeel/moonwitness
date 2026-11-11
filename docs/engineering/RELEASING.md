# Releasing

Release Please is the single authoritative release system. Nothing else bumps versions, writes
`CHANGELOG.md`, or creates tags.

## Model

- One release stream for the whole repository: the root `package.json` carries the product version.
- `release-please-config.json` declares the root package (`"."`, release type `node`).
- `.release-please-manifest.json` records the last released version. It is currently `0.1.0`, the
  baseline, because the repository has no prior tagged release.
- Tags are `vX.Y.Z` with no component prefix.
- `bump-minor-pre-major` is on: while the version is `0.x`, breaking changes bump the minor.

## Flow

1. Conventional Commits land on `dev`.
2. A promotion PR (`dev` → `main`) is opened and merged by the owner.
3. `release-please.yml` runs on `main` and opens (or updates) a release PR containing the version
   bump and the CHANGELOG entries.
4. The owner merges the release PR. Release Please creates the `vX.Y.Z` tag and the GitHub
   release.
5. The `release-tags` ruleset makes that tag immutable.

Release Please never merges anything by itself and never pushes to `dev`.

## Version semantics

| Commit                        | Version effect (pre-1.0)  | Version effect (≥1.0) |
| ----------------------------- | ------------------------- | --------------------- |
| `fix:`                        | patch (`0.1.0` → `0.1.1`) | patch                 |
| `feat:`                       | minor (`0.1.1` → `0.2.0`) | minor                 |
| `feat!:` / `BREAKING CHANGE:` | minor (`0.2.0` → `0.3.0`) | major                 |

Pre-1.0 behaviour comes from `bump-minor-pre-major: true` and
`bump-patch-for-minor-pre-major: false`. Check `release-please-config.json` for the authoritative
flags rather than trusting this table.

## Changelog

`CHANGELOG.md` is generated from commit messages. Sections kept visible: Features, Bug Fixes,
Performance, Reverts. `refactor`, `docs`, `test`, `build`, `ci`, `chore`, `style` are recorded but
hidden.

Do not hand-edit released sections. To correct a released entry, release a new version.

## Pre-release verification

`pnpm gate:release` must pass on `main` before a tag is cut. It checks the branch, the worktree,
the full local gate, manifest/`package.json` version agreement, a CHANGELOG entry for the version,
and that the tag is still free.

## Deployment

Production deploys are tag-driven: `.github/workflows/deploy.yml` runs on `release: published`,
deploys the tagged commit, then requires a `200` from the health endpoint and a passing smoke test.

The workflow is implemented but **not yet operational**: this repository has no hosting target and
no deployment credentials, so the job fails with an explicit list of what is missing rather than
reporting a green deploy. Configuration, enabling steps, and the rollback runbook are in
[DEPLOYMENT.md](DEPLOYMENT.md).
