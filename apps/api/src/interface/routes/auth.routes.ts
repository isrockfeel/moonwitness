/**
 * Authentication routes
 * Handles login, logout, and session verification
 */

import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import rateLimit from "@fastify/rate-limit";
import { createSession, getSessionWithUser, revokeSession } from "../../services/session";
import { findUserByUsername, findUserByEmail, verifyUserPassword } from "../../services/user";

export async function authRoutes(fastify: FastifyInstance) {
  // Rate limiting for auth endpoints
  await fastify.register(async (authScope) => {
    await authScope.register(rateLimit, {
      max: 10,
      timeWindow: 60000,
      keyGenerator: (request) => {
        const forwarded = request.headers["x-forwarded-for"];
        if (typeof forwarded === "string" && forwarded.length > 0) {
          return forwarded.split(",")[0]!.trim();
        }
        return request.ip;
      },
      errorResponseBuilder: () => ({
        statusCode: 429,
        error: "Too Many Requests",
        message: "terlalu banyak percobaan; coba lagi nanti",
      }),
    });

    // POST /api/v1/auth/login
    authScope.post("/auth/login", async (request: FastifyRequest, reply: FastifyReply) => {
      const { identifier, password } = request.body as { identifier?: string; password?: string };

      if (!identifier || !password) {
        return reply.code(400).send({
          error: "Bad Request",
          message: "Username/email dan password wajib diisi",
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

      // Set session cookie
      const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax" as const,
        maxAge: Math.floor(7 * 24 * 60 * 60), // 7 days in seconds
        path: "/",
      };

      reply.setCookie("mw_session", sessionId, cookieOptions);

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
      const sessionId = request.cookies?.mw_session;
      if (sessionId) {
        await revokeSession(sessionId);
      }

      reply.clearCookie("mw_session", { path: "/" });
      return reply.send({ ok: true });
    });

    // GET /api/v1/auth/me
    authScope.get("/auth/me", async (request: FastifyRequest, reply: FastifyReply) => {
      const sessionId = request.cookies?.mw_session;
      if (!sessionId) {
        return reply.code(401).send({ error: "Not authenticated" });
      }

      const session = await getSessionWithUser(sessionId);
      if (!session) {
        reply.clearCookie("mw_session", { path: "/" });
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
