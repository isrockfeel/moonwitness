export type ActorSource = "seed" | "api" | "import" | "migration";

export interface ActorContext {
  actorId: string | null; // null = system job (seed/cron/migration)
  source: ActorSource;
  requestId?: string; // correlation ID
}

export function createActorContext(
  actorId: string | null,
  source: ActorSource = "api",
  requestId?: string,
): ActorContext {
  return { actorId, source, requestId };
}

export const SYSTEM_ACTOR: ActorContext = createActorContext(null, "seed");
