# Branching model

MoonWitness uses **two long-lived branches** plus short-lived work branches. The rules below are
enforced by GitHub rulesets **and** by the local gate, so a mistake fails twice: once on your
machine, once on the remote.

## Topology

| Branch                                 | Purpose                          | Who writes               | Force push | Delete  |
| -------------------------------------- | -------------------------------- | ------------------------ | ---------- | ------- |
| `dev`                                  | Integration (repository default) | automation + maintainers | blocked    | blocked |
| `main`                                 | Released, deployable code        | promotion PR only        | blocked    | blocked |
| `feat/*`, `fix/*`, `chore/*`, `docs/*` | Short-lived work                 | author                   | allowed    | allowed |

`dev` is the repository default branch. Clones start there.

> **Legacy:** `master` was frozen and later removed. All its history is preserved in `dev`, in
> `main`, and in the tag `backup/20261112/master` (kept permanently as an archive).

## The rules that matter

1. **All development lands on `dev`.** Work branches from `dev` and merges back into `dev`
   through a pull request. `dev` requires CI green before merge.
2. **Nobody pushes to `main` directly.** `main` only moves by a promotion PR from `dev`.
3. **Promotion is automatic.** As soon as CI on `dev` succeeds, `auto-promote.yml` opens (or
   refreshes) the `dev` → `main` PR with auto-merge enabled. It merges itself once the required
   checks on `main` pass.

## Day-to-day flow

```sh
git switch dev
git pull --ff-only
git switch -c feat/timeline-filters
# ...work...
pnpm gate:quick          # fast loop
git commit -m "feat(timeline): add era filter"
pnpm gate:push           # full verification
git push -u origin feat/timeline-filters
gh pr create --base dev  # CI must be green before merge
```

## Promotion flow

Automatic:

```
push to dev -> CI green -> auto-promote.yml -> PR dev -> main (auto-merge) -> release-please -> tag
```

Manual fallback (only needed if the org disallows Actions from creating PRs):

```sh
gh pr create --base main --head dev --title "chore(release): promote dev to main"
gh pr merge --auto --squash <number>
```

Then `release-please.yml` runs on `main` and opens the release PR; merging it creates the tag and
`deploy.yml` takes over.

## Required checks

`dev` and `main` both require:

- `Verify (lint, typecheck, test, build)`
- `Verify arsy control plane (Go)`
- `Enforce branch and commit policy`
- `Analyze (javascript-typescript)` (CodeQL)

## Local guard

`pnpm gate:push` refuses to run when the current branch is `main`. The optional pre-push hook
(`.githooks/pre-push`, installed with `pnpm hooks:install`) refuses to push to `refs/heads/main`
from any branch.

## Naming work branches

| Prefix              | Use for                                    |
| ------------------- | ------------------------------------------ |
| `feat/`             | new behaviour                              |
| `fix/`              | bug fixes                                  |
| `chore/`            | tooling, deps, config                      |
| `docs/`             | documentation only                         |
| `release-please--*` | Release Please's own branches (automation) |
