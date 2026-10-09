// QA-DEVICES (issue #19): device, rotation, offline and PWA acceptance.
// Every device here is an emulated Chromium viewport (SIMULATION), not a real
// device. Real-device checks and the two-person reading test stay manual tasks
// in docs/reviews/QA-DEVICES.md. The central Playwright config is unchanged:
// each test creates its own context, so the device list is split between the
// existing "mobile" (touch) and "desktop" projects instead of running twice.
import { test, expect, chromium } from "@playwright/test";
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname } from "node:path";

const touch = (width, height, scale = 2, isMobile = true) => ({
  viewport: { width, height },
  deviceScaleFactor: scale,
  isMobile,
  hasTouch: true,
});
const TOUCH_DEVICES = {
  "phone-small 320×568": touch(320, 568),
  "iphone-se 375×667": touch(375, 667),
  "iphone-15 393×852": touch(393, 852, 3),
  "phone-landscape 852×393": touch(852, 393, 3),
  "android-tablet-portrait 800×1280": touch(800, 1280),
  "android-tablet-landscape 1280×800": touch(1280, 800),
  "ipad-portrait 820×1180": touch(820, 1180),
  "ipad-landscape 1180×820": touch(1180, 820),
};
const DESKTOP_DEVICES = {
  "surface-pro 1368×912": touch(1368, 912, 2, false),
  "notebook 1440×900": { viewport: { width: 1440, height: 900 } },
  "desktop 1920×1080": { viewport: { width: 1920, height: 1080 } },
};
const devicesFor = (project) =>
  Object.entries(project === "desktop" ? DESKTOP_DEVICES : TOUCH_DEVICES);

const MODES = {
  classic: { label: "Klassisch", value: "taboo", forbidden: true },
  free: { label: "Frei erklären", value: "free", forbidden: false },
  pantomime: { label: "Pantomime", value: "pantomime", forbidden: false },
};

const PLAY = {
  Begriff: "#current-word",
  Timer: "#timer",
  Erraten: '[data-action="correct"]',
  Überspringen: '[data-action="skip"]',
  Wertung3: '[data-action="taboo"]',
  Pause: '[data-action="pause"]',
};

const state = (page) =>
  page.evaluate(() => JSON.parse(localStorage.getItem("wortspiel.state.v1")));
const seenIds = async (page) =>
  Object.values((await state(page)).groups).flatMap((g) => Object.keys(g.seen));
// Scoring has a deliberate 300 ms debounce (game-actions.js); wait past it.
async function score(page, selector, clock = false) {
  await page.locator(selector).click();
  if (clock) await page.clock.runFor(350);
  else await page.waitForTimeout(350);
}
const overflowX = (page) =>
  page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);

// Names of play controls that are not fully on the first screen.
async function offscreen(page, selectors) {
  return page.evaluate((entries) => {
    return entries
      .filter(([, selector]) => {
        const box = document.querySelector(selector)?.getBoundingClientRect();
        return (
          !box ||
          box.width === 0 ||
          box.top < 0 ||
          box.left < 0 ||
          box.bottom > window.innerHeight + 0.5 ||
          box.right > window.innerWidth + 0.5
        );
      })
      .map(([name]) => name);
  }, Object.entries(selectors));
}

async function playSelectors(page, mode) {
  const selectors = { ...PLAY };
  if (mode.forbidden) selectors.Tabuwörter = ".forbidden-words";
  return selectors;
}

async function startTurn(page, mode) {
  await page.goto("/");
  await page.locator(`label.game-mode:has(input[value="${mode.value}"])`).click();
  await page.getByRole("button", { name: "Los geht’s" }).click();
  await page.getByRole("button", { name: "Wir sind bereit" }).click();
  await expect(page.locator("#current-word")).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, 0));
}

