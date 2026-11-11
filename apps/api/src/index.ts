import { buildApp } from "./app";
import { env } from "./shared/env";

async function main(): Promise<void> {
  const app = await buildApp();

  try {
    await app.listen({ port: Number(env.PORT), host: env.HOST });
    console.log(`[api] listening on ${env.HOST}:${env.PORT}`);
  } catch (error) {
    console.error("[api] failed to start", error);
    process.exit(1);
  }
}

main();
