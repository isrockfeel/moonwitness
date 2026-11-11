import type { FastifyRequest, FastifyReply } from "fastify";
import type {
  ITimelineUseCase,
  ListTimelineEventsRequest,
} from "../../domain/usecases/timeline/timeline.usecase";
import type { Result } from "@moonwitness/core";
import { SYSTEM_ACTOR } from "@moonwitness/orm";
import type { ActorContext } from "@moonwitness/orm";

/**
 * Public read-only timeline endpoints.
 *
 * Actor identity is not derived from the untrusted `x-actor-id` header.
 * Reads are anonymous; the actor context is informational only and is
 * never used to grant privileges.
 */
export class TimelineController {
  constructor(private readonly _timelineUseCase: ITimelineUseCase) {}

  private getActor(request: FastifyRequest): ActorContext {
    // Use actor from request (set by authMiddleware), fallback to SYSTEM_ACTOR
    return (request as any).actor ?? SYSTEM_ACTOR;
  }

  async listEvents(
    request: FastifyRequest<{ Querystring: ListTimelineEventsRequest }>,
    reply: FastifyReply,
  ) {
    const result = await this._timelineUseCase.listEvents(request.query, this.getActor(request));
    return this.handleResult(result, reply);
  }

  async getEvent(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const result = await this._timelineUseCase.getEvent(request.params.id, this.getActor(request));
    return this.handleResult(result, reply);
  }

  async getStats(reply: FastifyReply) {
    const result = await this._timelineUseCase.getStats(this.getActor(reply.request));
    return this.handleResult(result, reply);
  }

  async getEras(reply: FastifyReply) {
    const result = await this._timelineUseCase.getEras(this.getActor(reply.request));
    return this.handleResult(result, reply);
  }

  private handleResult<T>(result: Result<T, Error>, reply: FastifyReply): FastifyReply {
    if (result.ok) {
      return reply.code(200).send(result.value);
    }

    const status =
      result.error instanceof Error &&
      "code" in result.error &&
      (result.error as { code: string }).code === "NOT_FOUND_ERROR"
        ? 404
        : 500;

    return reply.code(status).send({ error: result.error.message });
  }
}