async function assertPlayable(page, mode, label) {
  expect(await overflowX(page), `${label}: horizontal overflow`).toBeLessThanOrEqual(0);
  expect(await offscreen(page, await playSelectors(page, mode)), `${label}: controls off screen`).toEqual([]);
  // A score must be on screen: phones portrait show the team strip (the round
  // sidebar sits below the card), phones landscape hide the strip by design
  // (phone-landscape.css) and show this turn's points in the sidebar instead.
  const scores = await offscreen(page, { Teamstand: ".team-score.current", Rundenpunkte: ".round-points" });
  expect(scores.length, `${label}: no score on screen`).toBeLessThan(2);
  if (mode.forbidden) {
    // Every forbidden word must be rendered inside the viewport, not clipped.
    const clipped = await page.locator(".forbidden-words li").evaluateAll((items) =>
      items.filter((li) => {
        const box = li.getBoundingClientRect();
        return box.bottom > innerHeight || box.right > innerWidth || li.scrollWidth > li.clientWidth + 1;
      }).length,
    );
    expect(clipped, `${label}: clipped forbidden words`).toBe(0);
  }
}

for (const [key, mode] of Object.entries(MODES)) {
  test(`QA-DEVICES ${mode.label}: card, timer and scoring fit every simulated device`, async ({ browser }, testInfo) => {
    for (const [name, use] of devicesFor(testInfo.project.name)) {
      await test.step(`${name} (Simulation)`, async () => {
        const context = await browser.newContext({ ...use, baseURL: testInfo.project.use.baseURL });
        const page = await context.newPage();
        const errors = [];
        page.on("pageerror", (error) => errors.push(error.message));
        try {
          await startTurn(page, mode);
          await assertPlayable(page, mode, name);
          if (use.hasTouch) {
            // Large scoring buttons: at least 44×44 CSS px touch targets.
            for (const selector of [PLAY.Erraten, PLAY.Überspringen, PLAY.Wertung3]) {
              const box = await page.locator(selector).boundingBox();
              expect(box.height, `${name} ${selector} height`).toBeGreaterThanOrEqual(44);
              expect(box.width, `${name} ${selector} width`).toBeGreaterThanOrEqual(44);
            }
          }
          const first = await page.locator("#current-word").innerText();
          const timer = Number(await page.locator("#timer-number").innerText());
          expect(timer).toBeGreaterThan(0);
          await score(page, PLAY.Erraten);
          await expect(page.locator("#current-word")).not.toHaveText(first);
          await expect(page.locator(".team-score.current strong")).not.toHaveText("0");
          await expect(page.locator(".round-counts")).toContainText("1 erraten");
          await page.screenshot({ path: testInfo.outputPath(`${key}-${name.split(" ")[0]}.png`) });
          expect(errors).toEqual([]);
        } finally {
          await context.close();
        }
      });
    }
  });
}

const ROTATIONS = {
  mobile: [
    ["Smartphone 393×852 ↔ 852×393", touch(393, 852, 3)],
    ["Android-Tablet 800×1280 ↔ 1280×800", touch(800, 1280)],
    ["iPad 820×1180 ↔ 1180×820", touch(820, 1180)],
  ],
  desktop: [["Surface 1368×912 ↔ 912×1368", touch(1368, 912, 2, false)]],
};

