/**
 * User management service
 * Handles user storage, retrieval, and password verification
 */

import { hashPassword, verifyPassword } from "../shared/auth";
import { getDb } from "@moonwitness/orm";

export interface User {
  id: number;
  username: string;
  email: string;
  passwordHash: string;
  role: "admin" | "editor" | "viewer";
  displayName: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserInput {
  username: string;
  email: string;
  password: string;
  role: "admin" | "editor" | "viewer";
  displayName: string;
}

export interface UserPublic {
  id: number;
  username: string;
  email: string;
  role: "admin" | "editor" | "viewer";
  displayName: string;
}

function toPublicUser(user: User): UserPublic {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
    displayName: user.displayName,
  };
}

function mapUserRow(row: Record<string, unknown>): User {
  return {
    id: Number(row.id),
    username: String(row.username),
    email: String(row.email),
    passwordHash: String(row.password_hash),
    role: row.role as User["role"],
    displayName: String(row.display_name),
    createdAt: new Date(String(row.created_at)),
    updatedAt: new Date(String(row.updated_at)),
  };
}

export async function createUser(input: CreateUserInput): Promise<UserPublic> {
  if (!["admin", "editor", "viewer"].includes(input.role)) {
    throw new Error("Invalid role: " + input.role);
  }

  const passwordHash = await hashPassword(input.password);
  const db = getDb();

  const result = await db.run(
    "INSERT INTO users (username, email, password_hash, role, display_name) VALUES (?, ?, ?, ?, ?)",
    [input.username, input.email, passwordHash, input.role, input.displayName],
  );

  const user = await db.get<Record<string, unknown>>(
    "SELECT id, username, email, password_hash, role, display_name, created_at, updated_at FROM users WHERE id = ?",
    [result.lastInsertRowid],
  );

  if (!user) {
    throw new Error("Failed to create user");
  }

  return toPublicUser(mapUserRow(user));
}

export async function findUserByUsername(username: string): Promise<User | null> {
  const db = getDb();
  const user = await db.get<Record<string, unknown>>(
    "SELECT id, username, email, password_hash, role, display_name, created_at, updated_at FROM users WHERE username = ?",
    [username],
  );
  return user ? mapUserRow(user) : null;
}

export async function findUserByEmail(email: string): Promise<User | null> {
  const db = getDb();
  const user = await db.get<Record<string, unknown>>(
    "SELECT id, username, email, password_hash, role, display_name, created_at, updated_at FROM users WHERE email = ?",
    [email],
  );
  return user ? mapUserRow(user) : null;
}

export async function findUserById(id: number): Promise<User | null> {
  const db = getDb();
  const user = await db.get<Record<string, unknown>>(
    "SELECT id, username, email, password_hash, role, display_name, created_at, updated_at FROM users WHERE id = ?",
    [id],
  );
  return user ? mapUserRow(user) : null;
}

export async function verifyUserPassword(user: User, password: string): Promise<boolean> {
  return verifyPassword(password, user.passwordHash);
}

export async function getUserPublic(user: User) {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
    displayName: user.displayName,
  };
}

export async function seedDemoUsers(): Promise<void> {
  const db = getDb();
  const existing = await db.get("SELECT COUNT(*) as count FROM users");
  if ((existing as { count: number }).count > 0) {
    return; // Already seeded
  }

  const demoUsers = [
    {
      username: "admin",
      email: "admin@moon.world",
      password: "admin123",
      role: "admin" as const,
      displayName: "Empire Admin",
    },
    {
      username: "witness",
      email: "witness@moon.world",
      password: "moonwalk",
      role: "editor" as const,
      displayName: "Chief Witness",
    },
    {
      username: "observer",
      email: "observer@moon.world",
      password: "lookonly",
      role: "viewer" as const,
      displayName: "Signal Observer",
    },
  ];

  for (const user of demoUsers) {
    await createUser(user);
  }
}
