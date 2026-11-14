/**
 * Authentication middleware
 * Validates session cookie and attaches user to request
 */

import type { FastifyRequest, FastifyReply } from "fastify";
import { getSessionWithUser } from "../services/session";

export interface AuthenticatedRequest extends FastifyRequest {
  user?: {
    id: number;
    username: string;
    email: string;
    role: "admin" | "editor" | "viewer";
    displayName: string;
  };
}

export async function authMiddleware(request: FastifyRequest, reply: FastifyReply) {
  const sessionId = request.cookies?.mw_session;
  if (!sessionId) {
    return reply.code(401).send({ error: "Not authenticated" });
  }

  const session = await getSessionWithUser(sessionId);
  if (!session) {
    reply.clearCookie("mw_session", { path: "/" });
    return reply.code(401).send({ error: "Session expired or invalid" });
  }

  const typedReq = request as AuthenticatedRequest;
  typedReq.user = {
    id: session.userId,
    username: session.username,
    email: session.email,
    role: session.role,
    displayName: session.displayName,
  };
}

export function requireAuth() {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const sessionId = request.cookies?.mw_session;
    if (!sessionId) {
      return reply.code(401).send({ error: "Not authenticated" });
    }

    const session = await getSessionWithUser(sessionId);
    if (!session) {
      reply.clearCookie("mw_session", { path: "/" });
      return reply.code(401).send({ error: "Session expired or invalid" });
    }

    const typedReq = request as AuthenticatedRequest;
    typedReq.user = {
      id: session.userId,
      username: session.username,
      email: session.email,
      role: session.role,
      displayName: session.displayName,
    };
  };
}

export function requireRole(...allowedRoles: ("admin" | "editor" | "viewer")[]) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const sessionId = request.cookies?.mw_session;
    if (!sessionId) {
      return reply.code(401).send({ error: "Not authenticated" });
    }

    const session = await getSessionWithUser(sessionId);
    if (!session) {
      reply.clearCookie("mw_session", { path: "/" });
      return reply.code(401).send({ error: "Session expired or invalid" });
    }

    if (!allowedRoles.includes(session.role)) {
      return reply.code(403).send({ error: "Forbidden: insufficient permissions" });
    }

    const typedReq = request as AuthenticatedRequest;
    typedReq.user = {
      id: session.userId,
      username: session.username,
      email: session.email,
      role: session.role,
      displayName: session.displayName,
    };
  };
}

export function optionalAuth() {
  return async (request: FastifyRequest, _reply: FastifyReply) => {
    const sessionId = request.cookies?.mw_session;
    if (!sessionId) return;

    const session = await getSessionWithUser(sessionId);
    if (session) {
      const typedReq = request as AuthenticatedRequest;
      typedReq.user = {
        id: session.userId,
        username: session.username,
        email: session.email,
        role: session.role,
        displayName: session.displayName,
      };
    }
  };
}
