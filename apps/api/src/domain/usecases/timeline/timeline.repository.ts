import type { TimelineEvent, Era } from "@moonwitness/types";
import type { ActorContext, AuditEntry } from "@moonwitness/orm";

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
  listEvents(filters: TimelineFilters): Promise<TimelineEvent[]>;
  countEvents(filters: TimelineFilters): Promise<number>;
  getEvent(id: string): Promise<TimelineEvent | null>;
  getStats(): Promise<TimelineStats>;
  getEras(): Promise<Era[]>;
  createEvent(
    data: Omit<TimelineEvent, "id"> & { id?: string },
    actor?: ActorContext,
  ): Promise<TimelineEvent>;
  updateEvent(
    id: string,
    data: Partial<TimelineEvent> & { version?: number },
    actor?: ActorContext,
  ): Promise<TimelineEvent | null>;
  deleteEvent(id: string, actor?: ActorContext): Promise<boolean>;
  getEventHistory(id: string): Promise<AuditEntry[]>;
}
