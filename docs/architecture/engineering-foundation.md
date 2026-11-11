# Engineering foundation

This document is the entry point for how MoonWitness is engineered: branches, gates, CI, releases,
and the parts that are deliberately not built yet.

## Layers

```
┌──────────────────────────────────────────────────────────────┐
│ Branch governance   dev (integration) / main (release) /     │
│                     master (frozen)                          │
├──────────────────────────────────────────────────────────────┤
│ Local gate          gate:quick → gate:local → gate:push →    │
│                     gate:release, plus gate:doctor           │
├──────────────────────────────────────────────────────────────┤
│ Remote CI           ci.yml, branch-policy.yml, codeql.yml    │
├──────────────────────────────────────────────────────────────┤
│ Release             Release Please → CHANGELOG → vX.Y.Z tag  │
├──────────────────────────────────────────────────────────────┤
│ Deployment          tag-driven deploy.yml, not yet enabled   │
└──────────────────────────────────────────────────────────────┘
```

## Monorepo layout

| Path                                                       | Contents                                                         |
| ---------------------------------------------------------- | ---------------------------------------------------------------- |
| `apps/web`                                                 | Next.js 15 App Router frontend                                   |
| `apps/api`                                                 | Fastify API, domain use cases, SQLite/libSQL persistence         |
| `packages/ui`, `packages/core`, `packages/types`           | shared frontend/domain building blocks                           |
| `packages/orm`                                             | schema-driven repository with soft delete, versioning, audit log |
| `packages/schema`, `packages/contracts`, `packages/errors` | shared contracts                                                 |
| `packages/eslint-config`, `packages/typescript-config`     | shared tooling config                                            |
| `scripts/`                                                 | gate engine, commit lint, branch guard, hook installer           |

Builds and checks run through Turborepo (`turbo run lint|typecheck|test|build`), so a package is
only rebuilt when its inputs change.

## Non-negotiables

1. **No fake green.** A gate that cannot run reports `BLOCKED`. A step that does not apply reports
   `NOT APPLICABLE`. Neither is reported as `PASS`.
2. **Exit codes are preserved.** No `|| true`, no piping a failing command into `tail`.
3. **`main` and `master` are not written by automation.** Promotion is a reviewed PR.
4. **Conventional Commits.** The changelog, the version bump, and the branch policy all depend on
   them.
5. **Minimal dependencies.** A new dependency needs a reason that survives review.

## Where to read next

- [BRANCHING.md](../engineering/BRANCHING.md) — topology and promotion
- [GATECHECK.md](../engineering/GATECHECK.md) — gate commands, states, guarantees
- [CI-CD.md](../engineering/CI-CD.md) — workflows, permissions, required checks
- [RELEASING.md](../engineering/RELEASING.md) — Release Please, versioning
- [DEPLOYMENT.md](../engineering/DEPLOYMENT.md) — deploy contract, enabling steps, rollback
- [SECURITY.md](../engineering/SECURITY.md) — controls, reporting, known gaps
