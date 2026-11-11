import { buildApp } from "./app";
import { assertProductionEnv, env } from "./shared/env";

async function main(): Promise<void> {
  assertProductionEnv(env);

  const app = await buildApp();

  try {
    await app.listen({ port: Number(env.PORT), host: env.HOST });
    console.log(`[api] listening on ${env.HOST}:${env.PORT}`);
  } catch (error) {
    console.error("[api] failed to start", error);
    process.exit(1);
  }

  let shuttingDown = false;
  const shutdown = async (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`[api] received ${signal}, shutting down`);
    try {
      await app.close();
      process.exit(0);
    } catch (error) {
      console.error("[api] error during shutdown", error);
      process.exit(1);
    }
  };

  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));
}

main();
