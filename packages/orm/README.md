# @moonwitness/orm

Reusable libSQL/SQLite ORM layer for MoonWitness addons.

## Driver boundary

- Uses `@libsql/client` via `LibSqlDriver` for local file and in-memory databases (`:memory:` or `file:` paths).
- All operations are async (`initDb`, `run/all/get/exec`, repository methods, migrations). Callers must `await` results.
- Transactions are scoped via `getDb().transaction(async (tx) => ...)` and commit/rollback atomically (entity writes + audit writes in the same transaction).
- Lifecycle: `initDb(path)` once per process context, `closeDb()` to release; re-init after close is supported.

## Models and repository

- `defineModel({ name, table, schema, softDelete?, indexes? })` builds DDL, typed repository, and audit hook.
- Framework-owned metadata columns: `id`, `create_uid`, `create_date`, `write_uid`, `write_date`, `status`, `deleted_uid`, `deleted_date`, `version`, `source`, `source_ref`.
- Business updates cannot overwrite protected metadata; `update/archive/restore/delete` enforce consistent actor/timestamps/version/status transitions and optimistic locking (`ConflictError` on stale/missing version match).
- Soft-delete (`status='deleted'`) is filtered by default in `find/findOne/list/count`; pass `{ includeDeleted: true }` to include.
- Query columns are validated (identifier-safe, known columns only).

## Supported schema types

`z.string`, `z.enum`, `z.literal`, `z.number` (int/float), `z.boolean`, `z.date`, `z.array`, `z.object`, `z.record`, plus `optional/nullable/default/effects` wrappers. Unsupported types are rejected at model definition time.

## Migrations

- `applyMigrations([{ id, up }])` records applied migrations in `_orm_schema_migrations` with checksum and timestamp.
- Deterministic and idempotent: reruns skip already-applied migrations; modified SQL for an applied id is rejected (checksum mismatch).
- Each migration runs in a transaction; failures roll back and are not recorded.

## Exports

Public API is exported from `src/index.ts` (e.g. `defineModel`, `BaseRepository`, `initDb/closeDb/getDb`, `LibSqlDriver`, `applyMigrations`, `listAppliedMigrations`, actor/context/types/errors). Keep exports aligned with implementation; avoid parallel persistence abstractions.
