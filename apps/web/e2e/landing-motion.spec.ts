import { test, expect } from "@playwright/test";

test("entrance keyframes are loaded and live reduction dismisses it", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("/");
  const entrance = page.locator('[aria-hidden="true"]').filter({ hasText: "FREQUENCY LOCKED" });
  await expect(entrance.locator("h1")).toHaveCSS("animation-name", "reveal-up");
  expect(
    await entrance
      .locator("h1")
      .evaluate((el) =>
        el
          .getAnimations()
          .some((a) => a.effect instanceof KeyframeEffect && a.effect.getKeyframes().length),
      ),
  ).toBe(true);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(entrance).toBeHidden();
});

for (const width of [320, 390, 430]) {
  test(`reduced motion content and mobile composition at ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    for (const selector of [
      "#storytelling .zine-card-rough",
      "#shadow h2",
      "#shadow p",
      "#shadow a[href='/shadow']",
    ]) {
      for (const el of await page.locator(selector).all())
        await expect(el).toHaveCSS("opacity", "1");
    }
    await expect(page.getByText("READ MORE →", { exact: true })).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    const titleBox = await page.locator("#home h1").boundingBox();
    expect(titleBox!.x + titleBox!.width).toBeLessThanOrEqual(width);
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await expect(page.locator("#shadow h2")).toHaveCSS("opacity", "1");
  });
}

test("entrance title fits narrow mobile and never blocks input", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 844 });
  await page.goto("/");
  const entrance = page.locator('[aria-hidden="true"]').filter({ hasText: "FREQUENCY LOCKED" });
  await expect(entrance).toHaveCSS("pointer-events", "none");
  const box = await entrance.locator("h1").boundingBox();
  expect(box!.width).toBeLessThanOrEqual(320);
});

test("timeline preview exposes actual encoded event and empty/error retry states", async ({
  page,
}) => {
  let mode = "loading";
  await page.route("**/api/v1/timeline/events?**", async (route) => {
    if (mode === "loading") await new Promise((resolve) => setTimeout(resolve, 700));
    if (mode === "error")
      return route.fulfill({ status: 500, json: { error: "QA boundary failure" } });
    return route.fulfill({
      json: {
        data:
          mode === "event"
            ? [
                {
                  id: "qa/id &1",
                  title: "QA boundary event",
                  image: "night-shift",
                  kind: "SIGNAL",
                  date: "2024-01-01",
                },
              ]
            : [],
        total: mode === "event" ? 1 : 0,
      },
    });
  });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.locator("#shadow").getByText("Loading archive preview…")).toBeVisible();
  await expect(page.locator("#shadow").getByText("No timeline events available.")).toBeVisible();
  mode = "error";
  await page.reload();
  const retry = page.locator("#shadow").getByRole("button", { name: "Retry archive preview" });
  await expect(retry).toBeVisible({ timeout: 20000 });
  expect((await retry.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  mode = "event";
  await retry.click();
  await expect(
    page.locator("#shadow").getByRole("link", { name: /QA boundary event/ }),
  ).toHaveAttribute("href", "/dock?event=qa%2Fid%20%261");
});

test("mobile landing preview opens the query-resolved event detail", async ({ page }) => {
  const event = {
    id: "qa/id &1",
    title: "QA boundary event",
    image: "night-shift",
    kind: "SIGNAL",
    date: "2024-01-01",
    era: "origins",
    excerpt: "Preview excerpt",
    body: "Actual archive event body",
    location: "QA dock",
    tags: [],
    sources: 0,
    notes: 0,
    related: [],
  };
  await page.route("**/api/v1/timeline/events?**", (route) =>
    route.fulfill({ json: { data: [event], total: 1 } }),
  );
  await page.route("**/api/v1/timeline/eras", (route) =>
    route.fulfill({
      json: {
        data: [{ id: "origins", name: "Origins", years: "2024", tagline: "QA", color: "pink" }],
      },
    }),
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page
    .locator("#shadow")
    .getByRole("link", { name: /QA boundary event/ })
    .click();
  await expect(page).toHaveURL(/\/dock\?event=qa%2Fid%20%261/);
  const detail = page.getByRole("dialog", { name: "Event detail" });
  await expect(detail.getByText("EVENT DETAIL", { exact: true })).toBeVisible();
  await expect(detail.getByRole("heading", { name: "QA BOUNDARY EVENT" })).toBeVisible();
  await expect(detail.getByText(event.body, { exact: true })).toBeVisible();
  await detail.getByRole("button", { name: "Close event detail" }).click();
  await expect(detail).toBeHidden();
  await page.goBack();
  await expect(page.locator("#shadow")).toBeVisible();
  await page.goForward();
  await expect(detail.getByText("EVENT DETAIL", { exact: true })).toBeVisible();
  await page.reload();
  await expect(detail.getByText("EVENT DETAIL", { exact: true })).toBeVisible();
});

test("live reduction reveals offscreen content and atmosphere responds to resizing", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.locator("#home canvas")).toHaveCount(0);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator("#shadow h2")).toHaveCSS("opacity", "1");
  await expect(page.locator("#shadow a[href='/shadow']").locator("..")).toHaveCSS("opacity", "1");
  for (const card of await page.locator("#storytelling .zine-card-rough").all())
    await expect(card).toHaveCSS("opacity", "1");
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.setViewportSize({ width: 1024, height: 844 });
  await expect
    .poll(() => page.locator("#home canvas").count(), { timeout: 20000 })
    .toBeGreaterThan(0);
  await page.setViewportSize({ width: 430, height: 844 });
  await expect(page.locator("#home canvas")).toHaveCount(0);
  await page.setViewportSize({ width: 1024, height: 844 });
  await expect
    .poll(() => page.locator("#home canvas").count(), { timeout: 20000 })
    .toBeGreaterThan(0);
});

test("decorative parallax resets live and survives navigation unmount", async ({ page }) => {
  await page.goto("/");
  const decoration = page.locator("#home [data-hero-parallax]");
  await expect(decoration).toHaveCount(1);
  await page.evaluate(() => scrollTo(0, 300));
  await expect(decoration).not.toHaveCSS("transform", "none");
  const displacement = await decoration.evaluate(
    (el) => new DOMMatrix(getComputedStyle(el).transform).m42,
  );
  expect(Math.abs(displacement)).toBeLessThanOrEqual(80);
  await page.evaluate(() => dispatchEvent(new Event("scroll")));
  await page.evaluate(
    () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
  );
  expect(await decoration.evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).m42)).toBe(
    displacement,
  );
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(decoration).toHaveCSS("transform", "none");
  await decoration.evaluate((el) => {
    const state = { detachedWrites: 0 };
    (window as unknown as { parallaxQA: typeof state }).parallaxQA = state;
    new MutationObserver(() => {
      if (!el.isConnected) state.detachedWrites++;
    }).observe(el, { attributes: true, attributeFilter: ["style"] });
  });
  await page.locator("#home a[href='/dock']").click();
  await expect(page).toHaveURL(/\/dock/);
  await page.evaluate(() => {
    (window as unknown as { parallaxQA: { detachedWrites: number } }).parallaxQA.detachedWrites = 0;
    scrollTo(0, 100);
    dispatchEvent(new Event("resize"));
  });
  await page.evaluate(
    () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
  );
  expect(
    await page.evaluate(
      () =>
        (window as unknown as { parallaxQA: { detachedWrites: number } }).parallaxQA.detachedWrites,
    ),
  ).toBe(0);
  await page.goBack();
  await expect(page.locator("#home [data-hero-parallax]")).toHaveCSS("transform", "none");
});
