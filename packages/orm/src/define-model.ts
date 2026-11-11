import { z } from "zod";
import { getDb } from "./driver.js";
import type { BaseMetadata, RecordSource, RecordStatus } from "./base-metadata.js";
import type { ActorContext } from "./actor-context.js";
import { SYSTEM_ACTOR } from "./actor-context.js";
import type { TimelineFilters, TimelineStats, Era, EraId, EventKind, ArtKey } from "@moonwitness/types";
import type { TimelineEvent } from "@moonwitness/types";

export interface DefineModelOptions {
  name: string; // namespaced per addon (e.g. 'timeline.event')
  table: string; // database table name
  schema: z.ZodObject<any, any>; // business fields only
  softDelete?: boolean; // default true
  indexes?: Array<{ fields: string[]; unique?: boolean }>;
}

export type AuditAction = "CREATE" | "UPDATE" | "ARCHIVE" | "RESTORE" | "DELETE";

export interface AuditEntry {
  id: string;
  model: string;
  entity_id: string;
  action: AuditAction;
  changed_by: string | null;
  changed_at: string;
  diff: string; // JSON field-level diff
  entity_version: number;
  source: RecordSource;
  request_id: string | null;
}

export interface DefineModelReturn<TBusiness extends z.ZodObject<any, any>> {
  name: string;
  table: string;
  schema: TBusiness; // business schema
  fullSchema: z.ZodObject<any, any>; // business + metadata
  type: z.infer<TBusiness>;
  repository: BaseRepository<TBusiness>;
  ddl: string;
  auditHook: (record: any, action: AuditAction, before: any | null) => AuditEntry;
}

const METADATA_COLUMNS = [
  "id TEXT PRIMARY KEY",
  "create_uid TEXT",
  "create_date TEXT NOT NULL",
  "write_uid TEXT",
  "write_date TEXT NOT NULL",
  "status TEXT NOT NULL DEFAULT 'active'",
  "deleted_uid TEXT",
  "deleted_date TEXT",
  "version INTEGER NOT NULL DEFAULT 1",
  "source TEXT NOT NULL DEFAULT 'api'",
  "source_ref TEXT",
] as const;

const AUDIT_DDL = `
CREATE TABLE IF NOT EXISTS _orm_audit_log (
  id TEXT PRIMARY KEY,
  model TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  action TEXT NOT NULL,
  changed_by TEXT,
  changed_at TEXT NOT NULL,
  diff TEXT NOT NULL,
  entity_version INTEGER NOT NULL,
  source TEXT NOT NULL,
  request_id TEXT
);
CREATE INDEX IF NOT EXISTS idx_audit_model_entity ON _orm_audit_log (model, entity_id, changed_at);
`.trim();

let auditDdlApplied = false;

function ensureAuditTable(): void {
  if (auditDdlApplied) return;
  getDb().exec(AUDIT_DDL);
  auditDdlApplied = true;
}

