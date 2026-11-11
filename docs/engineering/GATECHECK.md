# Local gate

The gate engine is `scripts/gatecheck.mjs`, exposed through `pnpm gate:*`. It exists so that "it
works on my machine" is a claim with evidence attached.

## Commands

| Command             | Runs                                                                                | Use when                   |
| ------------------- | ----------------------------------------------------------------------------------- | -------------------------- |
| `pnpm gate:quick`   | format check, lint, typecheck (packages)                                            | inner loop                 |
| `pnpm gate:local`   | frozen install, format, lint, typecheck, test, build                                | before opening a PR        |
| `pnpm gate:push`    | branch policy, worktree, local gate, whitespace, secrets, audit, commit messages    | before pushing             |
| `pnpm gate:release` | branch/worktree, local gate, manifest vs version, changelog entry, tag availability | on `main`, before tagging  |
| `pnpm gate:doctor`  | toolchain, git identity, remote, branch, upstream, hook                             | when something feels wrong |

`gate:push` accepts `--allow-dirty` to acknowledge a dirty worktree. That produces
`NOT APPLICABLE` for the worktree step — it never turns a failure into a pass.

## States

Every step reports exactly one of:

- **PASS** — ran, exit code 0.
- **FAIL** — ran, non-zero exit code. The gate exits 1.
- **BLOCKED** — the step could not be evaluated (protected branch, dirty tree, registry
  unreachable). The gate exits 1. This is not a pass.
- **NOT APPLICABLE** — the check does not apply here (no upstream configured, hook not installed).
  Does not fail the gate, and says so out loud.

There are no silent skips. If a step is skipped, it is reported as `NOT APPLICABLE` with a reason.

## Exit-code fidelity

Every child process is executed with `spawnSync` and its real status is read from `result.status`.
No step pipes into `tail`, no step ends with `|| true`. A missing binary yields `-1` and fails the
gate rather than being ignored.

## What each gate proves

**`gate:quick`** proves the tree is formatted, lint-clean, and type-correct across
`@moonwitness/*` packages. It is fast enough to run on every save.

**`gate:local`** proves the repository installs from the lockfile and that tests and builds pass
from that exact install. This is the gate a promotion PR must carry.

**`gate:push`** adds the things that only make sense when leaving the machine: branch policy,
clean worktree, whitespace errors, tracked-file secret scan, dependency advisories, and
Conventional Commit compliance.

**`gate:release`** verifies the release contract: `main`, clean tree, everything `gate:local`
covers, `package.json` version == `.release-please-manifest.json`, a `CHANGELOG.md` entry for that
version, and that the `vX.Y.Z` tag does not already exist.

## Secret scan scope

The push gate scans tracked text files for private keys, GitHub tokens/PATs, OpenAI-style keys,
AWS access key IDs, and Slack tokens. It skips `node_modules` and the lockfile. It is a
last-line-of-defence check, not a substitute for GitHub secret scanning.

## Hook installation

```sh
pnpm hooks:install     # git config core.hooksPath .githooks
```

The hook rejects pushes from `main`/`master` and to `refs/heads/main`/`refs/heads/master`, then
runs `gate:push`.
