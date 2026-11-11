import type { TimelineEvent, Era } from "@moonwitness/types";
import type { TimelineStats } from "./timeline.repository";
import type { Result } from "@moonwitness/core";
import { ok, err } from "@moonwitness/core";
import { NotFoundError } from "../../errors";
import type { ActorContext } from "@moonwitness/orm";
import { SYSTEM_ACTOR } from "@moonwitness/orm";

export interface ListTimelineEventsRequest {
  era?: string;
  kind?: string;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
}

export interface ListTimelineEventsResponse {
  data: TimelineEvent[];
  total: number;
}

export interface GetTimelineEventResponse {
  data: TimelineEvent;
}

export interface GetTimelineStatsResponse {
  data: TimelineStats;
}

export interface GetTimelineErasResponse {
  data: Era[];
}

export interface ITimelineUseCase {
  listEvents(
    request: ListTimelineEventsRequest,
    _actor: ActorContext,
  ): Promise<Result<ListTimelineEventsResponse, Error>>;
  getEvent(id: string, _actor: ActorContext): Promise<Result<GetTimelineEventResponse, Error>>;
  getStats(_actor: ActorContext): Promise<Result<GetTimelineStatsResponse, Error>>;
  getEras(_actor: ActorContext): Promise<Result<GetTimelineErasResponse, Error>>;
}

export class TimelineUseCase implements ITimelineUseCase {
  constructor(private readonly repository: import("./timeline.repository").ITimelineRepository) {}

  async listEvents(
    request: ListTimelineEventsRequest,
    _actor: ActorContext = SYSTEM_ACTOR,
  ): Promise<Result<ListTimelineEventsResponse, Error>> {
    const [data, total] = await Promise.all([
      this.repository.listEvents(request),
      this.repository.countEvents(request),
    ]);
    return ok({ data, total });
  }

  async getEvent(
    id: string,
    _actor: ActorContext = SYSTEM_ACTOR,
  ): Promise<Result<GetTimelineEventResponse, Error>> {
    const event = await this.repository.getEvent(id);
    if (!event) {
      return err(new NotFoundError("TimelineEvent", id));
    }
    return ok({ data: event });
  }

  async getStats(
    _actor: ActorContext = SYSTEM_ACTOR,
  ): Promise<Result<GetTimelineStatsResponse, Error>> {
    const stats = await this.repository.getStats();
    return ok({ data: stats });
  }

  async getEras(
    _actor: ActorContext = SYSTEM_ACTOR,
  ): Promise<Result<GetTimelineErasResponse, Error>> {
    const eras = await this.repository.getEras();
    return ok({ data: eras });
  }
}
