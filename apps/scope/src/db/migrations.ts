import type { Migration } from "@moonwitness/orm";

/**
 * Scope local database migrations.
 *
 * Each migration is idempotent and checksum-verified by the ORM runner.
 * Never modify an applied migration — add a new one instead.
 */
export const scopeMigrations: Migration[] = [
  {
    id: "001_init",
    up: `
      CREATE TABLE IF NOT EXISTS audit_log (
        id          TEXT PRIMARY KEY,
        ts          TEXT NOT NULL,
        action      TEXT NOT NULL,
        branch      TEXT,
        commit_sha  TEXT,
        outcome     TEXT NOT NULL,
        duration_ms INTEGER,
        detail      TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_audit_log_ts
        ON audit_log (ts DESC);

      CREATE TABLE IF NOT EXISTS gate_runs (
        id          TEXT PRIMARY KEY,
        ts          TEXT NOT NULL,
        gate        TEXT NOT NULL,
        branch      TEXT,
        commit_sha  TEXT,
        outcome     TEXT NOT NULL,
        duration_ms INTEGER,
        steps       TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_gate_runs_ts
        ON gate_runs (ts DESC);

      CREATE TABLE IF NOT EXISTS radio_health (
        id            TEXT PRIMARY KEY,
        ts            TEXT NOT NULL,
        online        INTEGER NOT NULL,
        latency_ms    INTEGER,
        listeners     INTEGER,
        error         TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_radio_health_ts
        ON radio_health (ts DESC);

      CREATE TABLE IF NOT EXISTS daily_journal (
        id          TEXT PRIMARY KEY,
        date        TEXT NOT NULL UNIQUE,
        summary     TEXT NOT NULL,
        created_at  TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_daily_journal_date
        ON daily_journal (date DESC);
    `,
  },
];
