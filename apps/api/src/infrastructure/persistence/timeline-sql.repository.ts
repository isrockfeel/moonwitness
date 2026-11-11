import type {
  ITimelineRepository,
  TimelineFilters,
  TimelineStats,
} from "../../domain/usecases/timeline/timeline.repository";
import type { TimelineEvent, Era } from "@moonwitness/types";
import { getDb, SYSTEM_ACTOR } from "@moonwitness/orm";
import type { ActorContext, AuditEntry } from "@moonwitness/orm";
import { timelineEventModel, timelineEraModel } from "./timeline-model";

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

export class SqlTimelineRepository implements ITimelineRepository {
  private get eventRepo() {
    return timelineEventModel.repository;
  }

  private get eraRepo() {
    return timelineEraModel.repository;
  }

  async listEvents(filters: TimelineFilters): Promise<TimelineEvent[]> {
    const clauses: string[] = [];
    const params: unknown[] = [];

    if (this.eventRepo.softDelete) {
      clauses.push("status != 'deleted'");
    }
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

    const where = clauses.length ? ` WHERE ${clauses.join(" AND ")}` : "";
    const limit = filters.limit ?? 100;
    const offset = filters.offset ?? 0;

    const rows = await getDb().all<Record<string, unknown>>(
      `SELECT * FROM ${this.eventRepo.table}${where} ORDER BY date ASC, id ASC LIMIT ? OFFSET ?`,
      [...params, limit, offset],
    );
    return rows.map(rowToEvent);
  }

  async countEvents(filters: TimelineFilters): Promise<number> {
    const clauses: string[] = [];
    const params: unknown[] = [];

    if (this.eventRepo.softDelete) {
      clauses.push("status != 'deleted'");
    }
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

    const where = clauses.length ? ` WHERE ${clauses.join(" AND ")}` : "";
    const row = await getDb().get<{ total: number }>(
      `SELECT COUNT(*) AS total FROM ${this.eventRepo.table}${where}`,
      params,
    );
    return Number(row?.total ?? 0);
  }

  async getEvent(id: string): Promise<TimelineEvent | null> {
    const row = await this.eventRepo.findOne(id);
    if (!row) return null;
    return rowToEvent(row as unknown as Record<string, unknown>);
  }

  async getStats(): Promise<TimelineStats> {
    const rows = await getDb().all<Record<string, unknown>>(
      `SELECT era, kind, COUNT(*) AS total FROM ${this.eventRepo.table}
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
    const rows = await this.eraRepo.find({ status: "active" });
    return rows.map((row) => rowToEra(row as unknown as Record<string, unknown>));
  }

  async createEvent(
    data: Omit<TimelineEvent, "id"> & { id?: string },
    actor: ActorContext = SYSTEM_ACTOR,
  ): Promise<TimelineEvent> {
    const created = await this.eventRepo.create(
      {
        ...data,
        tags: data.tags ?? [],
        sources: data.sources ?? 0,
        notes: data.notes ?? 0,
        related: data.related ?? [],
      },
      actor,
    );
    return rowToEvent(created as unknown as Record<string, unknown>);
  }

  async updateEvent(
    id: string,
    data: Partial<TimelineEvent> & { version?: number },
    actor: ActorContext = SYSTEM_ACTOR,
  ): Promise<TimelineEvent | null> {
    const updated = await this.eventRepo.update(id, data as Record<string, unknown>, actor);
    if (!updated) return null;
    return rowToEvent(updated as unknown as Record<string, unknown>);
  }

  async deleteEvent(id: string, actor: ActorContext = SYSTEM_ACTOR): Promise<boolean> {
    const deleted = await this.eventRepo.delete(id, actor);
    return deleted !== null;
  }

  async getEventHistory(id: string): Promise<AuditEntry[]> {
    return this.eventRepo.history(id);
  }
}
