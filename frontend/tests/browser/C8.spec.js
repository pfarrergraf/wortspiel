import { test, expect } from "@playwright/test";

// Fake an iPhone/iPad Safari environment via feature properties only.
async function fakeIos(page, { standalone = false, platform = "iPhone" } = {}) {
  await page.addInitScript(
    ({ standalone, platform }) => {
      Object.defineProperty(Navigator.prototype, "standalone", { get: () => standalone, configurable: true });
      Object.defineProperty(Navigator.prototype, "platform", { get: () => platform, configurable: true });
      Object.defineProperty(Navigator.prototype, "maxTouchPoints", { get: () => 5, configurable: true });
      if (!("ontouchend" in document)) document.ontouchend = null;
    },
    { standalone, platform },
  );
}

const hint = (page) => page.locator(".ios-install-hint");

test("head carries Apple web app metadata with relative paths", async ({ page, request }) => {
  await page.goto("/");
  const meta = (name) => page.locator(`meta[name="${name}"]`).getAttribute("content");
  expect(await meta("apple-mobile-web-app-capable")).toBe("yes");
  expect(await meta("mobile-web-app-capable")).toBe("yes");
  expect(await meta("apple-mobile-web-app-status-bar-style")).toBe("default");
  expect(await meta("apple-mobile-web-app-title")).toBe("ludeverbis");
  expect(await meta("format-detection")).toBe("telephone=no");
  expect(await meta("viewport")).toContain("viewport-fit=cover");
  expect(await meta("viewport")).toContain("interactive-widget=resizes-content");
  await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveAttribute("href", "./apple-touch-icon.png");
  const icon = await request.get("./apple-touch-icon.png");
  expect(icon.ok()).toBe(true);
  expect(icon.headers()["content-type"]).toContain("image/png");
});

test("no install hint on Android or desktop", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".section-tabs")).toBeVisible();
  await expect(hint(page)).toHaveCount(0);
});

test("iPhone Safari shows the install hint once until dismissed", async ({ page }) => {
  await fakeIos(page);
  await page.goto("/");
  await expect(hint(page)).toBeVisible();
  await expect(hint(page)).toContainText("Zum Home-Bildschirm");
  await expect(hint(page)).toContainText("7 Tagen");
  const { width, height } = page.viewportSize();
  const compactPhone = width <= 743 || (width <= 950 && height <= 500);
  if (compactPhone)
    expect(await hint(page).evaluate(el => el.previousElementSibling.id)).toBe("setup-form");
  else
    expect(await page.evaluate(() => document.querySelector(".section-tabs").nextElementSibling.className)).toContain("ios-install-hint");
  await page.getByRole("button", { name: "Hinweis ausblenden" }).click();
  await expect(hint(page)).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem("wortspiel.iosHint.v1"))).toBe("dismissed");
  const state = await page.evaluate(() => localStorage.getItem("wortspiel.state.v1") || "");
  expect(state).not.toContain("iosHint");
  await page.reload();
  await expect(page.locator(".section-tabs")).toBeVisible();
  await expect(hint(page)).toHaveCount(0);
});

test("iPadOS reporting as Mac with touch also gets the hint", async ({ page }) => {
  await fakeIos(page, { platform: "MacIntel" });
  await page.goto("/");
  await expect(hint(page)).toBeVisible();
});

test("installed Home-screen app shows no hint", async ({ page }) => {
  await fakeIos(page, { standalone: true });
  await page.goto("/");
  await expect(page.locator(".section-tabs")).toBeVisible();
  await expect(hint(page)).toHaveCount(0);
});

test("game buttons and card suppress selection, inputs stay selectable", async ({ page }) => {
  await page.goto("/");
  const inputSelect = await page.locator("#setup-form input").first().evaluate((el) => getComputedStyle(el).userSelect);
  expect(inputSelect).not.toBe("none");
  await page.getByRole("button", { name: "Los geht’s" }).click();
  await page.getByRole("button", { name: "Wir sind bereit" }).click();
  await expect(page.locator("#current-word")).toBeVisible();
  for (const selector of [".game-card", ".game-action.correct"]) {
    expect(await page.locator(selector).evaluate((el) => getComputedStyle(el).userSelect)).toBe("none");
  }
  expect(await page.evaluate(() => getComputedStyle(document.body).overscrollBehaviorY)).toBe("none");
});
