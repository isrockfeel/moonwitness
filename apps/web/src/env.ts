import { parseEnv, z } from "@moonwitness/core";

export const env = parseEnv({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  NEXT_PUBLIC_APP_NAME: z.string().min(1).default("Moonwitness"),
});
