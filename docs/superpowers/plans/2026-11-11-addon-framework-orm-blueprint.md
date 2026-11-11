# Blueprint: Moonwitness Addon Framework & ORM

> **Status:** PERENCANAAN — belum diimplementasikan. Dokumen ini adalah hasil brainstorm & research (2026-11-11).
> **Tujuan:** Framework backend Odoo-style yang lebih canggih: addon plug-and-play, ORM dengan magic fields, audit trail event-stream, agent-native metadata.

## 1. Latar Belakang & Motivasi

`apps/api` saat ini memakai InMemory repository + clean architecture 4 lapis (domain/application/infrastructure/interface). Struktur ini benar tapi data hilang saat restart, tidak ada audit, dan fitur baru harus di-hardcode.

Keputusan: bangun **framework sendiri** (bukan pakai Odoo/Medplum langsung) dengan dua pilar:

1. **Addon system** Odoo-style — modul plug-and-play dengan manifest, auto-registration, dependency resolution
2. **ORM sendiri** dengan magic fields Odoo yang diperbaiki — `write_uid`, `write_date`, soft delete, versioning

## 2. Hasil Research (2026-11-11)

| Sumber | Insight | Yang Kita Adopsi |
|--------|---------|------------------|
| GitHub Trending 2026 | Era AI-agent (`claude-mem`, agent workspaces, `billion-context`) | Agent-native metadata: `/_meta/llms.txt`, machine-readable manifest |
| Encore.ts | Infrastructure-from-code: `new SQLDatabase("todo")` → auto-provisioning | `defineModel()` → auto DDL + auto migration |
| Mikro-ORM (9.2k★) | Unit of Work + Identity Map | Backlog: batch audit commit |
| Deepkit (3.5k★) | DI + validator + serializer + ORM kohesif | Validasi arah: satu framework terintegrasi |
| Medplum | Paling mirip Odoo di TS: repository + hooks + bots + UI | Addon = model + hooks + UI + automation |
| WardOS | Local-first + event-sourced audit + SQLite-WASM | Audit sebagai event stream (bukan tabel mati); local-first = backlog |
| TypeSchema | Universal adapter, hindari lock-in validator | Schema abstraction boundary (backlog) |
| Odoo | `create_uid/write_date/active` magic fields | Diperbaiki → lihat §4 |

## 3. Keputusan Desain Kunci

### 3.1 Magic Fields (Odoo, diperbaiki)

| Odoo | Kelemahan | Moonwitness |
|------|-----------|-------------|
| `active` boolean | Tidak tahu siapa/kapan delete | `status: "active" \| "archived" \| "deleted"` + `deleted_uid` + `deleted_date` |
| `write_uid/write_date` | Hanya last-write, history hilang | Last-write di record + full history di `_orm_audit_log` |
| Magic fields implicit | Developer bingung | **Explicit via `defineModel()`** — TypeScript tahu semua |
| Tanpa versioning | Lost update | `version` int untuk optimistic locking |
| Tanpa source tracking | Asal data tak diketahui | `source: "seed" \| "api" \| "import" \| "migration"` |
| `id` serial | Random order | **UUID v7** (time-sortable) |

**BaseMetadata contract** (di-inject framework, developer hanya tulis field bisnis):

```typescript
export interface BaseMetadata {
  id: string;                  // UUID v7
  create_uid: string | null;   // null = system/seed
  create_date: Date;
  write_uid: string | null;
  write_date: Date;
  status: "active" | "archived" | "deleted";
  deleted_uid: string | null;
  deleted_date: Date | null;
  version: number;             // optimistic locking
  source: "seed" | "api" | "import" | "migration";
  source_ref: string | null;
}
```

### 3.2 ORM API: `defineModel()`

```typescript
const TimelineEvent = defineModel({
  name: "timeline.event",       // namespaced per addon
  table: "timeline_events",
  schema: z.object({ ... }),    // HANYA field bisnis
  softDelete: true,             // default true
  indexes: [...],
});
// Output: fullSchema (bisnis+metadata), TS types, repository CRUD,
//         DDL migration, audit hooks
```

Repository behavior:
- `find()` default exclude soft-deleted (`status != 'deleted'` auto-injected)
- `create/update/delete/archive/restore` otomatis set magic fields + tulis audit
- `update` cek `version` → ConflictError kalau mismatch
- `delete` TIDAK PERNAH `DELETE` — hanya update status

### 3.3 Audit Trail = Event Stream (bukan tabel statis)

Tabel `_orm_audit_log`: `id, model, entity_id, action (CREATE|UPDATE|ARCHIVE|RESTORE|DELETE), changed_by, changed_at, diff (JSONB field-level), entity_version, source, request_id`

- **Double-layer**: record simpan last-state (cepat), audit log simpan history (lengkap)
- **Outbox pattern**: setiap write → event → bisa diconsume audit/webhook/search-index/cache (backlog)
- **Time-travel & replay**: `repo.find({}, { asOf })`, `repo.history(id)`, `audit.replay()` (backlog fase 5)
- **Retention**: index `(model, entity_id, changed_at)`, hapus log > 90 hari (configurable)

### 3.4 Actor Context

```typescript
export interface ActorContext {
  actorId: string | null;    // null = system job (seed/cron/migration)
  source: "seed" | "api" | "import" | "migration";
  requestId?: string;        // correlation ID
}
```

