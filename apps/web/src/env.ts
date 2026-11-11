import { parseEnv, z } from "@moonwitness/core";

// Membaca dari file .env root di workspace
const envSchema = {
  // API Configuration
  API_PREFIX: z.string().default("/api/v1"),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),

  // Server Configuration
  PORT: z.string().default("3000"),
  HOST: z.string().default("localhost"),

  // Next.js Configuration
  NEXT_PUBLIC_API_BASE_URL: z.string().default("http://localhost:3000"),
  NEXT_PUBLIC_API_URL: z.string().default("http://localhost:3000"),
  NEXT_PUBLIC_APP_NAME: z.string().min(1).default("Moonwitness"),

  // Authentication
  JWT_SECRET: z.string().min(8).default("change-this-secret-key-in-production"),
  JWT_EXPIRES_IN: z.string().default("7d"),

  // Feature Flags
  FEATURE_ENABLE_ANALYTICS: z.string().default("true"),
  FEATURE_ENABLE_DARK_MODE: z.string().default("true"),
};

export const env = parseEnv(envSchema);
export type Env = typeof env;
