# Moonwitness

Monorepo Next.js dengan fondasi enterprise: Turborepo + pnpm workspaces, shared packages, strict TypeScript, dan satu pipeline verifikasi.

## Struktur

```
apps/
  web/                  Next.js App Router (Tailwind v4, env validation, health endpoint)
packages/
  ui/                   Komponen React bersama (Button, Card, Badge, cn)
  core/                 Domain logic, Result, formatter, env schema (Zod) + Vitest
  eslint-config/        Shared flat ESLint config (base / react-internal / next)
  typescript-config/    Shared tsconfig (base / nextjs / react-library)
```

## Prasyarat

- Node.js >= 20 (lihat `.nvmrc`)
- pnpm (versi dikunci lewat `packageManager`)

## Perintah

```sh
pnpm install        # install semua workspace
pnpm dev            # jalankan app dalam mode watch
pnpm lint           # ESLint seluruh workspace
pnpm typecheck      # tsc --noEmit seluruh workspace
pnpm test           # Vitest
pnpm build          # production build (cache Turborepo)
pnpm format         # Prettier
```

## Konvensi

- Package internal memakai pola just-in-time: export source TS langsung, di-transpile oleh Next (`transpilePackages`). Tidak perlu langkah build terpisah untuk `ui`/`core`.
- Environment variable divalidasi saat startup lewat `parseEnv` dari `@moonwitness/core`; tambahkan schema baru di `apps/web/src/env.ts` dan dokumentasikan di `.env.example`.
- CI (`.github/workflows/ci.yml`) menjalankan satu gate: `lint typecheck test build` dengan frozen lockfile.
- Tambah app baru di `apps/*`, package baru di `packages/*` — keduanya otomatis masuk workspace dan pipeline Turbo.
