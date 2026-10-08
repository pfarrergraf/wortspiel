import { test, expect } from "@playwright/test";

const state = (page) =>
  page.evaluate(() => JSON.parse(localStorage.getItem("wortspiel.state.v1")));

test("a presenter plays a whole turn: next starts and scores, back is taboo, third button skips", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Los geht’s" })).toBeVisible();
  // Arrow keys on the setup form must not start a game by accident.
  await page.keyboard.press("ArrowRight");
  await expect(page.locator("#setup-form")).toBeVisible();

  await page.keyboard.press("PageDown");
  await expect(page.getByRole("button", { name: "Wir sind bereit" })).toBeVisible();
  await page.keyboard.press("PageDown");
  await expect(page.locator("#current-word")).toBeVisible();

  const first = await page.locator("#current-word").innerText();
  await page.keyboard.press("PageDown");
  await expect(page.locator(".round-points")).toHaveText("+1");
  await expect(page.locator("#current-word")).not.toHaveText(first);

  await page.waitForTimeout(350);
  await page.keyboard.press("PageUp");
  await expect(page.locator(".round-points")).toHaveText("0");

  for (const key of [".", "b", "F5", "Escape"]) {
    const before = await page.locator("#current-word").innerText();
    await page.waitForTimeout(350);
    await page.keyboard.press(key);
    await expect(page.locator("#current-word")).not.toHaveText(before);
  }
  // F5 must not reload the page during a turn.
  const log = (await state(page)).session.log.map((entry) => entry.result);
  expect(log).toEqual(["correct", "taboo", "skip", "skip", "skip", "skip"]);

  await page.keyboard.press(" ");
  await expect(page.getByRole("heading", { name: "Kurz durchatmen." })).toBeVisible();
  await page.keyboard.press("PageDown");
  await expect(page.locator("#current-word")).toBeVisible();

  // Keyboard extras: Ctrl+Z undoes the last result, ? opens the rules.
  await page.keyboard.press("Control+z");
  await expect
    .poll(async () => (await state(page)).session.log.length)
    .toBe(5);
  await page.keyboard.press("?");
  await expect(page.getByRole("heading", { name: "So spielt ihr Wortspiel." })).toBeVisible();
  // Escape closes the dialog and must not count as "skip".
  await page.keyboard.press("Escape");
  await expect(page.locator("dialog[open]")).toHaveCount(0);
  expect((await state(page)).session.log.length).toBe(5);
});

async function startTurn(page) {
  await page.keyboard.press("PageDown");
  await expect(page.getByRole("button", { name: "Wir sind bereit" })).toBeVisible();
  await page.keyboard.press("PageDown");
  await expect(page.locator("#current-word")).toBeVisible();
}

test("a learned third button and holding back both skip; a short back press stays taboo", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Presenter einrichten" }).click();
  await expect(page.getByRole("heading", { name: "Presenter einrichten" })).toBeVisible();
  // Live monitor shows what arrives, incl. hold duration.
  await page.keyboard.down("F8");
  await page.waitForTimeout(150);
  await page.keyboard.up("F8");
  await expect(page.locator("#presenter-last")).toContainText("F8");
  await expect(page.locator("#presenter-last")).toContainText("ms gehalten");
  // Reserved keys are refused, then a free key is learned.
  await page.getByRole("button", { name: "Dritte Taste anlernen" }).click();
  await page.keyboard.press("PageDown");
  await expect(page.locator(".presenter-message")).toContainText("schon");
  await page.getByRole("button", { name: "Dritte Taste anlernen" }).click();
  await page.keyboard.press("F9");
  await expect(page.locator("#presenter-binding")).toHaveText("Taste „F9“");
  await page.locator("[data-presenter-hold]").check();
  await page.getByRole("button", { name: "Fertig" }).click();

  await startTurn(page);
  let word = await page.locator("#current-word").innerText();
  await page.keyboard.press("F9");
  await expect(page.locator("#current-word")).not.toHaveText(word);

  word = await page.locator("#current-word").innerText();
  await page.waitForTimeout(350);
  await page.keyboard.down("PageUp");
  await page.waitForTimeout(800);
  await page.keyboard.up("PageUp");
  await expect(page.locator("#current-word")).not.toHaveText(word);

  await page.waitForTimeout(350);
  await page.keyboard.press("PageUp");
  await expect.poll(async () => (await state(page)).session.log.map((e) => e.result)).toEqual(["skip", "skip", "taboo"]);

  // The setting is per device and survives a reload.
  await page.reload();
  await page.getByRole("button", { name: "Spielübersicht" }).click();
  await page.getByRole("button", { name: "Presenter einrichten" }).click();
  await expect(page.locator("#presenter-binding")).toHaveText("Taste „F9“");
  await expect(page.locator("[data-presenter-hold]")).toBeChecked();
});

test("an extra mouse button can be learned for skipping", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Presenter einrichten" }).click();
  await page.getByRole("button", { name: "Dritte Taste anlernen" }).click();
  await page.mouse.down({ button: "middle" });
  await page.mouse.up({ button: "middle" });
  await expect(page.locator("#presenter-binding")).toHaveText("Mittlere Maustaste");
  await page.getByRole("button", { name: "Fertig" }).click();
  await startTurn(page);
  const word = await page.locator("#current-word").innerText();
  await page.mouse.down({ button: "middle" });
  await page.mouse.up({ button: "middle" });
  await expect(page.locator("#current-word")).not.toHaveText(word);
});

