/**
 * Authentication routes
 * Handles login, logout, and session verification
 */

import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import rateLimit from "@fastify/rate-limit";
import {
  createSession,
  getSessionCookieOptions,
  getSessionWithUser,
  revokeSession,
  SESSION_COOKIE_NAME,
} from "../../services/session";
import { findUserByUsername, findUserByEmail, verifyUserPassword } from "../../services/user";

export async function authRoutes(fastify: FastifyInstance) {
  // Rate limiting for auth endpoints
  await fastify.register(async (authScope) => {
    await authScope.register(rateLimit, {
      max: 10,
      timeWindow: 60000,
      keyGenerator: (request) => request.ip,
      errorResponseBuilder: () => ({
        statusCode: 429,
        error: "Too Many Requests",
        message: "terlalu banyak percobaan; coba lagi nanti",
      }),
    });
    authScope.addHook("onSend", async (_request, reply, payload) => {
      reply.header("cache-control", "no-store");
      return payload;
    });

    // POST /api/v1/auth/login
    authScope.post("/auth/login", async (request: FastifyRequest, reply: FastifyReply) => {
      const body = request.body as { identifier?: unknown; password?: unknown } | null;
      const identifier = body?.identifier;
      const password = body?.password;

      if (
        typeof identifier !== "string" ||
        typeof password !== "string" ||
        !identifier.trim() ||
        !password ||
        Buffer.byteLength(password, "utf8") > 72
      ) {
        return reply.code(400).send({
          error: "Bad Request",
          message: "Username/email dan password wajib valid",
        });
      }

      const identifierStr = identifier.trim().toLowerCase();
      const user =
        (await findUserByUsername(identifierStr)) || (await findUserByEmail(identifierStr));

      if (!user) {
        // Generic error to prevent user enumeration
        return reply.code(401).send({
          error: "Unauthorized",
          message: "Identitas atau kata sandi salah",
        });
      }

      const valid = await verifyUserPassword(user, password);
      if (!valid) {
        return reply.code(401).send({
          error: "Unauthorized",
          message: "Identitas atau kata sandi salah",
        });
      }

      // Create session
      const sessionId = await createSession(user.id);
      reply.setCookie(SESSION_COOKIE_NAME, sessionId, getSessionCookieOptions());

      return reply.send({
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          displayName: user.displayName,
        },
      });
    });

    // POST /api/v1/auth/logout
    authScope.post("/auth/logout", async (request: FastifyRequest, reply: FastifyReply) => {
      const sessionId = request.cookies?.[SESSION_COOKIE_NAME];
      if (sessionId) {
        await revokeSession(sessionId);
      }

      reply.clearCookie(SESSION_COOKIE_NAME, { path: "/" });
      return reply.send({ ok: true });
    });

    // GET /api/v1/auth/me
    authScope.get("/auth/me", async (request: FastifyRequest, reply: FastifyReply) => {
      const sessionId = request.cookies?.[SESSION_COOKIE_NAME];
      if (!sessionId) {
        return reply.code(401).send({ error: "Not authenticated" });
      }

      const session = await getSessionWithUser(sessionId);
      if (!session) {
        reply.clearCookie(SESSION_COOKIE_NAME, { path: "/" });
        return reply.code(401).send({ error: "Session expired or invalid" });
      }

      return reply.send({
        user: {
          id: session.userId,
          username: session.username,
          email: session.email,
          role: session.role,
          displayName: session.displayName,
        },
      });
    });
  });
}
