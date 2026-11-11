import { z } from "zod";
import { getDb } from "./driver.js";
import type { LibSqlDriver, LibSqlExecutor } from "./drivers/sqlite.driver.js";
import { ConflictError } from "./errors.js";
import type { BaseMetadata, RecordSource, RecordStatus } from "./base-metadata.js";
import type { ActorContext } from "./actor-context.js";
import { SYSTEM_ACTOR } from "./actor-context.js";

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

const IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_]*$/;

function assertIdentifier(value: string, label: string): void {
  if (!IDENTIFIER.test(value)) {
    throw new Error(`Invalid ${label} '${value}'. Only letters, digits and underscores are allowed.`);
  }
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

const METADATA_NAMES = new Set([
  "id",
  "create_uid",
  "create_date",
  "write_uid",
  "write_date",
  "status",
  "deleted_uid",
  "deleted_date",
  "version",
  "source",
  "source_ref",
]);

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

const auditedDrivers = new WeakSet<LibSqlDriver>();

async function ensureAuditTable(): Promise<void> {
  const db = getDb();
  if (auditedDrivers.has(db)) return;
  await db.exec(AUDIT_DDL);
  auditedDrivers.add(db);
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

type Codec = "text" | "integer" | "real" | "boolean" | "date" | "json";

interface FieldSpec {
  codec: Codec;
  nullable: boolean;
  columnType: string;
}

function isZodType(value: z.ZodTypeAny, name: string): boolean {
  return value.constructor.name === name;
}

function unwrap(schema: z.ZodTypeAny): { inner: z.ZodTypeAny; nullable: boolean } {
  let current = schema;
  let nullable = false;
  for (;;) {
    if (current instanceof z.ZodOptional || isZodType(current, "ZodOptional")) {
      nullable = true;
      current = (current as z.ZodOptional<z.ZodTypeAny>).unwrap();
    } else if (current instanceof z.ZodNullable || isZodType(current, "ZodNullable")) {
      nullable = true;
      current = (current as z.ZodNullable<z.ZodTypeAny>).unwrap();
    } else if (current instanceof z.ZodDefault || isZodType(current, "ZodDefault")) {
      nullable = true;
      current = (current as z.ZodDefault<z.ZodTypeAny>).removeDefault();
    } else if (current instanceof z.ZodEffects || isZodType(current, "ZodEffects")) {
      current = (current as z.ZodEffects<z.ZodTypeAny>).innerType();
    } else {
      return { inner: current, nullable };
    }
  }
}

function fieldSpec(schema: z.ZodTypeAny, field: string): FieldSpec {
  const { inner, nullable } = unwrap(schema);
  if (
    inner instanceof z.ZodString ||
    inner instanceof z.ZodEnum ||
    inner instanceof z.ZodLiteral
  ) {
    return { codec: "text", nullable, columnType: "TEXT" };
  }
  if (inner instanceof z.ZodNumber) {
    const integer = (inner as z.ZodNumber).isInt;
    return {
      codec: integer ? "integer" : "real",
      nullable,
      columnType: integer ? "INTEGER" : "REAL",
    };
  }
  if (inner instanceof z.ZodBoolean) {
    return { codec: "boolean", nullable, columnType: "INTEGER" };
  }
  if (inner instanceof z.ZodDate) {
    return { codec: "date", nullable, columnType: "TEXT" };
  }
  if (inner instanceof z.ZodArray || inner instanceof z.ZodObject || inner instanceof z.ZodRecord) {
    return { codec: "json", nullable, columnType: "TEXT" };
  }
  throw new Error(
    `Unsupported schema type for field '${field}'. Supported: string, enum, literal, number, boolean, date, array, object, record (plus optional/nullable/default wrappers).`,
  );
}

function encodeValue(value: unknown, codec: Codec): unknown {
  if (value === undefined || value === null) return null;
  switch (codec) {
    case "date":
      return value instanceof Date ? value.toISOString() : new Date(String(value)).toISOString();
    case "boolean":
      return value ? 1 : 0;
    case "json":
      return JSON.stringify(value);
    case "integer":
    case "real":
      return Number(value);
    case "text":
    default:
      return String(value);
  }
}

function encodeFilterValue(value: unknown): unknown {
  if (value === undefined || value === null) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "boolean") return value ? 1 : 0;
  if (Array.isArray(value) || typeof value === "object") return JSON.stringify(value);
  return value;
}

function decodeValue(value: unknown, codec: Codec): unknown {
  if (value === undefined || value === null) return null;
  switch (codec) {
    case "date":
      return value instanceof Date ? value : new Date(String(value));
    case "boolean":
      return typeof value === "boolean" ? value : Boolean(Number(value));
    case "json":
      return typeof value === "string" ? JSON.parse(value) : value;
    case "integer":
    case "real":
      return Number(value);
    case "text":
    default:
      return String(value);
  }
}

export class BaseRepository<TBusiness extends z.ZodObject<any, any>> {
  private readonly fields: Map<string, FieldSpec>;

  constructor(
    public readonly name: string,
    public readonly table: string,
    public readonly fullSchema: z.ZodObject<any, any>,
    public readonly softDelete: boolean,
    businessFields: Map<string, FieldSpec> = new Map(),
  ) {
    assertIdentifier(table, "table");
    this.fields = businessFields;
  }

  private validateColumn(column: string): void {
    assertIdentifier(column, "column");
    if (!METADATA_NAMES.has(column) && !this.fields.has(column)) {
      throw new Error(`Unknown column '${column}' on model '${this.name}'.`);
    }
  }

  private decodeRow<T>(row: Record<string, unknown>): T {
    const record: Record<string, unknown> = { ...row };
    for (const key of ["create_date", "write_date", "deleted_date"]) {
      if (typeof record[key] === "string") record[key] = new Date(record[key] as string);
    }
    for (const [key, spec] of this.fields) {
      if (key in record) record[key] = decodeValue(record[key], spec.codec);
    }
    return record as T;
  }

  private encodeRow(record: Record<string, unknown>): unknown[] {
    return Object.entries(record).map(([key, value]) => {
      const spec = this.fields.get(key);
      if (spec) return encodeValue(value, spec.codec);
      if (value instanceof Date) return value.toISOString();
      if (typeof value === "boolean") return value ? 1 : 0;
      if (Array.isArray(value) || (value !== null && typeof value === "object")) {
        return JSON.stringify(value);
      }
      return value ?? null;
    });
  }

  async find(
    filters: Record<string, unknown> = {},
    opts: { includeDeleted?: boolean } = {},
  ): Promise<any[]> {
    const clauses: string[] = [];
    const params: unknown[] = [];

    if (this.softDelete && !opts.includeDeleted) {
      clauses.push("status != 'deleted'");
    }
    for (const [key, value] of Object.entries(filters)) {
      this.validateColumn(key);
      clauses.push(`${key} = ?`);
      params.push(encodeFilterValue(value));
    }

    const where = clauses.length ? ` WHERE ${clauses.join(" AND ")}` : "";
    const rows = await getDb().all<Record<string, unknown>>(
      `SELECT * FROM ${this.table}${where} ORDER BY id`,
      params,
    );
    return rows.map((row) => this.decodeRow<Record<string, unknown>>(row));
  }

  async findOne(id: string, opts: { includeDeleted?: boolean } = {}): Promise<any | null> {
    const rows = await this.find({ id }, opts);
    return rows[0] ?? null;
  }

  async create(data: any, actor: ActorContext = SYSTEM_ACTOR): Promise<any> {
    await ensureAuditTable();
    const now = new Date();
    const record = {
      ...data,
      id: data.id ?? uuidv7(),
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
    const parsed = this.fullSchema.parse(record) as Record<string, unknown>;

    const cols = Object.keys(parsed);
    cols.forEach((column) => this.validateColumn(column));
    const placeholders = cols.map(() => "?").join(", ");
    const values = this.encodeRow(parsed);

    await getDb().transaction(async (tx) => {
      await tx.run(
        `INSERT INTO ${this.table} (${cols.join(", ")}) VALUES (${placeholders})`,
        values,
      );
      await this.writeAudit(tx, parsed, "CREATE", null, actor);
    });

    return this.decodeRow(parsed);
  }

  async update(id: string, data: any, actor: ActorContext = SYSTEM_ACTOR): Promise<any | null> {
    await ensureAuditTable();

    return getDb().transaction(async (tx) => {
      const currentRow = await tx.get<Record<string, unknown>>(
        `SELECT * FROM ${this.table} WHERE id = ?`,
        [id],
      );
      if (!currentRow) return null;

      const current = this.decodeRow<Record<string, unknown>>(currentRow);
      if (data.version !== undefined && Number(data.version) !== Number(current.version)) {
        throw new ConflictError(
          `Version conflict on '${this.name}' ${id}: expected version ${String(current.version)}, got ${String(data.version)}.`,
        );
      }

      const now = new Date();
      const updated = {
        ...current,
        ...data,
        // framework-owned fields are never client-writable
        id: current.id,
        create_uid: current.create_uid,
        create_date: current.create_date,
        write_uid: actor.actorId,
        write_date: now,
        version: Number(current.version) + 1,
        source: actor.source,
        source_ref: current.source_ref,
      };
      const parsed = this.fullSchema.parse(updated) as Record<string, unknown>;

      const cols = Object.keys(parsed).filter((column) => column !== "id");
      cols.forEach((column) => this.validateColumn(column));
      const setClause = cols.map((column) => `${column} = ?`).join(", ");
      const values = this.encodeRow(
        Object.fromEntries(cols.map((column) => [column, parsed[column]])),
      );

      const result = await tx.run(
        `UPDATE ${this.table} SET ${setClause} WHERE id = ? AND version = ?`,
        [...values, id, current.version],
      );
      if (result.rowsAffected !== 1) {
        throw new ConflictError(
          `Version conflict on '${this.name}' ${id}: record changed while updating.`,
        );
      }

      await this.writeAudit(tx, parsed, "UPDATE", current, actor);
      return this.decodeRow(parsed);
    });
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
    await ensureAuditTable();
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
    await ensureAuditTable();

    return getDb().transaction(async (tx) => {
      const currentRow = await tx.get<Record<string, unknown>>(
        `SELECT * FROM ${this.table} WHERE id = ?`,
        [id],
      );
      if (!currentRow) return null;

      const current = this.decodeRow<Record<string, unknown>>(currentRow);
      const now = new Date();
      const updated = {
        ...current,
        status,
        write_uid: actor.actorId,
        write_date: now,
        version: Number(current.version) + 1,
        ...(opts.setDeletedFields
          ? { deleted_uid: actor.actorId, deleted_date: now }
          : { deleted_uid: null, deleted_date: null }),
      };
      const parsed = this.fullSchema.parse(updated) as Record<string, unknown>;

      const cols = ["status", "write_uid", "write_date", "version", "deleted_uid", "deleted_date"];
      const setClause = cols.map((column) => `${column} = ?`).join(", ");
      const values = this.encodeRow(
        Object.fromEntries(cols.map((column) => [column, parsed[column]])),
      );

      const result = await tx.run(
        `UPDATE ${this.table} SET ${setClause} WHERE id = ? AND version = ?`,
        [...values, id, current.version],
      );
      if (result.rowsAffected !== 1) {
        throw new ConflictError(
          `Version conflict on '${this.name}' ${id}: record changed while updating status.`,
        );
      }

      await this.writeAudit(tx, parsed, action, current, actor);
      return this.decodeRow(parsed);
    });
  }

  private async writeAudit(
    tx: LibSqlExecutor,
    record: Record<string, unknown>,
    action: AuditAction,
    before: Record<string, unknown> | null,
    actor: ActorContext,
  ): Promise<void> {
    const entry = auditHookFor(this.name)(record, action, before, actor);
    await tx.run(
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
    record: Record<string, unknown>,
    action: AuditAction,
    before: Record<string, unknown> | null,
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
      entity_id: String(record.id),
      action,
      changed_by: actor.actorId,
      changed_at: new Date().toISOString(),
      diff: JSON.stringify(diff),
      entity_version: Number(record.version),
      source: actor.source,
      request_id: actor.requestId ?? null,
    };
  };
}

export function defineModel<TBusiness extends z.ZodObject<any, any>>(
  options: DefineModelOptions & { schema: TBusiness },
): DefineModelReturn<TBusiness> {
  const { name, table, schema, softDelete = true, indexes } = options;

  assertIdentifier(table, "table");

  const fields = new Map<string, FieldSpec>();
  const businessColumns: string[] = [];
  for (const [field, fieldSchema] of Object.entries(schema.shape)) {
    assertIdentifier(field, "column");
    const spec = fieldSpec(fieldSchema as z.ZodTypeAny, field);
    fields.set(field, spec);
    if (!METADATA_NAMES.has(field)) {
      businessColumns.push(`"${field}" ${spec.columnType}${spec.nullable ? "" : " NOT NULL"}`);
    }
  }

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
    const columns = idx.fields.map((field) => {
      assertIdentifier(field, "index column");
      if (!fields.has(field) && !METADATA_NAMES.has(field)) {
        throw new Error(`Index on '${table}' references unknown column '${field}'.`);
      }
      return `${field}_`;
    });
    const idxName = `idx_${table}_${columns.join("_")}`;
    assertIdentifier(idxName, "index name");
    const kind = idx.unique ? "CREATE UNIQUE INDEX" : "CREATE INDEX";
    return `${kind} IF NOT EXISTS ${idxName} ON ${table} (${idx.fields.join(", ")})`;
  });

  const allColumns = [...METADATA_COLUMNS, ...businessColumns];
  const ddl = [
    `CREATE TABLE IF NOT EXISTS ${table} (\n  ${allColumns.join(",\n  ")}\n)`,
    ...indexDefinitions,
  ].join(";\n");

  return {
    name,
    table,
    schema,
    fullSchema,
    type: undefined as unknown as z.infer<TBusiness>,
    repository: new BaseRepository<TBusiness>(name, table, fullSchema, softDelete, fields),
    ddl,
    auditHook: (record, action, before) => auditHookFor(name)(record, action, before, SYSTEM_ACTOR),
  };
}