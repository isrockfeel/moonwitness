# Security

## Controls in this repository

| Control                     | Where                          | Notes                                                                          |
| --------------------------- | ------------------------------ | ------------------------------------------------------------------------------ |
| Secret scan (tracked files) | `gate:push`                    | private keys, GitHub tokens/PATs, OpenAI-style keys, AWS key IDs, Slack tokens |
| Dependency advisories       | `gate:push`                    | `pnpm audit --prod --audit-level=high`                                         |
| Static analysis             | `.github/workflows/codeql.yml` | `javascript-typescript`, `security-and-quality` queries                        |
| Least-privilege workflows   | `.github/workflows/*.yml`      | explicit `permissions:` per workflow                                           |
| Pinned actions              | `.github/workflows/*.yml`      | major-version tags; SHA pinning if required by policy                          |
| Branch protection           | GitHub rulesets                | `main` needs a PR + required checks; `master` frozen                           |
| Immutable release tags      | `release-tags` ruleset         | `v*` tags cannot be moved or deleted                                           |
| Lockfile install            | CI and `gate:local`            | `pnpm install --frozen-lockfile`                                               |

## Reporting a vulnerability

Do not open a public issue. Contact the repository owner directly and include reproduction steps,
affected versions, and impact. Expect an acknowledgement before any public disclosure.

## Secrets

- Never commit `.env` contents. `.env` is ignored; `.env.example` documents required keys.
- Production secrets live in the deployment platform and in GitHub repository secrets, never in
  the tree.
- If a secret is committed, rotate it first, then remove it from history. Deleting the commit is
  not enough.

## Dependency policy

- Direct dependencies are added deliberately; prefer the standard library or an existing
  dependency.
- Dependabot opens grouped minor/patch updates weekly against `dev`.
- Major updates are not automated. They are upgraded on purpose, with the full gate run.

## Supply chain

Release tags are created by Release Please from reviewed commits on `main`. SBOM and provenance
attestation are not produced yet: they require a build/publish pipeline with a package or image
artifact to attest. Do not claim them until that pipeline exists.

## Known gaps

These are owner decisions, not oversights:

1. **No production deployment pipeline**, therefore no deploy-time attestation or SBOM.
2. **No branch protection bypass list.** Rules apply to everyone, including the owner; an
   emergency change still goes through a PR.
3. **`pnpm audit` is a point-in-time check** and depends on the registry being reachable. When the
   registry is unreachable the gate reports `BLOCKED`, not `PASS`.

## Rust services

The `services/` directory contains standalone Rust services (storage/S3, syslog, snmp-poller,
radius) that run independently of the Node API. They are proxied by `apps/api` and are not
exposed directly to browsers.

- **Storage (S3)**: Supports SigV4 header and presigned-URL authentication. Anonymous access is
  dev-only (`ANONYMOUS=1`); production requires credentials. Path traversal is blocked by
  canonicalising keys against `STORAGE_ROOT`.
- **Syslog**: Listens on unprivileged ports (5140/5514) by default. Messages are stored in SQLite
  with configurable retention. No authentication on the ingest listeners — restrict network access
  at the infrastructure layer.
- **SNMP poller**: Polls devices over SNMP (v1/v2c). Community strings are stored in plaintext in
  SQLite — use SNMPv3 with auth+priv in production or restrict database access.
- **RADIUS**: Authentication and accounting proxy. Shared secrets are stored in SQLite; restrict
  database access and use TLS for HTTP endpoints in production.
