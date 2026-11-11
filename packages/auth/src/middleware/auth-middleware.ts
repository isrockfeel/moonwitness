import type { FastifyRequest, FastifyReply } from "fastify";
import type { JwtVerifyResult, Payload } from "@moonwitness/auth/jwt";
import { verifyJwt } from "@moonwitness/auth/jwt";

/** Minimal actor context attached to the request by the auth middleware. */
export interface ActorContext {
  actorId: string | null;
  source: "seed" | "api" | "import" | "migration";
  requestId: string;
}

/**
 * JWT secret - should be injected at runtime to avoid circular dependency
 */
let jwtSecret: string = "development-secret";

export function setJwtSecret(secret: string): void {
  jwtSecret = secret;
}

/**
 * Extract Bearer token from Authorization header
 */
export function extractBearerToken(request: FastifyRequest): string | null {
  const authHeader = request.headers.authorization;
  if (!authHeader) return null;

  const [scheme, token] = authHeader.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) {
    return null;
  }
  return token;
}

/**
 * Generate or extract request ID for correlation
 */
export function getRequestId(request: FastifyRequest): string {
  return request.headers["x-request-id"] as string ?? crypto.randomUUID();
}

/**
 * Build ActorContext from JWT payload
 */
export function buildActorContext(
  payload: Payload | null | undefined,
  requestId: string,
  source: ActorContext["source"] = "api",
): ActorContext {
  return {
    actorId: payload?.userId ?? null,
    source,
    requestId,
  };
}

/**
 * Fastify hook to extract and verify JWT, attach actor to request
 * This should be registered before routes that need authentication
 */
export async function authMiddleware(
  request: FastifyRequest,
  _reply: FastifyReply,
): Promise<void> {
  const requestId = getRequestId(request);
  const token = extractBearerToken(request);

  let actor: ActorContext;

  if (token) {
    try {
      const result = await verifyJwt(token, jwtSecret);

      if (result.success && result.payload) {
        actor = buildActorContext(result.payload, requestId);
      } else {
        // Invalid token - treat as unauthenticated
        actor = buildActorContext(null, requestId);
      }
    } catch {
      // JWT verification failed - treat as unauthenticated
      actor = buildActorContext(null, requestId);
    }
  } else {
    // No token - treat as unauthenticated
    actor = buildActorContext(null, requestId);
  }

  // Attach actor to request for downstream use
  // Using type assertion since Fastify doesn't know about this custom property
  (request as any).actor = actor;
}

/**
 * Get ActorContext from request (type-safe accessor)
 */
export function getActorFromRequest(request: FastifyRequest): ActorContext {
  return (request as any).actor ?? {
    actorId: null,
    source: "api",
    requestId: getRequestId(request),
  };
}

/**
 * Middleware that requires authentication
 * Use this to protect routes that need a valid JWT
 */
export async function requireAuth(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const actor = getActorFromRequest(request);

  if (!actor.actorId) {
    await reply.code(401).send({
      error: "Unauthorized",
      message: "Valid JWT token required",
    });
  }
}