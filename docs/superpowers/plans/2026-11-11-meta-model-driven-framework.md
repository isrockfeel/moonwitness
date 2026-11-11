# Blueprint: Meta-Model Driven Framework (Odoo-Style, Lebih Canggih)

> **Status:** PERENCANAAN — rencana terinci (2026-11-11).
> **Tujuan:** Framework backend Odoo-style yang *lebih canggih*: schema-nya adalah data (bukan code), bisa diubah live tanpa restart, auto-sync, agent-native.

## 1. Inti: Apa yang Bikin Odoo "Odoo"

Odoo bukan ORM biasa. Magic-nya ada di **meta-model**:
- `ir.model` & `ir.model.fields` adalah tabel biasa yang berisi definisi model & field
- Saat module install, dia cuma *insert row* ke tabel-tabel itu
- Framework baca meta-record di runtime → build field descriptor → SQL auto-adapt
- Migrasi = bandingkan field yang dideklarasikan vs yang ada di `ir.model.fields`, generate `ALTER TABLE`

**Schema-nya data, bukan code.** Itu baru modular, updateable, tanpa restart.

## 2. Goal: Versi Odoo yang Lebih Canggih

| Odoo | Kelemahan | Moonwitness |
|------|-----------|-------------|
| Schema di-code (Python class) | Ubah field butuh upgrade cycle, ada downtime | Schema di-data, ubah via API, live, zero-downtime |
| Field-level ACL di-code | Kompleks, static | ACL di-meta, diatur runtime |
| Agent nggak bisa ubah schema | Butuh code change | Agent ubah schema lewat `/_meta`, instant |
| Tanpa schema versioning | Rollback susah | Tiap schema change punya version, validated, rollbackable |
| Hot/cold storage nggak ada | Semua field di kolom riil | Field langka di JSONB `_attrs`, auto-promote ke kolom riil (hot field detection) |

## 3. Opsi Arsitektur

### A. Declarative schema (ada sekarang, `defineModel`)
Schema di-code, auto DDL. Tipe aman, migrasi otomatis. Tapi masih butuh tulis schema per model. *Bukan jawaban.*

### B. Pure document store (tanpa schema)
Field bebas, JSON. Cepat, fleksibel. Tapi kehilangan type safety, constraint, query coherence, migration safety. Data cepat kacau. *Trap.*

### C. Meta-model driven hybrid ← dipilih
Schema adalah **data di DB** (`_meta_models`, `_meta_fields`, `_meta_relations`, `_meta_acl`, `_meta_views`). Developer/agent buat model via API:

```json
POST /_meta/models
{ "name": "timeline.event", "table": "timeline_events",
  "fields": [
    {"name":"title","type":"text","required":true},
    {"name":"era","type":"selection","selection":[["bc","BC"],["modern","Modern"]]},
    {"name":"witness_id","type":"many2one","relation":"witness.witness"}
  ],
  "acl": { "read": ["group_public"], "write": ["group_editor"] }
}
```

Framework: provision table + index + ACL + default view, **semuanya live, tanpa restart, tanpa migration window**. Ubah field? PATCH `/_meta/fields/:id` → diff → `ALTER TABLE` dalam transaksi → rollbackable. Semua adalah audit event.

## 4. Roadmap Implementasi

| Fase | Isi | Status |
|------|-----|--------|
| **1** | `packages/orm` fix: typecheck + tes runner (vitest) | ⬜ |
| **2** | Meta-model tables: `_meta_models`, `_meta_fields`, `_meta_relations`, `_meta_acl`, `_meta_views`, `_meta_schema_migrations` | ⬜ |
| **3** | `/_meta/models` POST/PATCH/DELETE + live ALTER TABLE diff engine | ⬜ |
| **4** | Addon registry: scan manifest, topological sort, auto-migrate, seed merge by id | ⬜ |
| **5** | Backfill existing timeline events ke meta-model, validate vs new constraints | ⬜ |
| **6** | CRUD endpoints (POST/PATCH/archive/restore/delete) + optimistic-locking ConflictError | ⬜ |
| **7** | Backlog: computed fields (dependency graph), time-travel/replay, webhook, local-first, hot field auto-promote | ⬜ |

**Prinsip:** 1-3 dulu, jangan semua sekaligus. 7 masuk backlog sampai 4-6 terbukti.

## 5. Pertanyaan Clarifying (sebelum eksekusi)

1. **Field metadata storage**: custom fields di JSONB `_attrs` dulu atau langsung jadi kolom riil? Rekomendasi: JSONB dulu, auto-promote ke kolom riil setelah field diakumulasi query-nya (hot field detection).
2. **Selection/enum**: field type `selection` pake list statis di meta, atau boleh di-extend runtime? Odoo kuncinya statis; kamu mau extendable?
3. **Computed fields**: sekarang backlog, tapi kalo schema-nya data, computed field perlu dependency graph di meta. Boleh mulai dengan yang sederhana (field yang diisi otomatis dari field lain)?