test("QA-DEVICES rotation mid-turn keeps card, timer, points and history", async ({ browser }, testInfo) => {
  for (const [name, use] of ROTATIONS[testInfo.project.name] ?? ROTATIONS.mobile) {
    await test.step(`${name} (Simulation)`, async () => {
      const context = await browser.newContext({ ...use, baseURL: testInfo.project.use.baseURL });
      const page = await context.newPage();
      try {
        await page.clock.install();
        await startTurn(page, MODES.classic);
        const { width, height } = use.viewport;
        await score(page, PLAY.Erraten, true);
        await expect(page.locator(".round-counts")).toContainText("1 erraten");
        const card = (await state(page)).session.current;
        await page.clock.runFor(5000);
        const before = Number(await page.locator("#timer-number").innerText());

        await page.setViewportSize({ width: height, height: width });
        await page.evaluate(() => window.scrollTo(0, 0));
        expect((await state(page)).session.current, "same card after rotation").toBe(card);
        await assertPlayable(page, MODES.classic, `${name} gedreht`);
        await page.clock.runFor(3000);
        const after = Number(await page.locator("#timer-number").innerText());
        expect(after, "timer keeps running across rotation").toBeLessThan(before);
        expect(after).toBeGreaterThan(0);
        await page.screenshot({ path: testInfo.outputPath(`rotation-${name.split(" ")[0]}.png`) });

        await score(page, PLAY.Überspringen, true);
        await page.setViewportSize({ width, height });
        await page.evaluate(() => window.scrollTo(0, 0));
        await assertPlayable(page, MODES.classic, `${name} zurückgedreht`);
        await score(page, PLAY.Erraten, true);
        await expect(page.locator(".round-counts")).toContainText("2 erraten");
        await expect(page.locator(".round-counts")).toContainText("1 übersprungen");
        const session = (await state(page)).session;
        expect(session.log.map((l) => l.result)).toEqual(["correct", "skip", "correct"]);
        expect(new Set(await seenIds(page)).size).toBe(4);
      } finally {
        await context.close();
      }
    });
  }
});

test("QA-DEVICES full game on a small phone, then replay without repeating cards", async ({ browser }, testInfo) => {
  const context = await browser.newContext({ ...touch(320, 568), baseURL: testInfo.project.use.baseURL });
  const page = await context.newPage();
  try {
    await page.clock.install();
    await page.goto("/");
    await page.getByLabel("Runden pro Team", { exact: true }).selectOption("1");
    await page.getByRole("button", { name: "Los geht’s" }).click();
    for (let turn = 0; turn < 2; turn++) {
      await page.getByRole("button", { name: "Wir sind bereit" }).click();
      await score(page, PLAY.Erraten, true);
      await score(page, PLAY.Erraten, true);
      await page.clock.fastForward(61000);
      await expect(page.getByRole("heading", { name: /Runde!|Karten gespielt/ })).toBeVisible();
      expect(await overflowX(page)).toBeLessThanOrEqual(0);
      await page.getByRole("button", { name: turn ? "Zum Ergebnis" : "Nächstes Team" }).click();
    }
    await expect(page.getByRole("button", { name: "Nochmal spielen" })).toBeVisible();
    expect(await overflowX(page)).toBeLessThanOrEqual(0);
    await page.locator(".turn-history summary").click();
    await expect(page.locator(".history-turn")).toHaveCount(2);
    const played = new Set(await seenIds(page));
    expect(played.size).toBe(6);
    await page.screenshot({ path: testInfo.outputPath("final-320.png"), fullPage: true });

    await page.getByRole("button", { name: "Nochmal spielen" }).click();
    await page.getByRole("button", { name: "Wir sind bereit" }).click();
    for (let i = 0; i < 6; i++) {
      const id = (await state(page)).session.current;
      expect(played.has(id), `replay repeated ${id}`).toBe(false);
      if (i < 5) await score(page, PLAY.Überspringen, true);
    }
    expect(new Set(await seenIds(page)).size).toBe(12);
  } finally {
    await context.close();
  }
});

// ---- Production build under a sub-path, like GitHub Pages /wortspiel/ ----

const DIST = new URL("../../dist/", import.meta.url);
const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".webmanifest": "application/manifest+json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".txt": "text/plain; charset=utf-8",
};

