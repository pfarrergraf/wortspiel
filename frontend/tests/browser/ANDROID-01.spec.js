import { test, expect } from "@playwright/test";

async function native(page) {
  await page.addInitScript(() => {
    window.nativeCalls = [];
    window.nativeEvents = {};
    window.nativeBackup = { cancelled: true };
    window.androidBridge = { postMessage() {} };
    window.Capacitor = {
      getPlatform: () => "android",
      isNativePlatform: () => true,
      PluginHeaders: [
        { name: "App", methods: [{ name: "addListener", rtype: "callback" }, { name: "exitApp", rtype: "promise" }, { name: "removeListener", rtype: "promise" }] },
        { name: "LudeverbisDocuments", methods: ["save", "open", "keepAwake"].map(name => ({ name, rtype: "promise" })) },
      ],
      nativeCallback(plugin, method, options, callback) {
        window.nativeEvents[options.eventName] = callback;
        return "test-listener";
      },
      async nativePromise(plugin, method, options) {
        window.nativeCalls.push({ plugin, method, options });
        if (method === "open") return window.nativeBackup;
        if (method === "save") return { cancelled: false };
        return {};
      },
    };
  });
  await page.goto("/");
  await expect(page.locator("#setup-form")).toBeVisible();
}
const saved = page => page.evaluate(() => JSON.parse(localStorage.getItem("wortspiel.state.v1")));

test("native start uses bundled offline assets, hides install and respects system insets", async ({ page }) => {
  await native(page);
  await expect(page.locator("#connection")).toHaveText("Offline bereit");
  await expect(page.locator('[data-action="install"]')).toHaveCount(0);
  expect(await page.evaluate(async () => (await navigator.serviceWorker.getRegistrations()).length)).toBe(0);
  await expect(page.locator('input[name="gameMode"]')).toHaveCount(5);
  await page.evaluate(() => document.documentElement.style.setProperty("--safe-area-inset-top", "24px"));
  expect(await page.locator("body").evaluate(el => getComputedStyle(el).getPropertyValue("--safe-top").trim())).toBe("24px");
});

test("native export uses authoritative history and explicit document; invalid import preserves state", async ({ page }) => {
  await native(page);
  await page.locator('[data-action="storage"]').click();
  await page.locator('[data-action="export"]').click();
  await expect.poll(() => page.evaluate(() => window.nativeCalls.filter(c => c.method === "save").length)).toBe(1);
  const exported = await page.evaluate(() => window.nativeCalls.find(c => c.method === "save").options);
  expect(exported.mime).toBe("application/json");
  expect(JSON.parse(exported.text).schema).toBe(1);
  const before = await saved(page);
  await page.evaluate(() => { window.nativeBackup = { text: "null" }; });
  await page.locator('[data-action="import"]').click();
  await expect(page.locator("#toast")).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.nativeCalls.filter(c => c.method === "open").length)).toBe(1);
  expect((await saved(page)).groups).toEqual(before.groups);
  expect((await saved(page)).session).toEqual(before.session);
  await page.evaluate(text => { window.nativeBackup = { text }; }, exported.text);
  await page.locator('[data-action="import"]').click();
  await expect(page.locator("#toast")).toContainText("zusätzliche Karten");
  expect((await saved(page)).groups).toEqual(before.groups);
});

test("native app switching and back pause without releasing an exposed card", async ({ page }) => {
  await native(page);
  await page.locator('label.game-mode:has(input[value="noises"])').click();
  await page.getByRole("button", { name: "Los geht’s", exact: true }).click();
  await page.getByRole("button", { name: "Wir sind bereit", exact: true }).click();
  await expect(page.locator(".mode-indicator strong")).toHaveText("Geräusche");
  const before = await saved(page);
  await page.evaluate(() => window.nativeEvents.appStateChange({ isActive: false }));
  await expect(page.getByRole("heading", { name: "Kurz durchatmen." })).toBeVisible();
  expect((await saved(page)).groups).toEqual(before.groups);
  expect((await saved(page)).session.current).toBe(before.session.current);
  await page.evaluate(() => window.nativeEvents.backButton({ canGoBack: false }));
  await expect(page.getByRole("dialog")).toContainText("App schließen?");
  await page.getByRole("button", { name: "Hier bleiben", exact: true }).click();
  expect((await saved(page)).groups).toEqual(before.groups);
  expect(await page.evaluate(() => window.nativeCalls.some(c => c.method === "exitApp"))).toBe(false);
});

test("bundled donation page uses the injected native document API for QR download", async ({ page }) => {
  await page.addInitScript(() => {
    window.androidBridge = {};
    window.Capacitor = { Plugins: { LudeverbisDocuments: { save: async options => {
      window.savedQr = options; return { cancelled: false };
    } } } };
  });
  await page.goto("/unterstuetzen.html");
  await page.getByRole("link", { name: "QR-Bild speichern", exact: true }).click();
  await expect(page.locator("#copy-status")).toHaveText("QR-Bild gespeichert.");
  const qr = await page.evaluate(() => window.savedQr);
  expect(qr.mime).toBe("image/png");
  expect(qr.name).toBe("spende-jugendarbeit.png");
  expect(qr.text.startsWith("iVBORw0KGgo")).toBe(true);
});

test("opening license information durably pauses the active native game", async ({ page }) => {
  await native(page);
  await page.getByRole("button", { name: "Los geht’s", exact: true }).click();
  await page.getByRole("button", { name: "Wir sind bereit", exact: true }).click();
  await expect(page.locator(".mode-indicator")).toBeVisible();
  const before = await saved(page);
  await page.locator('[data-action="about"]').click();
  await expect(page.getByRole("dialog")).toContainText("Karten & Datenschutz");
  const paused = await saved(page);
  expect(paused.session.phase).toBe("paused");
  expect(paused.session.current).toBe(before.session.current);
  expect(paused.groups).toEqual(before.groups);
  await page.getByRole("dialog").getByRole("link", { name: "GPL-Lizenz", exact: true }).click();
  await expect(page.locator("body")).toContainText("GNU GENERAL PUBLIC LICENSE");
  const after = await saved(page);
  expect(after.session).toEqual(paused.session);
  expect(after.groups).toEqual(before.groups);
});
