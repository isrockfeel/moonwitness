import { test, expect } from "@playwright/test";

test.use({ viewport: { width: 390, height: 844 } });

for (const origin of ["toggle", "link"] as const) {
  test(`Escape dismisses mobile navigation from ${origin} and restores focus`, async ({ page }) => {
    await page.goto("/");
    const toggle = page.getByRole("button", { name: "Toggle menu" });
    await toggle.focus();
    await toggle.press("Enter");
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
    if (origin === "link") {
      await page.keyboard.press("Tab");
      await expect(
        page
          .getByRole("navigation", { name: "Mobile", exact: true })
          .getByRole("link", { name: "HOME", exact: true }),
      ).toBeFocused();
    }
    await page.keyboard.press("Escape");
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await expect(toggle).toBeFocused();
  });
}

test("search dialog restores focus after Escape, overlay, and Close", async ({ page }) => {
  await page.route("**/api/v1/**", (route) => route.fulfill({ json: { data: [], total: 0 } }));
  await page.goto("/");
  const trigger = page.getByRole("button", { name: "Search the archive" });
  const dialog = page.getByRole("dialog", { name: "Search the archive" });
  const openDialog = async () => {
    await trigger.click();
    await expect(dialog).toBeVisible();
  };

  await openDialog();
  await expect(dialog.getByRole("textbox", { name: "SEARCH THE SIGNALS" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();

  await openDialog();
  await dialog.locator("..").click({ position: { x: 8, y: 8 } });
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();

  await openDialog();
  await dialog.getByRole("button", { name: "Close search" }).click();
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
});

test("search submission preserves encoded Dock query", async ({ page }) => {
  await page.route("**/api/v1/**", (route) => route.fulfill({ json: { data: [], total: 0 } }));
  await page.goto("/");
  await page.getByRole("button", { name: "Search the archive" }).click();
  const dialog = page.getByRole("dialog", { name: "Search the archive" });
  await dialog.getByRole("textbox", { name: "SEARCH THE SIGNALS" }).fill("signal / moon");
  await dialog.getByRole("button", { name: "GO" }).click();
  await expect(page).toHaveURL(/\/dock\?/);
  expect(new URL(page.url()).searchParams.get("q")).toBe("signal / moon");
});

test("keyboard SIGNALS navigation closes menu and reaches the section", async ({ page }) => {
  await page.goto("/");
  const toggle = page.getByRole("button", { name: "Toggle menu" });
  await toggle.focus();
  await toggle.press("Space");
  await page.keyboard.press("Tab");
  await page.keyboard.press("Tab");
  const link = page
    .getByRole("navigation", { name: "Mobile", exact: true })
    .getByRole("link", { name: "SIGNALS", exact: true });
  await expect(link).toBeFocused();
  await link.press("Enter");
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await expect(page).toHaveURL(/#signals$/);
  await expect
    .poll(
      () => page.locator("#signals").evaluate((el) => Math.round(el.getBoundingClientRect().top)),
      { timeout: 10000 },
    )
    .toBeLessThan(150);
});

test("editorial signal card does not require a fictional timeline event", async ({ page }) => {
  const requests: string[] = [];
  page.on("request", (request) => requests.push(request.url()));
  await page.goto("/");
  await expect(
    page.locator("#signals").getByText("A SIGNAL FROM BELOW", { exact: true }),
  ).toBeVisible();
  expect(requests.some((url) => url.includes("/timeline/events/voices-in-the-fog"))).toBe(false);
});

test("decorative spins follow motion preference changes", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const star = page.locator("#home svg.animate-spin");
  await expect(star).toHaveCSS("animation-name", "none");
  await expect(page.locator("[data-transmission-strip]")).toHaveCSS("animation-name", "none");
  await expect(page.locator("#transmission")).toHaveCSS("opacity", "1");
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect(star).toHaveCSS("animation-name", "spin");
  await expect(page.locator("[data-transmission-strip]")).toHaveCSS("animation-name", "strip-wipe");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(star).toHaveCSS("animation-name", "none");
});
