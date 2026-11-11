import type { TimelineEvent, Era } from "@moonwitness/types";

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
  listEvents(_filters: TimelineFilters): Promise<TimelineEvent[]>;
  countEvents(_filters: TimelineFilters): Promise<number>;
  getEvent(_id: string): Promise<TimelineEvent | null>;
  getStats(): Promise<TimelineStats>;
  getEras(): Promise<Era[]>;
}
