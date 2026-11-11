import type { Era, TimelineEvent } from "@moonwitness/types";
import { getDb } from "@moonwitness/orm";
import { timelineEventModel, timelineEraModel } from "./model.js";

export interface TimelineFilters {
  era?: string;
  kind?: string;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
}

export interface TimelineStats {
  total: number;
  byEra: Record<string, number>;
  byKind: Record<string, number>;
}

export interface ITimelineRepository {
  listEvents(filters: TimelineFilters): Promise<{ data: TimelineEvent[]; total: number }>;
  getEvent(id: string): Promise<TimelineEvent | null>;
  getStats(): Promise<TimelineStats>;
  getEras(): Promise<Era[]>;
}

function parseJson<T>(value: unknown, fallback: T): T {
  if (value == null) return fallback;
  if (typeof value === "string") {
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  }
  return value as T;
}

function rowToEvent(row: Record<string, unknown>): TimelineEvent {
  return {
    id: String(row.id),
    kind: String(row.kind) as TimelineEvent["kind"],
    date: String(row.date),
    era: String(row.era) as TimelineEvent["era"],
    title: String(row.title),
    excerpt: String(row.excerpt),
    body: String(row.body),
    location: String(row.location),
    tags: parseJson<string[]>(row.tags, []),
    sources: Number(row.sources ?? 0),
    notes: Number(row.notes ?? 0),
    image: String(row.image) as TimelineEvent["image"],
    imagePosition: row.imagePosition == null ? undefined : String(row.imagePosition),
    related: parseJson<string[]>(row.related, []),
  };
}

function rowToEra(row: Record<string, unknown>): Era {
  return {
    id: String(row.id) as Era["id"],
    name: String(row.name),
    years: String(row.years),
    tagline: String(row.tagline),
    color: String(row.color),
  };
}

export const MAX_LIST_LIMIT = 100;
export const DEFAULT_LIST_LIMIT = 100;

/**
 * Data access owned by the timeline addon; the addon routes are its only consumer.
 */
export class TimelineRepository implements ITimelineRepository {
  private readonly events = timelineEventModel.repository;
  private readonly eras = timelineEraModel.repository;

  async listEvents(filters: TimelineFilters): Promise<{ data: TimelineEvent[]; total: number }> {
    const db = getDb();
    const clauses: string[] = [];
    const params: unknown[] = [];

    if (this.events.softDelete) clauses.push("status != 'deleted'");
    if (filters.era) {
      clauses.push("era = ?");
      params.push(filters.era);
    }
    if (filters.kind) {
      clauses.push("kind = ?");
      params.push(filters.kind);
    }
    if (filters.from) {
      clauses.push("date >= ?");
      params.push(filters.from);
    }
    if (filters.to) {
      clauses.push("date <= ?");
      params.push(filters.to);
    }

    const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
    const table = this.events.table;

    const totalRow = await db.get<{ total: number }>(
      `SELECT COUNT(*) AS total FROM ${table} ${where}`,
      params,
    );

    const limit = Math.min(Math.max(filters.limit ?? DEFAULT_LIST_LIMIT, 1), MAX_LIST_LIMIT);
    const offset = Math.max(filters.offset ?? 0, 0);

    const rows = await db.all<Record<string, unknown>>(
      `SELECT * FROM ${table} ${where} ORDER BY date ASC, id ASC LIMIT ? OFFSET ?`,
      [...params, limit, offset],
    );

    return { data: rows.map(rowToEvent), total: Number(totalRow?.total ?? 0) };
  }

  async getEvent(id: string): Promise<TimelineEvent | null> {
    const row = await this.events.findOne(id);
    if (!row) return null;
    return rowToEvent(row as unknown as Record<string, unknown>);
  }

  async getStats(): Promise<TimelineStats> {
    const rows = await getDb().all<Record<string, unknown>>(
      `SELECT era, kind, COUNT(*) AS total FROM ${this.events.table}
       WHERE status != 'deleted' GROUP BY era, kind`,
    );

    const byEra: Record<string, number> = {};
    const byKind: Record<string, number> = {};
    let total = 0;
    for (const row of rows) {
      const count = Number(row.total ?? 0);
      total += count;
      byEra[String(row.era)] = (byEra[String(row.era)] ?? 0) + count;
      byKind[String(row.kind)] = (byKind[String(row.kind)] ?? 0) + count;
    }
    return { total, byEra, byKind };
  }

  async getEras(): Promise<Era[]> {
    const rows = await this.eras.find({ status: "active" });
    return rows
      .map((row) => rowToEra(row as unknown as Record<string, unknown>))
      .sort((a, b) => a.years.localeCompare(b.years));
  }
}
