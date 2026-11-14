import { test, expect } from "@playwright/test";

test("runtime timeline has exact hero-only targets and CTA is usable during intro", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const state: {
      sequence: { target: string; start: number; duration: number; scoped: boolean }[];
    } = { sequence: [] };
    (window as unknown as { heroTimelineQA: typeof state }).heroTimelineQA = state;
    document.addEventListener("hero:timeline-start", (event) => {
      state.sequence = (
        event as CustomEvent<{ target: string; start: number; duration: number; scoped: boolean }[]>
      ).detail;
    });
  });
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as unknown as { heroTimelineQA: { sequence: unknown[] } }).heroTimelineQA.sequence
            .length,
      ),
    )
    .toBe(3);
  expect(
    await page.evaluate(
      () =>
        (window as unknown as { heroTimelineQA: { sequence: unknown[] } }).heroTimelineQA.sequence,
    ),
  ).toEqual([
    { target: "headline", start: 0.1, duration: 0.45, scoped: true },
    { target: "character", start: 0.2, duration: 0.55, scoped: true },
    { target: "annotations", start: 0.4, duration: 0.45, scoped: true },
  ]);
  const cta = page.locator("[data-hero-cta]");
  await expect(cta).toHaveCSS("opacity", "1");
  await cta.focus();
  await expect(cta).toBeFocused();
  await cta.click();
  await expect(page).toHaveURL(/\/dock/);
});

test("hero images use Next img descriptors and one responsive LCP preload", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const root = page.locator("[data-hero-root]");
  await expect(root.locator("img")).toHaveCount(3);
  const sources = {
    city: "crowd-moon.png",
    moon: "hero-moon-v2.png",
    character: "hero-character-v2.png",
  };
  for (const [role, source] of Object.entries(sources)) {
    const image = root.locator(`[data-hero-layer='${role}']`);
    await expect(image).toHaveAttribute(
      "src",
      new RegExp(`/_next/image\\?url=%2Fart%2F${source}`),
    );
    await expect(image).toHaveAttribute("srcset", new RegExp(source));
    await expect(image).toHaveAttribute("sizes", /.+/);
  }
  const preloads = page.locator("head link[rel='preload'][as='image']");
  await expect(preloads).toHaveCount(2);
  await expect(preloads.nth(0)).toHaveAttribute("media", "(min-width: 768px)");
  await expect(preloads.nth(0)).toHaveAttribute("href", /crowd-moon/);
  await expect(preloads.nth(1)).toHaveAttribute("media", "(max-width: 767px)");
  await expect(preloads.nth(1)).toHaveAttribute("href", /hero-character-v2/);
  expect(
    await preloads.evaluateAll(
      (links) =>
        (links as HTMLLinkElement[]).filter((link) => matchMedia(link.media).matches).length,
    ),
  ).toBe(1);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await preloads.evaluateAll(
      (links) =>
        (links as HTMLLinkElement[]).filter((link) => matchMedia(link.media).matches).length,
    ),
  ).toBe(1);
});

test("initial reduced motion leaves the server-rendered hero fully usable", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  for (const selector of [
    "[data-hero-headline]",
    "[data-hero-character-reveal]",
    "[data-hero-annotations]",
  ]) {
    await expect(page.locator(selector)).toHaveCSS("opacity", "1");
    await expect(page.locator(selector)).toHaveCSS("transform", "none");
  }
  await expect(page.locator("[data-hero-cta]")).toBeVisible();
  await expect(page.locator("[data-hero-cta]")).toHaveAttribute("href", "/dock");
});

for (const width of [320, 390, 430, 768, 1024, 1440]) {
  test(`hero separate layers and in-flow face-safe content at ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: width === 1440 ? 900 : 844 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    const root = page.locator("[data-hero-root]");
    await expect(root).toHaveCount(1);
    await expect(root.locator("img")).toHaveCount(3);
    const sources = {
      city: "crowd-moon.png",
      moon: "hero-moon-v2.png",
      character: "hero-character-v2.png",
    };
    for (const [role, source] of Object.entries(sources)) {
      const image = root.locator(`[data-hero-layer='${role}']`);
      await expect(image).toHaveAttribute("src", new RegExp(source));
      expect(
        await image.evaluate(
          (el) => (el as HTMLImageElement).complete && (el as HTMLImageElement).naturalWidth > 0,
        ),
      ).toBe(true);
    }
    await expect(root.locator("[data-hero-headline]")).toHaveCSS("opacity", "1");
    await expect(root.locator("[data-hero-character-reveal]")).toHaveCSS("transform", "none");
    const cta = root.locator("[data-hero-cta]");
    await expect(cta).toHaveAttribute("href", "/dock");
    expect((await cta.boundingBox())?.height).toBeGreaterThanOrEqual(44);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    const title = await root.locator("h1").boundingBox();
    expect(title?.x).toBeGreaterThanOrEqual(0);
    expect((title?.x ?? 0) + (title?.width ?? 0)).toBeLessThanOrEqual(width);
  });
}

test("CTA is keyboard usable from render without JavaScript enhancement", async ({ browser }) => {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();
  await page.goto("/");
  const cta = page.locator("[data-hero-cta]");
  await expect(cta).toBeVisible();
  await cta.focus();
  await expect(cta).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/dock/);
  await context.close();
});

test("live reduction ends scoped intro, never replays, and unmount stops detached writes", async ({
  page,
}) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  const root = page.locator("[data-hero-root]");
  await expect(root).toHaveCount(1);
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const selector of [
    "[data-hero-headline]",
    "[data-hero-character-reveal]",
    "[data-hero-annotations]",
  ]) {
    await expect(root.locator(selector)).toHaveCSS("opacity", "1");
    await expect(root.locator(selector)).toHaveCSS("transform", "none");
  }
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect(root.locator("[data-hero-headline]")).toHaveCSS("transform", "none");
  await root.evaluate((el) => {
    const state = { writes: 0 };
    (window as unknown as { heroQA: typeof state }).heroQA = state;
    new MutationObserver(() => {
      if (!el.isConnected) state.writes++;
    }).observe(el, { subtree: true, attributes: true, attributeFilter: ["style"] });
  });
  await root.locator("[data-hero-cta]").click();
  await expect(page).toHaveURL(/\/dock/);
  await page.evaluate(() => {
    (window as unknown as { heroQA: { writes: number } }).heroQA.writes = 0;
    dispatchEvent(new Event("scroll"));
    dispatchEvent(new Event("resize"));
  });
  await page.waitForTimeout(1000);
  expect(
    await page.evaluate(() => (window as unknown as { heroQA: { writes: number } }).heroQA.writes),
  ).toBe(0);
});
