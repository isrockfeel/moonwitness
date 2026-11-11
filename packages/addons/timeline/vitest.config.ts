import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    globals: true,
    // The ORM exposes a process-global database singleton; parallel files would
    // fight over initDb()/closeDb().
    fileParallelism: false,
  },
});
