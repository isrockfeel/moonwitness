# Contributing

## Before you start

```sh
corepack enable                 # or install pnpm 12.18.0
pnpm install
pnpm hooks:install              # optional: pre-push branch guard + gate
pnpm gate:doctor                # confirms the toolchain
```

Work happens on `dev`. Never commit directly to `main` or `master` — the remote rejects it and the
local gate refuses to run there. See [docs/engineering/BRANCHING.md](docs/engineering/BRANCHING.md).

## The loop

```sh
git switch dev
git pull --ff-only
git switch -c feat/your-change

# edit
pnpm gate:quick                 # format, lint, typecheck — seconds

# commit
git add <specific files>
git commit -m "feat(scope): short lowercase summary"

pnpm gate:push                  # full verification before it leaves your machine
git push origin HEAD:refs/heads/dev
```

## Commit messages

Conventional Commits, enforced by `scripts/commitlint.mjs` in the push gate and by CI on pull
requests.

```
<type>(<optional scope>): <subject>

<optional body>

<optional footer>
```

Allowed types: `build`, `chore`, `ci`, `docs`, `feat`, `fix`, `perf`, `refactor`, `revert`,
`style`, `test`.

- Subject lowercase, no trailing period, 72 characters or fewer.
- `feat!:` or a `BREAKING CHANGE:` footer marks a breaking change.
- One logical change per commit. Do not mix formatting-only churn with behaviour changes.

## Pull requests

- Target `dev`. Promotion PRs to `main` are opened by the owner.
- Paste the gate output you actually ran. If you did not run `gate:local`, say so.
- Keep the PR description focused on why, not what — the diff shows what.

## Code expectations

- TypeScript strict; no `any` in new code, no non-null assertions to silence the compiler.
- Do not add a dependency when the standard library or an existing package covers it.
- Tests: `vitest`. A behaviour change needs a test that fails without the change.
- Formatting is Prettier's job; do not hand-format and do not fight it in review.

## What the gates will reject

| Symptom                  | Gate                 | Fix                                                     |
| ------------------------ | -------------------- | ------------------------------------------------------- |
| Formatting drift         | `quick`, `local`, CI | `pnpm format`                                           |
| Lint error               | `quick`, `local`, CI | fix the rule, not the config                            |
| Type error               | `quick`, `local`, CI | fix the type                                            |
| Failing test             | `local`, CI          | fix the test or the code                                |
| Broken build             | `local`, CI          | fix the build                                           |
| Protected branch         | `push`               | switch to `dev`                                         |
| Dirty worktree           | `push`               | commit or stash (`--allow-dirty` only when intentional) |
| Secret in a tracked file | `push`               | remove it, rotate it                                    |
| Non-conventional commit  | `push`, CI           | reword before pushing                                   |
