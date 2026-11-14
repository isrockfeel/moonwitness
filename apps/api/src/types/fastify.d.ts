import "fastify";
import type { ITimelineUseCase } from "../domain/usecases/timeline/timeline.usecase";

declare module "fastify" {
  interface FastifyInstance {
    timelineUseCase: ITimelineUseCase;
  }

  interface FastifyRequest {
    user?: {
      id: number;
      username: string;
      email: string;
      role: "admin" | "editor" | "viewer";
      displayName: string;
    };
    cookies?: Record<string, string>;
  }

  interface FastifyReply {
    setCookie(name: string, value: string, options: Record<string, unknown>): this;
    clearCookie(name: string, options?: Record<string, unknown>): this;
    cookies?: Record<string, string>;
  }
}

declare module "@fastify/cookie" {
  interface CookieOptions {
    httpOnly?: boolean;
    secure?: boolean;
    sameSite?: "strict" | "lax" | "none";
    maxAge?: number;
    path?: string;
    domain?: string;
  }
}

declare module "@fastify/session" {
  interface Session {
    userId?: number;
    username?: string;
    role?: string;
  }
}
