/**
 * Authentication and Authorization domain types
 * Server-side only - never exposed to client bundle
 */

export type CrewRole = "admin" | "editor" | "viewer";

export interface CrewAccount {
  id: string;
  username: string;
  email: string;
  passwordHash: string; // bcrypt hash, never plaintext
  role: CrewRole;
  displayName: string;
  createdAt: number;
  updatedAt: number;
  lastLoginAt?: number;
  failedLoginAttempts: number;
  lockedUntil?: number;
}

export interface Session {
  id: string;
  accountId: string;
  createdAt: number;
  expiresAt: number;
  ipAddress?: string;
  userAgent?: string;
  revokedAt?: number;
}

export interface AuthResult {
  ok: true;
  account: CrewAccount;
  session: Session;
}

export interface AuthFailure {
  ok: false;
  field: "identifier" | "password" | "credentials" | "locked" | "revoked";
  message: string;
}

export type AuthOutcome = AuthResult | AuthFailure;

export type SessionValidationResult =
  | {
      ok: true;
      account: CrewAccount;
      session: Session;
    }
  | {
      ok: false;
      reason: "expired" | "revoked" | "not_found" | "invalid";
      message: string;
    };

export interface RegisterAccountInput {
  username: string;
  email: string;
  password: string;
  role: "admin" | "editor" | "viewer";
  displayName: string;
}

export interface UpdateAccountInput {
  id: string;
  email?: string;
  displayName?: string;
  role?: "admin" | "editor" | "viewer";
  password?: string; // optional password change
}
