import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["src/**/*.test.ts"],
    clearMocks: true,
    isolate: true,
    // The ORM exposes a process-global database singleton; running files in
    // parallel would have them fight over initDb()/closeDb().
    fileParallelism: false,
    testTimeout: 30000,
    hookTimeout: 30000,
  },
});
