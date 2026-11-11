import "fastify";
import type { ITimelineUseCase } from "../domain/usecases/timeline/timeline.usecase";

declare module "fastify" {
  interface FastifyInstance {
    timelineUseCase: ITimelineUseCase;
  }
}
