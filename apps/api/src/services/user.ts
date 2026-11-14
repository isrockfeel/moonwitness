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

  const passwordBytes = Buffer.byteLength(input.password, "utf8");
  if (passwordBytes < 12 || passwordBytes > 72) {
    throw new Error("Password must be between 12 and 72 UTF-8 bytes");
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

export async function seedBootstrapAdmin(): Promise<void> {
  const db = getDb();
  const existing = await db.get("SELECT COUNT(*) as count FROM users");
  if ((existing as { count: number }).count > 0) {
    return;
  }

  const username = process.env.MW_BOOTSTRAP_ADMIN_USERNAME?.trim();
  const email = process.env.MW_BOOTSTRAP_ADMIN_EMAIL?.trim();
  const password = process.env.MW_BOOTSTRAP_ADMIN_PASSWORD;
  const displayName = process.env.MW_BOOTSTRAP_ADMIN_DISPLAY_NAME?.trim();
  const configuredValues = [username, email, password];

  if (configuredValues.every((value) => !value)) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("Set MW_BOOTSTRAP_ADMIN_USERNAME, EMAIL, and PASSWORD before first boot");
    }
    return;
  }

  if (configuredValues.some((value) => !value)) {
    throw new Error("MW_BOOTSTRAP_ADMIN_USERNAME, EMAIL, and PASSWORD must be set together");
  }

  await createUser({
    username: username!.toLowerCase(),
    email: email!.toLowerCase(),
    password: password!,
    role: "admin",
    displayName: displayName || username!,
  });
}
