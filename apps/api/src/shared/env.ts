import { parseEnv, z } from "@moonwitness/core";

// Membaca dari file .env root, dengan fallback ke default values
const envSchema = {
  PORT: z.string().default("3000"),
  HOST: z.string().default("0.0.0.0"),
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  API_PREFIX: z.string().default("/api/v1"),
  // Centralized root .env values
  DATABASE_URL: z.string().optional(),
};

export const env = parseEnv(envSchema);
export type Env = typeof env;