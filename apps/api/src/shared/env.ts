import { parseEnv, z } from "@moonwitness/core";

const envSchema = {
  PORT: z.string().default("3002"),
  HOST: z.string().default("127.0.0.1"),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  API_PREFIX: z.string().default("/api/v1"),
  DATABASE_URL: z.string().optional(),
  JWT_SECRET: z.string().optional(),
};

export const env = parseEnv(envSchema);
export type Env = typeof env;
