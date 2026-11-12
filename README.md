# Moonwitness

Monorepo Next.js dengan fondasi engineering: Turborepo + pnpm workspaces, shared packages, strict
TypeScript, gate lokal, dan release governance berbasis Conventional Commits.

## Struktur

```
apps/
  web/                  Next.js App Router (Tailwind v4, env validation, health endpoint)
  api/                  Fastify API (domain use cases, SQLite/libSQL, audit log)
packages/
  ui/                   Komponen React bersama (Button, Card, Badge, cn)
  core/                 Domain logic, Result, formatter, env schema (Zod) + Vitest
  orm/                  Schema-driven repository (soft delete, versioning, audit)
  schema/ contracts/ errors/ types/    Kontrak dan tipe bersama
  eslint-config/        Shared flat ESLint config (base / node / api)
  typescript-config/    Shared tsconfig (base / nextjs / react-library)
scripts/                Gate engine, commit lint, branch guard, hook installer
docs/engineering/       BRANCHING, GATECHECK, CI-CD, RELEASING, SECURITY
```

## Prasyarat

- Node.js >= 20 (lihat `.nvmrc`)
- pnpm (versi dikunci lewat `packageManager`)

## Mulai

```sh
pnpm install
pnpm hooks:install     # opsional: pre-push branch guard + gate
pnpm gate:doctor       # cek toolchain, git identity, remote, branch
pnpm dev               # jalankan app dalam mode watch
```

Kerja dilakukan di branch `dev`. `main` hanya menerima promosi lewat pull request, `master`
dibekukan. Detail: [docs/engineering/BRANCHING.md](docs/engineering/BRANCHING.md).

## Perintah

```sh
pnpm gate:quick        # format, lint, typecheck (feedback cepat)
pnpm gate:local        # install frozen, format, lint, typecheck, test, build
pnpm gate:push         # gate:local + branch policy, secret scan, audit, commit lint
pnpm gate:release      # kesiapan rilis di main: versi, changelog, tag
pnpm gate:doctor       # diagnosis environment

pnpm lint              # ESLint seluruh workspace
pnpm typecheck         # tsc --noEmit seluruh workspace
pnpm test              # Vitest
pnpm build             # production build (cache Turborepo)
pnpm format            # Prettier
```

Gate melaporkan setiap langkah sebagai `PASS`, `FAIL`, `BLOCKED`, atau `NOT APPLICABLE` — tidak ada
skip diam-diam. Lihat [docs/engineering/GATECHECK.md](docs/engineering/GATECHECK.md).

## Konvensi

- Package internal memakai pola just-in-time: export source TS langsung, di-transpile oleh Next
  (`transpilePackages`). Tidak perlu langkah build terpisah untuk `ui`/`core`.
- Environment variable divalidasi saat startup lewat `parseEnv` dari `@moonwitness/core`; tambahkan
  schema baru di `apps/web/src/env.ts` dan dokumentasikan di `.env.example`.
- Commit mengikuti Conventional Commits (`feat:`, `fix:`, `chore:`, …). Changelog dan versi
  dihasilkan dari pesan commit — lihat [docs/engineering/RELEASING.md](docs/engineering/RELEASING.md).
- Tambah app baru di `apps/*`, package baru di `packages/*` — keduanya otomatis masuk workspace dan
  pipeline Turbo.

## Dokumentasi engineering

- [Arsitektur fondasi](docs/architecture/engineering-foundation.md)
- [Branching](docs/engineering/BRANCHING.md)
- [Gate lokal](docs/engineering/GATECHECK.md)
- [CI/CD](docs/engineering/CI-CD.md)
- [Releasing](docs/engineering/RELEASING.md)
- [Deployment](docs/engineering/DEPLOYMENT.md)
- [Security](docs/engineering/SECURITY.md)
- [Contributing](CONTRIBUTING.md)
# trigger codescan
# trigger CodeQL re-scan Thu Nov 12 10:55:20 SEAST 2026