/** UUID v7 (time-sortable) generated from crypto primitives. */
export function uuidv7(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  const ts = Date.now();
  // 48-bit big-endian unix ms
  bytes[0] = (ts / 2 ** 40) & 0xff;
  bytes[1] = (ts / 2 ** 32) & 0xff;
  bytes[2] = (ts / 2 ** 24) & 0xff;
  bytes[3] = (ts / 2 ** 16) & 0xff;
  bytes[4] = (ts / 2 ** 8) & 0xff;
  bytes[5] = ts & 0xff;
  bytes[6] = (bytes[6]! & 0x0f) | 0x70; // version 7
  bytes[8] = (bytes[8]! & 0x3f) | 0x80; // variant 10
  const hex = Array.from(bytes, (b) => b!.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function toIso(value: unknown): string {
  return value instanceof Date ? value.toISOString() : String(value);
}

function rowToRecord<T>(row: Record<string, unknown>): T {
  const record: Record<string, unknown> = { ...row };
  for (const key of ["create_date", "write_date", "deleted_date"]) {
    if (typeof record[key] === "string") record[key] = new Date(record[key] as string);
  }
  return record as T;
}

export class BaseRepository<TBusiness extends z.ZodObject<any, any>> {
  constructor(
    public readonly name: string,
    public readonly table: string,
    public readonly fullSchema: z.ZodObject<any, any>,
    public readonly softDelete: boolean,
  ) {}

  async find(filters: Record<string, unknown> = {}, opts: { includeDeleted?: boolean } = {}): Promise<any[]> {
    const clauses: string[] = [];
    const params: unknown[] = [];

    if (this.softDelete && !opts.includeDeleted) {
      clauses.push("status != 'deleted'");
    }
    for (const [key, value] of Object.entries(filters)) {
      clauses.push(`${key} = ?`);
      params.push(value instanceof Date ? value.toISOString() : value);
    }

    const where = clauses.length ? ` WHERE ${clauses.join(" AND ")}` : "";
    const rows = getDb().all<Record<string, unknown>>(
      `SELECT * FROM ${this.table}${where} ORDER BY id`,
      params,
    );
        return rows.map((row: Record<string, unknown>) => rowToRecord(row));
  }

  async findOne(id: string, opts: { includeDeleted?: boolean } = {}): Promise<any | null> {
    const rows = await this.find({ id }, opts);
    return rows[0] ?? null;
  }

  async create(data: any, actor: ActorContext = SYSTEM_ACTOR): Promise<any> {
    ensureAuditTable();
    const now = new Date();
    const record = {
      ...data,
      id: uuidv7(),
      create_uid: actor.actorId,
      create_date: now,
      write_uid: actor.actorId,
      write_date: now,
      status: "active" as RecordStatus,
      deleted_uid: null,
      deleted_date: null,
      version: 1,
      source: actor.source,
      source_ref: data.source_ref ?? null,
    };
    const parsed = this.fullSchema.parse(record);

    const cols = Object.keys(parsed);
    const placeholders = cols.map(() => "?").join(", ");
    const values = cols.map((c) => toIso(parsed[c]));
    getDb().run(
      `INSERT INTO ${this.table} (${cols.join(", ")}) VALUES (${placeholders})`,
      values,
    );
    this.writeAudit(parsed, "CREATE", null, actor);
    return parsed;
  }

  async update(id: string, data: any, actor: ActorContext = SYSTEM_ACTOR): Promise<any | null> {
    ensureAuditTable();
    const record = await this.findOne(id);
    if (!record) return null;

    // Optimistic locking: client must send the version it read.
    if (data.version !== undefined && data.version !== record.version) {
      throw new Error(
        `VersionConflictError: expected version ${record.version}, got ${data.version}`,
      );
    }

    const now = new Date();
    const updated = {
      ...record,
      ...data,
      // magic fields are framework-owned, never client-writable
      id: record.id,
      create_uid: record.create_uid,
      create_date: record.create_date,
      write_uid: actor.actorId,
      write_date: now,
      version: record.version + 1,
      source: actor.source,
    };
    const parsed = this.fullSchema.parse(updated);

    const cols = Object.keys(parsed).filter((c) => c !== "id");
    const setClause = cols.map((c) => `${c} = ?`).join(", ");
    const values = cols.map((c) => toIso(parsed[c]));
    getDb().run(
      `UPDATE ${this.table} SET ${setClause} WHERE id = ?`,
      [...values, id],
    );
    this.writeAudit(parsed, "UPDATE", record, actor);
    return parsed;
  }

  async archive(id: string, actor: ActorContext = SYSTEM_ACTOR): Promise<any | null> {
    return this.setStatus(id, "archived", "ARCHIVE", actor);
  }

  async restore(id: string, actor: ActorContext = SYSTEM_ACTOR): Promise<any | null> {
    return this.setStatus(id, "active", "RESTORE", actor);
  }

  /** Soft delete — never issues a physical DELETE. */
  async delete(id: string, actor: ActorContext = SYSTEM_ACTOR): Promise<any | null> {
    return this.setStatus(id, "deleted", "DELETE", actor, { setDeletedFields: true });
  }

  async history(id: string): Promise<AuditEntry[]> {
    ensureAuditTable();
    return getDb().all<AuditEntry>(
      `SELECT * FROM _orm_audit_log WHERE model = ? AND entity_id = ? ORDER BY changed_at`,
      [this.name, id],
    );
  }

  private async setStatus(
    id: string,
    status: RecordStatus,
    action: AuditAction,
    actor: ActorContext,
    opts: { setDeletedFields?: boolean } = {},
  ): Promise<any | null> {
    ensureAuditTable();
    const record = await this.findOne(id, { includeDeleted: true });
    if (!record) return null;

    const now = new Date();
    const updated = {
      ...record,
      status,
      write_uid: actor.actorId,
      write_date: now,
      version: record.version + 1,
      ...(opts.setDeletedFields
        ? { deleted_uid: actor.actorId, deleted_date: now }
        : { deleted_uid: null, deleted_date: null }),
    };
    const parsed = this.fullSchema.parse(updated);

    const cols = ["status", "write_uid", "write_date", "version", "deleted_uid", "deleted_date"];
    const setClause = cols.map((c) => `${c} = ?`).join(", ");
    const values = cols.map((c) => toIso(parsed[c]));
    getDb().run(`UPDATE ${this.table} SET ${setClause} WHERE id = ?`, [...values, id]);
    this.writeAudit(parsed, action, record, actor);
    return parsed;
  }

  private writeAudit(
    record: any,
    action: AuditAction,
    before: any | null,
    actor: ActorContext,
  ): void {
    const entry = auditHookFor(this.name)(record, action, before, actor);
    getDb().run(
      `INSERT INTO _orm_audit_log (id, model, entity_id, action, changed_by, changed_at, diff, entity_version, source, request_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        entry.id,
        entry.model,
        entry.entity_id,
        entry.action,
        entry.changed_by,
        entry.changed_at,
        entry.diff,
        entry.entity_version,
        entry.source,
        entry.request_id,
      ],
    );
  }
}

function auditHookFor(model: string) {
  return (
    record: any,
    action: AuditAction,
    before: any | null,
    actor: ActorContext,
  ): AuditEntry => {
    const diff: Record<string, { before: unknown; after: unknown }> = {};
    if (before) {
      for (const key of Object.keys(record)) {
        if (JSON.stringify(before[key]) !== JSON.stringify(record[key])) {
          diff[key] = { before: before[key], after: record[key] };
        }
      }
    } else {
      for (const key of Object.keys(record)) {
        diff[key] = { before: null, after: record[key] };
      }
    }
    return {
      id: uuidv7(),
      model,
      entity_id: record.id,
      action,
      changed_by: actor.actorId,
      changed_at: new Date().toISOString(),
      diff: JSON.stringify(diff),
      entity_version: record.version,
      source: actor.source,
      request_id: actor.requestId ?? null,
    };
  };
}

export function defineModel<TBusiness extends z.ZodObject<any, any>>(
  options: DefineModelOptions & { schema: TBusiness },
): DefineModelReturn<TBusiness> {
  const { name, table, schema, softDelete = true, indexes } = options;

  const fullSchema = schema.extend({
    id: z.string(),
    create_uid: z.string().nullish(),
    create_date: z.date(),
    write_uid: z.string().nullish(),
    write_date: z.date(),
    status: z.enum(["active", "archived", "deleted"]),
    deleted_uid: z.string().nullish(),
    deleted_date: z.date().nullish(),
    version: z.number().int().min(0),
    source: z.enum(["seed", "api", "import", "migration"]),
    source_ref: z.string().nullish(),
  });

  const indexDefinitions = (indexes ?? []).map((idx) => {
    const idxName = `idx_${table}_${idx.fields.join("_")}`;
    const unique = idx.unique ? "UNIQUE " : "";
    return `${unique}CREATE INDEX IF NOT EXISTS ${idxName} ON ${table} (${idx.fields.join(", ")})`;
  });

  const ddl = [
    `CREATE TABLE IF NOT EXISTS ${table} (\n  ${METADATA_COLUMNS.join(",\n  ")}\n)`,
    ...indexDefinitions,
  ].join(";\n");

  return {
    name,
    table,
    schema,
    fullSchema,
    type: undefined as unknown as z.infer<TBusiness>,
    repository: new BaseRepository<TBusiness>(name, table, fullSchema, softDelete),
    ddl,
    auditHook: (record, action, before) => auditHookFor(name)(record, action, before, SYSTEM_ACTOR),
  };
}

export interface ITimelineRepository {
  listEvents(filters: TimelineFilters): Promise<TimelineEvent[]>;
  getEvent(id: string): Promise<TimelineEvent | null>;
  getStats(): Promise<TimelineStats>;
  getEras(): Promise<Era[]>;
}

export class TimelineRepository
  extends BaseRepository<any>
  implements ITimelineRepository
{
  constructor(table: string = "timeline_events") {
    super(
      "timeline.event",
      table,
      {} as z.ZodObject<any, any>,
      true,
    );
  }

  async listEvents(filters: TimelineFilters): Promise<TimelineEvent[]> {
    const rows = await this.find({});
    return rows.map((row) => ({
      id: row.id as string,
      kind: row.kind as EventKind,
      date: row.date as string,
      era: row.era as EraId,
      title: row.title as string,
      excerpt: row.excerpt as string,
      body: row.body as string,
      location: row.location as string,
      tags: row.tags as string[],
      sources: row.sources as number,
      notes: row.notes as number,
      image: row.image as ArtKey,
      imagePosition: row.imagePosition as string,
      related: row.related as string[],
    }));
  }

  async getEvent(id: string): Promise<TimelineEvent | null> {
    const row = await this.findOne(id);
    if (!row) return null;
    return {
      id: row.id as string,
      kind: row.kind as EventKind,
      date: row.date as string,
      era: row.era as EraId,
      title: row.title as string,
      excerpt: row.excerpt as string,
      body: row.body as string,
      location: row.location as string,
      tags: row.tags as string[],
      sources: row.sources as number,
      notes: row.notes as number,
      image: row.image as ArtKey,
      imagePosition: row.imagePosition as string,
      related: row.related as string[],
    };
  }

  async getStats(): Promise<TimelineStats> {
      const total = (await this.listEvents({})).length;
      const byEra = (await this.listEvents({})).reduce(
        (acc: Record<string, number>, r) => {
          acc[r.era as string] = (acc[r.era as string] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      );
      const byKind = (await this.listEvents({})).reduce(
        (acc: Record<string, number>, r) => {
          acc[r.kind as string] = (acc[r.kind as string] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      );
      return { total, byEra, byKind };
    }

  async getEras(): Promise<Era[]> {
    const rows = getDb().all<Record<string, unknown>>(
      `SELECT DISTINCT era FROM ${this.table} WHERE status != 'deleted'`,
    );
    return rows.map((r) => ({
      id: r.era as EraId,
      name: r.era as string,
      years: "",
      tagline: "",
      color: "",
    }));
  }
}

export type { BaseMetadata, ActorContext };
