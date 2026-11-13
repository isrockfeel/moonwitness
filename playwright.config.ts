import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./apps/web/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [["html", { outputFolder: "apps/web/playwright-report" }], ["list"]],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000",
    reducedMotion: "no-preference",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] },
    },
    {
      name: "webkit",
      use: { ...devices["Desktop Safari"] },
    },
    {
      name: "Mobile Chrome",
      use: { ...devices["Pixel 5"] },
    },
    {
      name: "Mobile Safari",
      use: { ...devices["iPhone 12"] },
    },
  ],
  webServer: [
    {
      command: "pnpm dev",
      cwd: "./apps/api",
      url: "http://127.0.0.1:3002/api/v1/readyz",
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
      env: {
        DATABASE_URL: "./playwright.db",
        HOST: "127.0.0.1",
        PORT: "3002",
        SEED: "1",
      },
    },
    {
      command: process.env.CI ? "pnpm start" : "pnpm dev",
      cwd: "./apps/web",
      url: "http://localhost:3000",
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
      env: {
        API_INTERNAL_URL: "http://127.0.0.1:3002",
      },
    },
  ],
});