Mengalir dari Fastify middleware (JWT) → controller → use case → repository. Use case TIDAK tahu soal audit — zero boilerplate.

### 3.5 Addon System

Struktur per addon:

```
packages/addons/<nama>/
├── manifest.json      # name, version, depends[], provides{routes,schemas,usecases,auditActions}
├── src/
│   ├── index.ts       # registerRoutes / registerSchemas
│   ├── model.ts       # defineModel(...)
│   └── routes.ts
└── seed/              # data awal (additive, merge by id)
```

Aturan:
- **`__base` addon wajib ter-load pertama** — foundation: system tables, `/_meta/*`, health check
- Dependency resolution: `depends` dicek sebelum register; urutan load = topological sort
- Route prefix per addon (`/timeline/*`, `/auth/*`) → tidak pernah collision
- Table prefix per addon (`timeline_events`) → tidak pernah collision
- Seed data **additive**: merge by id, addon hanya menambah (dedup via id check)
- Schema extension pattern: `baseSchema.extend({...})` — jangan duplicate
- Action type bisa ditambah per addon via `provides.auditActions`

Auto-registration di `apps/api/src/app.ts`: scan `packages/addons/*/manifest.json`, validasi depends, dynamic import `src/index.ts`, register routes + run migrations + merge seeds.

### 3.6 Agent-Native Metadata (ide dari trend 2026)

Endpoint di `__base` addon:

- `GET /_meta/models` — daftar semua model dari semua addon ter-install
- `GET /_meta/models/:name` — schema, fields, actions, magic fields, contoh query
- `GET /_meta/openapi.json` — auto-generated dari semua addon
- `GET /_meta/llms.txt` — konteks ringkas untuk AI agent (machine-readable manifest)

Odoo/Medplum tidak punya ini. Agent bisa mengintip sistem dan langsung paham cara pakai.

## 4. Arsitektur Keseluruhan

```
┌─────────────────────────────────────────────┐
│  packages/orm          (framework core)     │
│  • defineModel() → magic fields + DDL       │
│  • Repository (soft delete, versioning)     │
│  • Event bus / audit stream                 │
│  • Driver abstraction (SQLite dulu)         │
├─────────────────────────────────────────────┤
│  packages/addons/*      (plug & play)       │
│  • __base  → system models, /_meta/*, health│
│  • timeline → bisnis pertama (migrasi)      │
├─────────────────────────────────────────────┤
│  apps/api              (host)               │
│  • addon registry + dependency resolution   │
│  • auto-migrate saat addon register         │
│  • Fastify + auth middleware (ActorContext) │
└─────────────────────────────────────────────┘
```

Dependency direction tetap clean architecture: domain tidak tahu Fastify/ORM; ORM & addons adalah infrastructure.

## 5. Roadmap Implementasi

| Fase | Isi | Status |
|------|-----|--------|
| **1** | `packages/orm` MVP: `defineModel()`, BaseMetadata, magic fields, SQLite driver (libsql/better-sqlite3), repository CRUD + soft delete + versioning | ⬜ belum mulai |
| **2** | Event stream: `_orm_audit_log`, pre/post write hooks, ActorContext middleware di Fastify | ⬜ |
| **3** | `__base` addon: system tables, addon registry, auto-migration, `/_meta/*` endpoints (agent-native) | ⬜ |
| **4** | `timeline` addon: migrasi dari InMemory → ORM (bukti konsep) | ⬜ |
| **5** | Backlog: computed fields (dependency graph), time-travel/replay, webhook addon, search index, local-first (SQLite-WASM), schema portability (TypeSchema-style adapter) | ⬜ |

**Prinsip:** fase 1-2 dulu, jangan semua sekaligus. Fase 5 masuk backlog sampai fase 4 terbukti.

## 6. Pertimbangan Teknis

- **Database:** SQLite dulu (dev cepat, file-based, zero setup). Interface driver diabstraksi agar Postgres bisa ditambah tanpa refactor.
- **Migration:** auto-generate DDL dari `defineModel()`, disimpan di `_orm_schema_migrations`, dijalankan saat addon register (seperti `odoo -u module`).
- **Validation:** Zod sekarang; jaga boundary agar bisa ganti validator (pelajaran TypeSchema).
- **Existing code:** `apps/api` clean architecture dipertahankan — ORM menggantikan InMemory repository di layer infrastructure, domain interface `ITimelineRepository` tidak berubah.
- **Env:** centralized di root `.env` (sudah ada). Tambah `DATABASE_URL` untuk fase 1.

## 7. Open Questions (perlu keputusan sebelum fase 1)

1. Driver SQLite: `better-sqlite3` (sync, cepat) vs `@libsql/client` (async, bisa Turso cloud) — **rekomendasi: libsql** untuk jalur upgrade Turso
2. Audit write: synchronous dalam transaksi yang sama vs async outbox — **rekomendasi: sync dulu** (sederhana), outbox di fase 5
3. UUID v7: pakai library `uuidv7` vs implementasi sendiri — **rekomendasi: library** kecil saja
4. Apakah `apps/web` perlu generated types dari `/_meta/openapi.json` sekarang atau nanti — **rekomendasi: nanti** (fase 4)
