/**
 * Password hashing and verification utilities
 * Uses bcrypt with configurable cost factor
 */

import bcrypt from "bcrypt";

const BCRYPT_COST = Number(process.env.BCRYPT_COST ?? "12");

/**
 * Hash a plaintext password
 */
export async function hashPassword(plaintext: string): Promise<string> {
  return bcrypt.hash(plaintext, BCRYPT_COST);
}

/**
 * Verify a plaintext password against a bcrypt hash
 */
export async function verifyPassword(plaintext: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plaintext, hash);
}

/**
 * Generate a cryptographically secure session ID
 */
export function generateSessionId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Generate a secure random token
 */
export function generateToken(length = 32): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Session cookie options for HTTP-only, secure cookies
 */
export function getSessionCookieOptions(maxAgeMs: number): Record<string, unknown> {
  const isProduction = process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    maxAge: Math.floor(maxAgeMs / 1000),
    path: "/",
  };
}

/**
 * Session expiry from env (default 7 days)
 */
export function getSessionMaxAgeMs(): number {
  const days = Number(process.env.SESSION_MAX_AGE_DAYS ?? "7");
  return days * 24 * 60 * 60 * 1000;
}

/**
 * Cookie name for session
 */
export const SESSION_COOKIE_NAME = "mw_session";
