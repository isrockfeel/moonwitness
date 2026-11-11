# Operations runbook

## Health and readiness

- `GET /api/v1/healthz` — liveness only. Returns `200 {"status":"ok"}` whenever the process is up. Use for container liveness probes.
- `GET /api/v1/readyz` — readiness. Verifies database connectivity with `SELECT 1`:
  - `200 {"status":"ready","database":"ok"}` when the database answers.
  - `503 {"status":"unavailable","database":"unavailable"}` when it does not. Error details are not leaked.
    Use for load-balancer / readiness probes so traffic drains when the DB is down.

## Production configuration

Startup calls `assertProductionEnv()` and **refuses to boot** when the configuration is unsafe. Required in `NODE_ENV=production`:

| Variable       | Rule                                                          |
| -------------- | ------------------------------------------------------------- |
| `DATABASE_URL` | Must be set to a persistent database; `:memory:` is rejected. |
| `CORS_ORIGINS` | Comma-separated explicit origins; `*` is rejected.            |
| `LOG_LEVEL`    | Optional; defaults to `info` in production.                   |

Development/test defaults (`127.0.0.1`, in-memory-friendly, `localhost:3000` CORS) are never used in production.

## Shutdown

The server handles `SIGTERM`/`SIGINT` by closing the Fastify instance (which runs the `onClose` hook and closes the database connection) and exiting `0`. A second signal during shutdown is ignored to avoid double-close races.

## Security headers and errors

Every response sets `x-content-type-options: nosniff`, `x-frame-options: DENY`, and `referrer-policy: no-referrer`. In production, 5xx responses return `{"error":"internal server error"}` instead of internal messages; details go to the structured log only.

## Backup and restore (SQLite/libSQL)

Use the tested helpers from `@moonwitness/orm`:

```ts
import { backupDatabase, restoreDatabase } from "@moonwitness/orm";

// Consistent online snapshot (SQLite VACUUM INTO — safe while serving reads).
await backupDatabase("/backups/app-2026-11-11.db");

// Restore into a closed target database, then start the process.
await restoreDatabase("/backups/app-2026-11-11.db", "/var/lib/moonwitness/app.db");
```

1. Snapshot with `backupDatabase` (or copy the file plus `-wal`/`-shm` sidecars after stopping writes).
2. Move the backup to durable, off-host storage.
3. To restore: close the database, `restoreDatabase(...)`, start the process, confirm `GET /readyz` returns `200`.
4. Verify data with a representative read (e.g. `GET /api/v1/timeline/events?limit=1`).

Backup/restore is covered by `packages/orm/src/__tests__/orm.backup.test.ts` against a disposable temp database. Still exercise it against your real staging data before relying on it.

## Migration recovery

- Migrations are tracked in `_orm_schema_migrations` (id, checksum, applied_at) and run in a transaction; a failed migration rolls back and is not recorded.
- A checksum mismatch means an applied migration was edited; fix by adding a new migration rather than editing history.
