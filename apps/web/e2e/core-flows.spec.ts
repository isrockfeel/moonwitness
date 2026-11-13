import { test, expect, type Page } from "@playwright/test";

async function mockSetupStatus(page: Page, initialized: boolean) {
  await page.route("**/api/v1/control/setup/status", (route) =>
    route.fulfill({
      json: {
        initialized,
        version: "test",
        instance: { id: "test-instance", name: "Moonwitness", version: "test" },
      },
    }),
  );
}

async function mockControlSession(page: Page) {
  await mockSetupStatus(page, true);
  await page.route("**/api/v1/control/auth/me", (route) =>
    route.fulfill({
      json: {
        user: {
          id: "test-user",
          name: "Test User",
          email: "test@example.com",
          role: "admin",
          created_at: "2026-01-01T00:00:00.000Z",
        },
      },
    }),
  );
}

test.describe("Authentication", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("should load homepage", async ({ page }) => {
    await expect(page).toHaveTitle(/Moonwitness/i);
  });

  test("should navigate to setup page", async ({ page }) => {
    await mockSetupStatus(page, false);
    await page.goto("/setup");
    await expect(page.getByRole("heading", { name: /welcome to the shadow/i })).toBeVisible();
  });

  test("should show VPN page", async ({ page }) => {
    await mockControlSession(page);
    await page.goto("/vpn");
    await expect(page.getByRole("heading", { name: /vpn tunnel/i })).toBeVisible();
  });
});

test.describe("VPN Setup Flow", () => {
  test("should explain when WireGuard tools are missing from the host", async ({ page }) => {
    await mockControlSession(page);
    await page.route("**/api/v1/control/vpn/status", (route) =>
      route.fulfill({
        json: {
          enabled: false,
          interface: "wg0",
          address: "",
          listen_port: 51820,
          endpoint: "",
          manage_firewall: false,
          public_key: "",
          server_configured: false,
          peer_count: 0,
          peers: [],
          available: false,
          missing_tools: ["wireguard-tools"],
        },
      }),
    );
    await page.goto("/vpn");
    await expect(page.getByRole("heading", { name: /tool belum ada/i })).toBeVisible();
  });
});

test.describe("Dashboard", () => {
  test("should load dashboard page", async ({ page }) => {
    await page.goto("/mission-control");
    await expect(page.getByRole("heading", { name: /shadow command center/i })).toBeVisible();
  });

  test("should display dock", async ({ page }) => {
    await page.goto("/dock");
    await expect(page.getByRole("heading", { name: /dock.*timeline chronicle/i })).toBeVisible();
  });
});

test.describe("Navigation", () => {
  test("should navigate between main pages", async ({ page }) => {
    await mockControlSession(page);
    const pages = [
      { path: "/", title: /Moonwitness/i },
      { path: "/vpn", title: /VPN/i },
      { path: "/setup", title: /Setup/ },
      { path: "/mission-control", title: /Shadow Command Center/i },
      { path: "/dock", title: /Dock/i },
    ];

    for (const { path, title } of pages) {
      await page.goto(path);
      await expect(page).toHaveTitle(title);
    }
  });
});
