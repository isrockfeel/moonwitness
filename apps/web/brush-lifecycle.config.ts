import { defineConfig } from "@playwright/test";

process.env.NODE_OPTIONS = `${process.env.NODE_OPTIONS ?? ""} --experimental-vm-modules`.trim();

export default defineConfig({
  testDir: "./tests",
  testMatch: "brush-lifecycle.spec.ts",
  workers: 1,
  reporter: "list",
  outputDir: "../../.verify/brush-lifecycle-results",
});
