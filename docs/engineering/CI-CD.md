# CI/CD

## Workflows

| File                 | Trigger                                  | Purpose                                                |
| -------------------- | ---------------------------------------- | ------------------------------------------------------ |
| `ci.yml`             | push → `dev`; PR → `dev`, `main`; manual | format, lint, typecheck, test, build                   |
| `branch-policy.yml`  | PR → `dev`, `main`                       | target branch, promotion source, Conventional Commits  |
| `codeql.yml`         | push/PR → `dev`, `main`; weekly          | static security analysis                               |
| `release-please.yml` | push → `main`; manual                    | version bump, CHANGELOG, release PR, tag               |
| `deploy.yml`         | release published; manual                | tag-driven production deploy, health check, smoke test |

`deploy.yml` is implemented but has never run: the repository has no hosting target or deployment
credentials. It fails with an explicit list of the missing configuration instead of reporting a
green deploy. See [DEPLOYMENT.md](DEPLOYMENT.md).

There is exactly one CI workflow. Anything that used to be a separate lint/test workflow belongs
inside `ci.yml`; duplicating gates is how they drift.

## Permissions

Every workflow starts from `permissions:` scoped to what it needs:

- `ci.yml` — `contents: read`
- `branch-policy.yml` — `contents: read`
- `codeql.yml` — `contents: read`, `security-events: write`
- `release-please.yml` — `contents: write`, `pull-requests: write`, `issues: write`
- `deploy.yml` — `contents: read`; the deploy job is bound to the `production` environment

Actions are pinned to immutable commit SHAs with the resolved version in a trailing comment.
Dependabot updates them weekly; review the diff before merging, because a pinned action cannot be
retagged under you.

## Concurrency

`ci.yml` and `codeql.yml` cancel superseded runs on the same ref. `release-please.yml` does not
cancel, because cancelling a release job mid-run can leave a half-updated manifest.

## Required checks on `main`

The `main` ruleset requires these status checks before merge:

- `Verify (lint, typecheck, test, build)`
- `Enforce branch and commit policy`
- `Analyze (javascript-typescript)`

`strict_required_status_checks_policy` is on, so a promotion PR must be up to date with `main`
before it can merge.

## What CI does not do

CI does not run the local gate wrapper. It runs the same underlying commands
(`pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`) so that a green
local `gate:local` and a green CI run mean the same thing. The wrapper adds local-only checks
(secret scan, branch policy, commit messages) that CI either does not need or does differently.

## Failure handling

A red `ci.yml` on `dev` blocks the next promotion. Fix forward on `dev` with a `fix:` commit; do
not force-push `dev` (the ruleset rejects it anyway).