// A simulated Logitech Spotlight behind WebHID: its pointer button (0x00F0)
// sends nothing unless diverted via HID++ 0x1B04.
function fakeHid() {
  const listeners = new Set();
  const diverted = new Set();
  const controls = [[0x00d7, 0x20], [0x00da, 0x20], [0x00f0, 0x20], [0x00f1, 0x20]];
  const emit = (reportId, bytes) => {
    const data = new DataView(Uint8Array.from([...bytes, ...Array(19).fill(0)].slice(0, 19)).buffer);
    for (const fn of listeners) fn({ reportId, data });
  };
  const device = {
    vendorId: 0x046d,
    productName: "Spotlight (Test)",
    opened: false,
    collections: [{ usagePage: 0xff00, outputReports: [{ reportId: 0x11 }] }],
    open: async () => { device.opened = true; },
    addEventListener: (type, fn) => listeners.add(fn),
    removeEventListener: (type, fn) => listeners.delete(fn),
    async sendReport(reportId, data) {
      const [index, feature, fnsw, ...p] = data;
      const fn = fnsw >> 4;
      const reply = (params) => setTimeout(() => emit(0x11, [index, feature, fnsw, ...params]));
      if (index !== 1) return setTimeout(() => emit(0x10, [index, 0x8f, feature, fnsw, 0x08]));
      if (feature === 0) return reply([9]);
      if (fn === 0) return reply([controls.length]);
      if (fn === 1) { const [cid, flags] = controls[p[0]]; return reply([cid >> 8, cid & 0xff, 0, 0, flags]); }
      if (fn === 3) { const cid = (p[0] << 8) | p[1]; p[2] & 1 ? diverted.add(cid) : diverted.delete(cid); return reply(p.slice(0, 5)); }
    },
  };
  window.__pointer = () => {
    if (!diverted.has(0x00f0)) return;
    emit(0x11, [1, 9, 0x00, 0x00, 0xf0]);
    setTimeout(() => emit(0x11, [1, 9, 0x00]), 50);
  };
  // A short click reports a different control id than holding.
  window.__click = () => {
    if (!diverted.has(0x00f1)) return;
    emit(0x11, [1, 9, 0x00, 0x00, 0xf1]);
    setTimeout(() => emit(0x11, [1, 9, 0x00]), 20);
  };
  window.__diverted = () => [...diverted];
  Object.defineProperty(navigator, "hid", {
    value: {
      requestDevice: async () => [device],
      getDevices: async () => (device.opened || localStorage.getItem("wortspiel.presenter.v1")?.includes("hid") ? [device] : []),
      addEventListener() {},
    },
  });
}

test("a Spotlight pointer button that sends nothing can be connected directly and learned", async ({ page }) => {
  await page.addInitScript(fakeHid);
  await page.goto("/");
  await page.getByRole("button", { name: "Presenter einrichten" }).click();
  await page.getByRole("button", { name: "Spotlight verbinden" }).click();
  await expect(page.locator("#presenter-hid")).toContainText("verbunden mit Spotlight (Test)");
  await page.getByRole("button", { name: "Dritte Taste anlernen" }).click();
  await expect.poll(() => page.evaluate(() => window.__diverted().length)).toBe(4);
  await page.evaluate(() => window.__pointer());
  await expect(page.locator("#presenter-binding")).toContainText("0x00F0");
  // Only the pointer stays diverted, so next/back keep sending their keys.
  await expect.poll(() => page.evaluate(() => window.__diverted())).toEqual([0x00f0]);
  // Learning again with a short click adds its id instead of replacing.
  await page.getByRole("button", { name: "Dritte Taste anlernen" }).click();
  await page.evaluate(() => window.__click());
  await expect(page.locator("#presenter-binding")).toContainText("IDs 0x00F0, 0x00F1");
  await expect.poll(() => page.evaluate(() => window.__diverted().sort())).toEqual([0x00f0, 0x00f1]);
  await expect(page.locator("#presenter-raw")).not.toHaveText("–");
  await page.getByRole("button", { name: "Fertig" }).click();

  await startTurn(page);
  let word = await page.locator("#current-word").innerText();
  await page.evaluate(() => window.__pointer());
  await expect(page.locator("#current-word")).not.toHaveText(word);
  word = await page.locator("#current-word").innerText();
  await page.waitForTimeout(350);
  await page.evaluate(() => window.__click());
  await expect(page.locator("#current-word")).not.toHaveText(word);
  expect((await state(page)).session.log.map((e) => e.result)).toEqual(["skip", "skip"]);
});

test("the presenter dialog offers a diagnosis text and a full reset of diverted buttons", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]).catch(() => {});
  await page.addInitScript(fakeHid);
  await page.goto("/");
  await page.getByRole("button", { name: "Presenter einrichten" }).click();
  await page.getByRole("button", { name: "Spotlight verbinden" }).click();
  await page.getByRole("button", { name: "Dritte Taste anlernen" }).click();
  await page.evaluate(() => window.__pointer());
  await expect(page.locator("#presenter-binding")).toContainText("0x00F0");
  await page.getByRole("button", { name: "Diagnose kopieren" }).click();
  await expect(page.locator(".presenter-diagnose")).toContainText("Umgeleitet: 0x00F0");
  await expect(page.locator(".presenter-diagnose")).toContainText("Tasten: 0x00D7");
  await page.getByRole("button", { name: "Angelernte Taste löschen" }).click();
  await expect.poll(() => page.evaluate(() => window.__diverted())).toEqual([]);
  await expect(page.locator("#presenter-binding")).toHaveText("noch nichts angelernt");
});
