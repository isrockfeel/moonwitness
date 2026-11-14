import { test, expect } from "@playwright/test";

test("Signals discloses its fictional storyworld and uses a real archive action", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route("**/api/v1/**", (route) => route.fulfill({ json: { data: [], total: 0 } }));
  await page.goto("/");
  const signals = page.locator("#signals");
  await expect(signals.getByText("FICTIONAL STORIES", { exact: false })).toBeVisible();
  const storyLink = signals.getByRole("link", { name: "READ SIGNAL STORY" });
  await expect(storyLink).toHaveAttribute("href", "/dock");
  expect((await storyLink.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await expect(signals.getByRole("button", { name: /transmission/i })).toHaveCount(0);
  for (const claim of ["LIVE_STREAM 24/7", "REAL PEOPLE", "Firsthand accounts", "LVL 4 CLEARANCE"])
    await expect(signals.getByText(claim, { exact: false })).toHaveCount(0);
  await storyLink.click();
  await expect(page).toHaveURL(/\/dock$/);
});

test("entrance is a brief local ink stamp, not a fullscreen gate", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("FREQUENCY LOCKED", { exact: false })).toHaveCount(0);
  const stamp = page.locator("[data-entrance-stamp]");
  await expect(stamp).toHaveCount(1);
  await expect(stamp).toHaveAttribute("aria-hidden", "true");
  await expect(stamp).toHaveCSS("pointer-events", "none");
  await expect(stamp.locator("canvas, h1, h2")).toHaveCount(0);
  const box = await stamp.boundingBox();
  const vp = page.viewportSize()!;
  expect(box!.width * box!.height).toBeLessThan(vp.width * vp.height * 0.25);
  const ms = await stamp.evaluate((el) =>
    el.getAnimations().reduce((m, a) => {
      const t = a.effect?.getComputedTiming();
      return Math.max(m, Number(t?.delay ?? 0) + Number(t?.duration ?? 0));
    }, 0),
  );
  expect(ms).toBeLessThanOrEqual(250);
  await page
    .getByRole("link", { name: /moonwitness/i })
    .first()
    .focus();
  await expect(page.getByRole("link", { name: /moonwitness/i }).first()).toBeFocused();
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
  // Dev-server compile plus two p5 mounts exceeds the default 30s budget.
  test.setTimeout(60000);
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

test("transmission is a static, honest fiction panel with an immediate CTA", async ({ page }) => {
  await page.goto("/");
  const section = page.locator("#transmission");
  await section.scrollIntoViewIfNeeded();
  await expect(section).toHaveCSS("opacity", "1");
  for (const claim of [
    "LIVE",
    "CLASSIFIED",
    "Witness #MW-0447",
    "independent recordings confirm",
    "Three witnesses independently reported",
  ])
    await expect(section.getByText(claim, { exact: false })).toHaveCount(0);
  await expect(section.getByText(/fiction/i).first()).toBeVisible();
  const cta = section.getByRole("link", { name: /read the full transmission/i });
  await expect(cta).toHaveAttribute("href", "/dock");
  await expect(cta).toHaveCSS("opacity", "1");
  expect((await cta.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  const strip = section.locator("[data-transmission-strip]");
  await expect(strip).toHaveAttribute("aria-hidden", "true");
  const ms = await strip.evaluate((el) =>
    Math.max(
      0,
      ...el.getAnimations().map((a) => Number(a.effect?.getComputedTiming().duration ?? 0)),
    ),
  );
  expect(ms).toBeGreaterThanOrEqual(350);
  expect(ms).toBeLessThanOrEqual(500);
  await expect(section.locator("[data-transmission-id]")).toBeVisible();
});

test("storytelling renders honest alternating art/type units with horizontal settles", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/");
  const section = page.locator("#storytelling");
  await section.scrollIntoViewIfNeeded();
  await expect(section.getByText("&lsquo;", { exact: false })).toHaveCount(0);
  await expect(section.getByText("‘signals from the other side’", { exact: false })).toBeVisible();
  for (const claim of ["REAL PEOPLE", "published", "First transmission"])
    await expect(section.getByText(claim, { exact: false })).toHaveCount(0);
  await expect(section.getByRole("button")).toHaveCount(0);
  await expect(section.getByText(/read more/i)).toHaveCount(0);
  const units = section.locator("[data-story-unit]");
  await expect(units).toHaveCount(4);
  for (const unit of await units.all()) await expect(unit.locator("img")).toHaveCount(1);
  const dirs = await units.evaluateAll((els) =>
    els.map((el) => {
      const img = el.querySelector("img")!.getBoundingClientRect();
      const h = el.querySelector("h3")!.getBoundingClientRect();
      return img.left < h.left ? "art-left" : "art-right";
    }),
  );
  expect(dirs).toEqual(["art-left", "art-right", "art-left", "art-right"]);
  const timing = await units.evaluateAll((els) =>
    els.map((el) => {
      const s = getComputedStyle(el);
      return { d: parseFloat(s.transitionDuration), delay: parseFloat(s.transitionDelay) };
    }),
  );
  for (const t of timing) {
    expect(t.d).toBeGreaterThanOrEqual(0.45);
    expect(t.d).toBeLessThanOrEqual(0.65);
  }
  const step = timing[1]!.delay - timing[0]!.delay;
  expect(step).toBeGreaterThanOrEqual(0.08);
  expect(step).toBeLessThanOrEqual(0.12);
  for (const card of await section.locator(".zine-card-rough").all())
    await expect(card).toHaveCSS("opacity", "1");
});

test("shadow runs a decorative red light wipe while preview and CTA stay usable", async ({
  page,
}) => {
  await page.goto("/");
  const cta = page.getByRole("link", { name: /enter the shadow/i });
  await expect(cta).toHaveCSS("opacity", "1");
  await page.locator("#shadow").scrollIntoViewIfNeeded();
  const wipe = page.locator("#shadow [data-shadow-wipe]");
  await expect(wipe).toHaveCount(1);
  await expect(wipe).toHaveAttribute("aria-hidden", "true");
  await expect(wipe).toHaveCSS("pointer-events", "none");
  await expect(wipe).toHaveCSS("animation-name", "light-wipe");
  const duration = await wipe.evaluate((el) => parseFloat(getComputedStyle(el).animationDuration));
  expect(duration).toBeGreaterThanOrEqual(0.5);
  expect(duration).toBeLessThanOrEqual(0.7);
  await expect(page.locator("#shadow h2")).toHaveCSS("opacity", "1");
});

test("join layers paper, type and ink with overlapping settles and an unmasked CTA", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator("#about")).toHaveCount(1);
  const about = page.locator("#about");
  await about.scrollIntoViewIfNeeded();
  const layers = about.locator("[data-join-layer]");
  await expect(layers).toHaveCount(3);
  const timings = await layers.evaluateAll((els) =>
    els.map((el) => ({
      name: el.getAttribute("data-join-layer"),
      d: parseFloat(getComputedStyle(el).transitionDuration),
      delay: parseFloat(getComputedStyle(el).transitionDelay),
    })),
  );
  expect(timings.map((t) => t.name)).toEqual(["paper", "type", "ink"]);
  for (const t of timings) {
    expect(t.d).toBeGreaterThanOrEqual(0.45);
    expect(t.d).toBeLessThanOrEqual(0.7);
  }
  expect(timings[1]!.delay).toBeLessThan(timings[0]!.d);
  expect(timings[2]!.delay).toBeLessThan(timings[1]!.delay + timings[1]!.d);
  for (const el of await layers.all()) await expect(el).toHaveCSS("opacity", "1");
  const cta = about.getByRole("link", { name: /become a moonwitness/i });
  await expect(cta).toHaveAttribute("href", "/shadow");
  await expect(cta).toHaveCSS("opacity", "1");
  expect(await cta.evaluate((el) => el.closest("[data-join-layer]"))).toBeNull();
});

