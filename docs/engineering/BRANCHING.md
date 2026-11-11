# Branching model

MoonWitness uses three long-lived branches plus short-lived work branches. The rules below are
enforced by GitHub rulesets **and** by the local gate, so a mistake fails twice: once on your
machine, once on the remote.

## Topology

| Branch                       | Purpose                   | Who writes                  | Force push | Delete  |
| ---------------------------- | ------------------------- | --------------------------- | ---------- | ------- |
| `dev`                        | AI/daily integration      | automation + maintainers    | blocked    | blocked |
| `main`                       | Released, deployable code | owner only, via reviewed PR | blocked    | blocked |
| `master`                     | Frozen legacy history     | nobody (read-only)          | blocked    | blocked |
| `feat/*`, `fix/*`, `chore/*` | Short-lived work          | author                      | allowed    | allowed |

`dev` is the repository default branch. Clones start there.

## The three rules that matter

1. **Integration happens on `dev`.** Feature work branches from `dev` and merges back into `dev`
   through a pull request.
2. **`main` only moves by promotion.** A promotion PR is `dev` → `main`, opened and merged by the
   repository owner. Automation prepares it; automation never merges it.
3. **`master` is frozen.** It exists to preserve history. No commits, no tags, no releases.

## Day-to-day flow

```sh
git switch dev
git pull --ff-only
git switch -c feat/timeline-filters
# ...work...
pnpm gate:quick          # fast loop
git commit -m "feat(timeline): add era filter"
pnpm gate:push           # full verification
git push origin HEAD:refs/heads/dev   # or push the feature branch and open a PR
```

## Promotion flow (owner only)

```sh
# 1. Automation prepares the PR
gh pr create --base main --head dev \
  --title "chore(release): promote dev to main" \
  --body "Gate output: <paste>"

# 2. Owner reviews and merges
# 3. Release Please opens the release PR on main
# 4. Owner merges the release PR -> tag vX.Y.Z is created
```

## Local guard

`pnpm gate:push` refuses to run when the current branch is `main` or `master`. The optional
pre-push hook (`.githooks/pre-push`, installed with `pnpm hooks:install`) refuses to push to
`refs/heads/main` or `refs/heads/master` from any branch.

## Naming work branches

| Prefix              | Use for                                    |
| ------------------- | ------------------------------------------ |
| `feat/`             | new behaviour                              |
| `fix/`              | bug fixes                                  |
| `chore/`            | tooling, deps, config                      |
| `docs/`             | documentation only                         |
| `release-please--*` | Release Please's own branches (automation) |
