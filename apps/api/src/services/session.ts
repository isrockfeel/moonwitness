/**
 * Session management service
 * Handles session creation, validation, and revocation
 */

import { SESSION_COOKIE_NAME } from "../shared/auth";
import { getDb } from "@moonwitness/orm";

export interface SessionData {
  id: string;
  userId: number;
  createdAt: Date;
  expiresAt: Date;
  revoked: boolean;
}

export interface SessionWithUser {
  session: SessionData;
  userId: number;
  username: string;
  email: string;
  role: "admin" | "editor" | "viewer";
  displayName: string;
}

export async function createSession(userId: number): Promise<string> {
  const db = getDb();
  const sessionId = crypto.randomUUID();
  const now = new Date();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  await db.run(
    `INSERT INTO sessions (id, user_id, created_at, expires_at, revoked)
     VALUES (?, ?, ?, ?, 0)`,
    [sessionId, userId, now.toISOString(), expiresAt.toISOString()],
  );

  return sessionId;
}

export async function getSession(sessionId: string): Promise<SessionData | null> {
  const db = getDb();
  const row = await db.get(
    `SELECT id, user_id, created_at, expires_at, revoked
     FROM sessions WHERE id = ?`,
    [sessionId],
  );
  if (!row) return null;
  return {
    id: row.id as string,
    userId: row.user_id as number,
    createdAt: new Date(row.created_at as string),
    expiresAt: new Date(row.expires_at as string),
    revoked: Boolean(row.revoked),
  };
}

export async function getSessionWithUser(sessionId: string): Promise<SessionWithUser | null> {
  const session = await getSession(sessionId);
  if (!session || session.revoked || session.expiresAt < new Date()) {
    return null;
  }

  const db = getDb();
  const user = await db.get(
    `SELECT id, username, email, role, display_name
     FROM users WHERE id = ?`,
    [session.userId],
  );
  if (!user) return null;

  return {
    session,
    userId: user.id as number,
    username: user.username as string,
    email: user.email as string,
    role: user.role as "admin" | "editor" | "viewer",
    displayName: user.display_name as string,
  };
}

export async function revokeSession(sessionId: string): Promise<void> {
  const db = getDb();
  await db.run(`UPDATE sessions SET revoked = 1 WHERE id = ?`, [sessionId]);
}

export async function revokeAllUserSessions(userId: number): Promise<void> {
  const db = getDb();
  await db.run(`UPDATE sessions SET revoked = 1 WHERE user_id = ?`, [userId]);
}

export async function cleanupExpiredSessions(): Promise<number> {
  const db = getDb();
  const result = await db.run(`DELETE FROM sessions WHERE expires_at < ? OR revoked = 1`, [
    new Date().toISOString(),
  ]);
  return result.rowsAffected;
}

export function getSessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge: Math.floor(7 * 24 * 60 * 60), // 7 days in seconds
    path: "/",
  };
}

export { SESSION_COOKIE_NAME };
export const getSessionMaxAgeMs = () => 7 * 24 * 60 * 60 * 1000;