test("motion toggle pauses continuous effects without recreating the atmosphere canvas", async ({
  page,
}) => {
  test.setTimeout(60000);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/");
  const toggle = page.getByRole("button", { name: /pause motion/i });
  await expect(toggle).toHaveAttribute("aria-pressed", "false");
  expect((await toggle.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  const canvas = page.locator("#home canvas").first();
  await expect(canvas).toBeAttached({ timeout: 20000 });
  await canvas.evaluate((el) => ((el as HTMLElement).dataset.qaMark = "1"));
  await toggle.focus();
  await page.keyboard.press("Enter");
  await expect(toggle).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".marquee-track").first()).toHaveCSS("animation-play-state", "paused");
  await expect(page.locator("#home svg.animate-spin")).toHaveCSS("animation-play-state", "paused");
  await expect(page.locator('#home canvas[data-qa-mark="1"]')).toHaveCount(1);
  await page.keyboard.press("Space");
  await expect(toggle).toHaveAttribute("aria-pressed", "false");
  await expect(page.locator(".marquee-track").first()).toHaveCSS("animation-play-state", "running");
  await expect(page.locator('#home canvas[data-qa-mark="1"]')).toHaveCount(1);
});

for (const width of [320, 390, 430, 768, 1024, 1440]) {
  test(`landing has no horizontal overflow at ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
}
