import { defineModel } from "@moonwitness/orm";
import { z } from "zod";

export const UserSchema = z.object({
  username: z.string().min(3).max(64),
  email: z.string().email(),
  passwordHash: z.string().min(1),
  role: z.enum(["user", "admin", "editor", "viewer"]).default("user"),
  avatarSeed: z.string().default("WITNESS"),
  avatarOptions: z
    .object({
      palette: z.enum(["street", "moon", "acid", "signal"]).default("street"),
      background: z.enum(["ink", "paper", "transparent"]).default("ink"),
      radius: z.number().default(18),
      halftone: z.boolean().default(true),
      crown: z.boolean().default(true),
      moon: z.boolean().default(true),
      tape: z.boolean().default(false),
    })
    .default({
      palette: "street",
      background: "ink",
      radius: 18,
      halftone: true,
      crown: true,
      moon: true,
      tape: false,
    }),
});

export const userModel = defineModel({
  name: "auth.user",
  table: "users",
  schema: UserSchema,
  softDelete: true,
  indexes: [
    { fields: ["email"], unique: true },
    { fields: ["username"], unique: true },
    { fields: ["role"] },
  ],
});

export const SessionSchema = z.object({
  userId: z.string().min(1),
  token: z.string().min(1),
  expiresAt: z.string().min(1),
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
});

export const sessionModel = defineModel({
  name: "auth.session",
  table: "sessions",
  schema: SessionSchema,
  softDelete: true,
  indexes: [
    { fields: ["token"], unique: true },
    { fields: ["userId"] },
  ],
});

export type UserRecord = (typeof userModel)["type"];
export type SessionRecord = (typeof sessionModel)["type"];
export const userDdl = userModel.ddl;
export const sessionDdl = sessionModel.ddl;

