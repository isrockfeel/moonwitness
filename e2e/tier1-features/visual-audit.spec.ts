import { test, expect } from "@playwright/test";
import { join } from "node:path";

const ARTIFACT_DIR = "C:/Users/bjo16/.gemini/antigravity/brain/4cc3be1f-50b6-41ab-b265-a38300ccd07c";

test.describe("Riot Grunge Visual Audit", () => {
  test("audit and capture modular visual routes", async ({ page }) => {
    // 1. Landing page
    await page.goto("/");
    await expect(page.locator("h1")).toBeVisible();
    await page.screenshot({ path: join(ARTIFACT_DIR, "audit-01-landing.png"), fullPage: false });

    // 2. Dock / Murder board
    await page.goto("/dock");
    await expect(page.getByText("MURDER BOARD // EVIDENCE LOG")).toBeVisible();
    await page.screenshot({ path: join(ARTIFACT_DIR, "audit-02-dock.png"), fullPage: false });

    // 3. ID Lab / Bootleg Passport
    await page.goto("/id-lab");
    await expect(page.locator("h1", { hasText: "ID LAB" })).toBeVisible();
    await page.screenshot({ path: join(ARTIFACT_DIR, "audit-03-id-lab.png"), fullPage: false });

    // 4. Shadow / Auth Gate
    await page.goto("/shadow");
    await expect(page.locator("h1", { hasText: "ENTER THE SHADOW" })).toBeVisible();
    await page.screenshot({ path: join(ARTIFACT_DIR, "audit-04-shadow.png"), fullPage: false });

    // 5. Episodes Route
    await page.goto("/episodes");
    await expect(page.locator("h1", { hasText: "EPISODES" })).toBeVisible();
    await page.screenshot({ path: join(ARTIFACT_DIR, "audit-05-episodes.png"), fullPage: false });
  });
});
