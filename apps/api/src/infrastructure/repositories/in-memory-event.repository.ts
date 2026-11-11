import type { ITimelineRepository } from "../../domain/usecases/timeline/timeline.repository";
import type { TimelineEvent, Era } from "@moonwitness/types";
import type {
  TimelineFilters,
  TimelineStats,
} from "../../domain/usecases/timeline/timeline.repository";

export interface IEventDataSource {
  listEvents(_filters: TimelineFilters): Promise<TimelineEvent[]>;
  countEvents(_filters: TimelineFilters): Promise<number>;
  getEvent(_id: string): Promise<TimelineEvent | null>;
  getStats(): Promise<TimelineStats>;
  getEras(): Promise<Era[]>;
}

export class EventDataSource implements IEventDataSource {
  constructor(private readonly repository: ITimelineRepository) {}

  async listEvents(filters: TimelineFilters): Promise<TimelineEvent[]> {
    return this.repository.listEvents(filters);
  }

  async countEvents(filters: TimelineFilters): Promise<number> {
    return this.repository.countEvents(filters);
  }

  async getEvent(id: string): Promise<TimelineEvent | null> {
    return this.repository.getEvent(id);
  }

  async getStats(): Promise<TimelineStats> {
    return this.repository.getStats();
  }

  async getEras(): Promise<Era[]> {
    return this.repository.getEras();
  }
}

export class InMemoryEventRepository implements ITimelineRepository {
  private events: TimelineEvent[] = [];
  private eras: Era[] = [];

  setEvents(events: TimelineEvent[]): void {
    this.events = events;
  }

  setEras(eras: Era[]): void {
    this.eras = eras;
  }

  async listEvents(filters: TimelineFilters): Promise<TimelineEvent[]> {
    let result = [...this.events];

    if (filters.era) {
      result = result.filter((e) => e.era === filters.era);
    }
    if (filters.kind) {
      result = result.filter((e) => e.kind === filters.kind);
    }
    if (filters.from) {
      result = result.filter((e) => e.date >= filters.from!);
    }
    if (filters.to) {
      result = result.filter((e) => e.date <= filters.to!);
    }

    const offset = filters.offset ?? 0;
    const limit = filters.limit ?? result.length;
    return result.slice(offset, offset + limit);
  }

  async countEvents(filters: TimelineFilters): Promise<number> {
    let result = [...this.events];

    if (filters.era) {
      result = result.filter((e) => e.era === filters.era);
    }
    if (filters.kind) {
      result = result.filter((e) => e.kind === filters.kind);
    }
    if (filters.from) {
      result = result.filter((e) => e.date >= filters.from!);
    }
    if (filters.to) {
      result = result.filter((e) => e.date <= filters.to!);
    }

    return result.length;
  }

  async getEvent(id: string): Promise<TimelineEvent | null> {
    return this.events.find((e) => e.id === id) || null;
  }

  async getStats(): Promise<TimelineStats> {
    const byEra: Record<string, number> = {};
    const byKind: Record<string, number> = {};

    for (const event of this.events) {
      byEra[event.era] = (byEra[event.era] || 0) + 1;
      byKind[event.kind] = (byKind[event.kind] || 0) + 1;
    }

    return {
      total: this.events.length,
      byEra,
      byKind,
    };
  }

  async getEras(): Promise<Era[]> {
    return this.eras;
  }
}