// Minimal static server for the built dist/ under /wortspiel/. `swSuffix`
// simulates a new deployment by changing the worker's cache name.
async function serveSubpath() {
  const server = createServer(async (request, response) => {
    const url = new URL(request.url, "http://localhost");
    if (!url.pathname.startsWith("/wortspiel/")) {
      response.writeHead(404).end();
      return;
    }
    let path = decodeURIComponent(url.pathname.slice("/wortspiel/".length)) || "index.html";
    if (path.includes("..")) return response.writeHead(400).end();
    try {
      if ((await stat(new URL(path, DIST))).isDirectory()) path += "/index.html";
      let body = await readFile(new URL(path, DIST));
      if (path === "sw.js" && server.swSuffix)
        body = Buffer.from(body.toString().replace(/const CACHE = '(wortspiel-[^']+)'/, `const CACHE = '$1${server.swSuffix}'`));
      response.writeHead(200, {
        "content-type": TYPES[extname(path)] || "application/octet-stream",
        "cache-control": path === "sw.js" ? "no-cache" : "max-age=0",
      });
      response.end(body);
    } catch {
      response.writeHead(404).end();
    }
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  server.origin = `http://127.0.0.1:${server.address().port}`;
  return server;
}

async function controlled(page) {
  await page.evaluate(() =>
    navigator.serviceWorker.ready.then(
      () =>
        new Promise((resolve) => {
          if (navigator.serviceWorker.controller) return resolve();
          navigator.serviceWorker.addEventListener("controllerchange", resolve, { once: true });
        }),
    ),
  );
}

const pngSize = (buffer) => [buffer.readUInt32BE(16), buffer.readUInt32BE(20)];

test("QA-DEVICES production service worker, manifest and icons under /wortspiel/ without foreign requests", async ({ browser }, testInfo) => {
  const server = await serveSubpath();
  const base = `${server.origin}/wortspiel/`;
  const device = testInfo.project.name === "desktop" ? DESKTOP_DEVICES["notebook 1440×900"] : touch(393, 852, 3);
  const context = await browser.newContext(device);
  const foreign = [];
  await context.route(
    (url) => url.origin !== server.origin,
    (route) => {
      foreign.push(route.request().url());
      return route.abort("blockedbyclient");
    },
  );
  const outside = [];
  context.on("request", (request) => {
    const url = new URL(request.url());
    if (url.origin === server.origin && !url.pathname.startsWith("/wortspiel/")) outside.push(url.pathname);
  });
  try {
    const page = await context.newPage();
    await page.goto(base);
    await controlled(page);
    await expect(page.locator("#connection")).toHaveText("Offline bereit");
    const scope = await page.evaluate(() => navigator.serviceWorker.controller && navigator.serviceWorker.getRegistration().then((r) => r.scope));
    expect(scope).toBe(base);

    // Manifest: linked relatively, scope/start_url stay inside the sub-path.
    const manifestHref = await page.locator('link[rel="manifest"]').evaluate((link) => link.href);
    expect(manifestHref).toBe(`${base}manifest.webmanifest`);
    const manifestResponse = await page.request.get(manifestHref);
    expect(manifestResponse.headers()["content-type"]).toContain("manifest+json");
    const manifest = await manifestResponse.json();
    expect(new URL(manifest.start_url, manifestHref).href).toBe(base);
    expect(new URL(manifest.scope, manifestHref).href).toBe(base);
    expect(manifest.display).toBe("standalone");
    expect(manifest.lang).toBe("de");
    for (const icon of manifest.icons) {
      const url = new URL(icon.src, manifestHref).href;
      expect(url.startsWith(base)).toBe(true);
      const response = await page.request.get(url);
      expect(response.ok(), url).toBe(true);
      expect(response.headers()["content-type"]).toBe(icon.type);
      if (icon.type === "image/png") {
        const [w, h] = pngSize(await response.body());
        expect(`${w}x${h}`).toBe(icon.sizes);
      }
    }
    expect(manifest.icons.some((i) => i.sizes === "512x512" && i.purpose.includes("maskable"))).toBe(true);
    const touchIcon = await page.request.get(await page.locator('link[rel="apple-touch-icon"]').evaluate((l) => l.href));
    expect(touchIcon.ok()).toBe(true);
    expect(pngSize(await touchIcon.body())[0]).toBeGreaterThanOrEqual(180);

    // Every built file is precached under the sub-path.
    const cached = await page.evaluate(async () => {
      const keys = await caches.keys();
      const cache = await caches.open(keys.find((k) => k.startsWith("wortspiel-")));
      return (await cache.keys()).map((r) => r.url);
    });
    expect(cached.every((url) => url.startsWith(base))).toBe(true);
    for (const file of ["", "index.html", "manifest.webmanifest", "icon-192.png", "icon-512.png", "apple-touch-icon.png", "licenses/Manrope-OFL.txt"])
      expect(cached, file).toContain(`${base}${file}`);

    // Offline: reload and a newly opened tab both start and play.
    await page.getByRole("button", { name: "Los geht’s" }).click();
    await page.getByRole("button", { name: "Wir sind bereit" }).click();
    await expect(page.locator("#current-word")).toBeVisible();
    const first = (await state(page)).session.current;
    expect(first).toBeTruthy();
    await page.getByRole("button", { name: "Runde pausieren" }).click();
    await context.setOffline(true);
    await page.reload();
    await expect(page.getByRole("heading", { name: "Kurz durchatmen." })).toBeVisible();
    await page.getByRole("button", { name: "Weiter geht’s" }).click();
    expect((await state(page)).session.current).toBe(first);
    await score(page, PLAY.Erraten);
    await expect(page.locator(".round-points")).toHaveText("+1");
    const tab = await context.newPage();
    await tab.goto(`${base}?from=homescreen`);
    await expect(tab.locator(".team-score").first()).toBeVisible();
    await expect(tab.locator("#app")).not.toContainText("braucht Platz");
    expect(foreign, "requests to other origins").toEqual([]);
    expect(outside, "requests outside /wortspiel/").toEqual([]);
    await page.screenshot({ path: testInfo.outputPath("subpath-offline.png") });
  } finally {
    await context.close();
    server.close();
  }
});

test("QA-DEVICES offline browser restart and service worker update keep the card history", async ({}, testInfo) => {
  test.setTimeout(60000);
  const server = await serveSubpath();
  const base = `${server.origin}/wortspiel/`;
  const profile = testInfo.outputPath("profile");
  const options = {
    channel: process.env.CI ? undefined : "chrome",
    headless: true,
    ...(testInfo.project.name === "desktop" ? DESKTOP_DEVICES["surface-pro 1368×912"] : touch(800, 1280)),
  };
  let context = await chromium.launchPersistentContext(profile, options);
  try {
    let page = context.pages()[0] ?? (await context.newPage());
    await page.goto(base);
    await controlled(page);
    const firstCache = await page.evaluate(() => caches.keys());
    expect(firstCache).toHaveLength(1);
    await page.getByRole("button", { name: "Los geht’s" }).click();
    await page.getByRole("button", { name: "Wir sind bereit" }).click();
    await score(page, PLAY.Erraten);
    const seenBefore = await seenIds(page);
    expect(seenBefore).toHaveLength(2);
    await context.close();

    // Real browser restart with the network off (Simulation: Android tablet or Surface viewport).
    context = await chromium.launchPersistentContext(profile, { ...options, offline: true });
    page = context.pages()[0] ?? (await context.newPage());
    await page.goto(base);
    // A turn that was running when the browser closed comes back paused.
    await expect(page.getByRole("heading", { name: "Kurz durchatmen." })).toBeVisible();
    expect((await seenIds(page)).sort()).toEqual([...seenBefore].sort());
    await page.getByRole("button", { name: "Weiter geht’s" }).click();
    expect(seenBefore).toContain((await state(page)).session.current);
    await score(page, PLAY.Erraten);
    expect(await seenIds(page)).toHaveLength(3);
    await context.setOffline(false);

    // A new deployment: the worker changes, old caches are removed, nothing is reset.
    server.swSuffix = "-next";
    await page.evaluate(() => navigator.serviceWorker.getRegistration().then((r) => r.update()));
    // skipWaiting + clients.claim: the new worker takes over and its
    // activate step removes the previous cache, without touching storage.
    await expect.poll(() => page.evaluate(() => caches.keys()), { timeout: 15000 }).toEqual([`${firstCache[0]}-next`]);
    await page.reload();
    expect(await seenIds(page)).toHaveLength(3);
    await context.setOffline(true);
    await page.reload();
    await expect(page.locator(".team-score").first()).toBeVisible();
    expect(await seenIds(page)).toHaveLength(3);
  } finally {
    await context.close();
    server.close();
  }
});
