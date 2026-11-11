import type { FastifyRequest, FastifyReply } from "fastify";
import type {
  ITimelineUseCase,
  ListTimelineEventsRequest,
} from "../domain/usecases/timeline/timeline.usecase";
import type { Result } from "@moonwitness/core";
import { DomainError, ValidationError, NotFoundError, UnauthorizedError, ForbiddenError, ConflictError, TimeoutError } from "@moonwitness/errors";
import type { ActorContext } from "@moonwitness/orm";
import { SYSTEM_ACTOR } from "@moonwitness/orm";

export class TimelineController {
  constructor(private readonly timelineUseCase: ITimelineUseCase) {}

  async listEvents(
    request: FastifyRequest<{ Querystring: ListTimelineEventsRequest }>,
    reply: FastifyReply,
  ) {
    // Extract actor from request - in production this would come from JWT middleware
    const actorId = (request.headers["x-actor-id"] as string | null) ?? null;
    const actor: ActorContext = actorId !== null
      ? { actorId, source: "api", requestId: request.id }
      : SYSTEM_ACTOR;

    const result = await this.timelineUseCase.listEvents(request.query, actor);
    return this.handleResult(result, reply);
  }

  async getEvent(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply,
  ) {
    // Extract actor from request
    const actorId = (request.headers["x-actor-id"] as string | null) ?? null;
    const actor: ActorContext = actorId !== null
      ? { actorId, source: "api", requestId: request.id }
      : SYSTEM_ACTOR;

    const result = await this.timelineUseCase.getEvent(request.params.id, actor);
    return this.handleResult(result, reply);
  }

  async getStats(reply: FastifyReply) {
    // Extract actor from request
    const actorId = (request.headers["x-actor-id"] as string | null) ?? null;
    const actor: ActorContext = actorId !== null
      ? { actorId, source: "api", requestId: request.id }
      : SYSTEM_ACTOR;

    const result = await this.timelineUseCase.getStats(actor);
    return this.handleResult(result, reply);
  }

  async getEras(reply: FastifyReply) {
    // Extract actor from request
    const actorId = (request.headers["x-actor-id"] as string | null) ?? null;
    const actor: ActorContext = actorId !== null
      ? { actorId, source: "api", requestId: request.id }
      : SYSTEM_ACTOR;

    const result = await this.timelineUseCase.getEras(actor);
    return this.handleResult(result, reply);
  }

  private handleResult<T>(
    result: Result<T, Error>,
    reply: FastifyReply,
  ): FastifyReply {
    if (result.ok) {
      return reply.code(200).send(result.value);
    }

    if (result.error instanceof DomainError) {
      const status = this.getStatusForError(result.error);
      return reply.code(status).send({ error: result.error.message });
    }

    return reply.code(500).send({ error: "Internal server error" });
  }

  private getStatusForError(error: DomainError): number {
    switch (error.code) {
      case "NOT_FOUND_ERROR":
        return 404;
      case "UNAUTHORIZED_ERROR":
        return 401;
      case "VALIDATION_ERROR":
        return 400;
      default:
        return 500;
    }
  }
}