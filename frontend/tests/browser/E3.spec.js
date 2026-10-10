import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }, testInfo) => {
  const time = new Date("2026-10-08T12:00:00Z");
  await page.clock.install({ time });
  await page.clock.pauseAt(time);
});

const readState = (page) => page.evaluate(() => JSON.parse(localStorage.getItem("wortspiel.state.v1")));
const readSession = async (page) => (await readState(page)).session;
const seen = async (page) => Object.values((await readState(page)).groups)
  .reduce((total, group) => total + Object.keys(group.seen).length, 0);

async function begin(page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Los geht’s" }).click();
  await page.getByRole("button", { name: "Wir sind bereit" }).click();
  await expect(page.locator("#current-word")).toBeVisible();
  await expect.poll(() => seen(page)).toBe(1);
}

async function pressResult(page, key, result, count, points) {
  await page.clock.fastForward(400);
  await page.keyboard.press(key);
  await expect.poll(async () => (await readSession(page)).log.length).toBe(count);
  const session = await readSession(page);
  expect(session.log.at(-1).result).toBe(result);
  expect(session.scores[0]).toBe(points);
  await expect(page.locator("#current-word")).toBeVisible();
}

test("E3: Enter, letters and existing arrows use scoring buttons; undo keeps exposed cards reserved", async ({ page }) => {
  await begin(page);
  const first = (await readSession(page)).current;
  await pressResult(page, "Enter", "correct", 1, 1);
  const second = (await readSession(page)).current;
  await page.keyboard.press("Control+z");
  await expect.poll(async () => (await readSession(page)).log.length).toBe(0);
  expect((await readSession(page)).current).toBe(first);
  expect((await readSession(page)).scores[0]).toBe(0);
  expect(await seen(page)).toBe(2);
  await pressResult(page, "Shift+S", "skip", 1, 0);
  expect((await readSession(page)).current).not.toBe(second);
  await pressResult(page, "t", "taboo", 2, -1);
  await page.keyboard.press("Meta+z");
  await expect.poll(async () => (await readSession(page)).log.length).toBe(1);
  expect((await readSession(page)).scores[0]).toBe(0);
  await pressResult(page, "ArrowRight", "correct", 2, 1);
  await pressResult(page, "ArrowDown", "skip", 3, 1);
  await pressResult(page, "ArrowLeft", "taboo", 4, 0);
  expect(await seen(page)).toBe(7);
});

test("E3: P and space pause and resume; scoring is blocked in the pause", async ({ page }) => {
  await begin(page);
  await pressResult(page, "Enter", "correct", 1, 1);
  const current = (await readSession(page)).current;
  await page.keyboard.press("p");
  await expect(page.getByRole("heading", { name: "Kurz durchatmen." })).toBeVisible();
  const paused = await readSession(page);
  for (const key of ["s", "t", "ArrowDown", "ArrowLeft"])
    await page.keyboard.press(key);
  await page.clock.fastForward(10000);
  expect(await readSession(page)).toEqual(paused);
  expect(await seen(page)).toBe(2);
  await page.keyboard.press("Space");
  await expect(page.locator("#current-word")).toBeVisible();
  expect((await readSession(page)).current).toBe(current);
  await page.keyboard.press("Space");
  await expect.poll(async () => (await readSession(page)).phase).toBe("paused");
  await page.keyboard.press("Control+z");
  await expect.poll(async () => (await readSession(page)).log.length).toBe(0);
  expect((await readSession(page)).scores[0]).toBe(0);
  expect(await seen(page)).toBe(2);
  await page.keyboard.press("Shift+P");
  await expect(page.locator("#current-word")).toBeVisible();
  expect((await readSession(page)).remaining).toBe(paused.remaining);
});

test("E3: repeated, modified, composing and already handled key events cannot score", async ({ page }) => {
  await begin(page);
  const before = await readState(page);
  await page.evaluate(() => {
    const options = [
      { key: "Enter", repeat: true },
      { key: "p", repeat: true },
      { key: "?", repeat: true },
      { key: "s", isComposing: true },
      { key: "Enter", keyCode: 229 },
      { key: "Enter", altKey: true },
      { key: "t", ctrlKey: true },
      { key: "s", metaKey: true },
      { key: "z", ctrlKey: true, shiftKey: true },
    ];
    for (const option of options)
      document.body.dispatchEvent(new KeyboardEvent("keydown", { ...option, bubbles: true, cancelable: true }));
    const handled = new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true });
    handled.preventDefault();
    document.body.dispatchEvent(handled);
  });
  expect(await readState(page)).toEqual(before);
  await expect(page.getByRole("dialog")).not.toBeVisible();
});

test("E3: input, select, textarea and nested contenteditable focus suppress all shortcuts", async ({ page }) => {
  await begin(page);
  const before = await readState(page);
  await page.evaluate(() => {
    const area = document.createElement("div");
    area.id = "test-editors";
    area.innerHTML = '<input id="test-input"><select id="test-select"><option>A</option></select><textarea id="test-textarea"></textarea><div contenteditable="true"><span id="test-editable" tabindex="0">Text</span></div>';
    document.body.append(area);
  });
  for (const id of ["test-input", "test-select", "test-textarea", "test-editable"]) {
    await page.locator(`#${id}`).focus();
    for (const key of ["s", "t", "p", "Space", "ArrowRight", "ArrowDown", "ArrowLeft", "Control+z", "?"])
      await page.keyboard.press(key);
    await page.locator(`#${id}`).dispatchEvent("keydown", { key: "Enter", bubbles: true });
    expect(await readState(page)).toEqual(before);
    await expect(page.getByRole("dialog")).not.toBeVisible();
  }
});

test("E3: keyboard and pointer results share the existing 300 ms debounce", async ({ page }) => {
  await begin(page);
  await page.keyboard.press("Enter");
  await expect.poll(async () => (await readSession(page)).log.length).toBe(1);
  await page.getByRole("button", { name: "Überspringen", exact: false }).click();
  await page.keyboard.press("t");
  await page.keyboard.press("Enter");
  expect((await readSession(page)).log.map((entry) => entry.result)).toEqual(["correct"]);
  expect(await seen(page)).toBe(2);
  await pressResult(page, "s", "skip", 2, 1);
  expect(await seen(page)).toBe(3);
});

test("E3: help lists every shortcut, pauses play and protects open dialogs", async ({ page }, testInfo) => {
  await begin(page);
  await page.keyboard.press("?");
  const modal = page.getByRole("dialog");
  await expect(modal.getByRole("heading", { name: "So spielt ihr ludeverbis." })).toBeVisible();
  for (const text of ["Enter oder →", "S oder ↓", "T oder ←", "P oder Leertaste", "Strg+Z oder Cmd+Z", "?", "Wort gesagt"])
    await expect(modal).toContainText(text);
  const paused = await readSession(page);
  expect(paused.phase).toBe("paused");
  for (const key of ["s", "t", "p", "Space", "ArrowRight", "Control+z", "?"])
    await modal.dispatchEvent("keydown", { key: key === "Space" ? " " : key, bubbles: true });
  await page.clock.fastForward(10000);
  expect(await readSession(page)).toEqual(paused);
  expect(await seen(page)).toBe(1);
  for (const viewport of [{ width: 390, height: 844 }, { width: 820, height: 1180 }, { width: 1440, height: 900 }]) {
    await page.setViewportSize(viewport);
    await page.screenshot({ path: testInfo.outputPath(`shortcuts-${viewport.width}x${viewport.height}.png`) });
    expect(await modal.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
  }
  await modal.getByRole("button", { name: "Verstanden" }).click();
  await expect(modal).not.toBeVisible();
  expect((await readSession(page)).phase).toBe("paused");
  await page.keyboard.press("p");
  await expect(page.locator("#current-word")).toBeVisible();
  await page.getByRole("button", { name: "Runde beenden", exact: true }).click();
  await expect(modal).toContainText("Diese Runde beenden?");
  await page.keyboard.press("?");
  await expect(modal).toContainText("Diese Runde beenden?");
});

test("E3: scoring keys do nothing in setup and handover; help is available in setup", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("heading", { name: "Was kommt auf die Karten?" }).waitFor();
  const initial = await readState(page);
  for (const key of ["s", "t", "p", "Space", "ArrowRight", "Control+z"])
    await page.keyboard.press(key);
  expect(await readState(page)).toEqual(initial);
  await page.keyboard.press("?");
  await expect(page.getByRole("dialog")).toContainText("Mit Presenter oder Tastatur");
  await page.getByRole("button", { name: "Verstanden" }).click();
  await page.getByRole("button", { name: "Los geht’s" }).click();
  await expect(page.getByRole("button", { name: "Wir sind bereit" })).toBeVisible();
  const ready = await readState(page);
  await page.evaluate(() => document.activeElement?.blur());
  for (const key of ["s", "t", "p", "Space", "Control+z"])
    await page.keyboard.press(key);
  expect(await readState(page)).toEqual(ready);
  await page.keyboard.press("PageDown");
  await expect(page.locator("#current-word")).toBeVisible();
  expect(await seen(page)).toBe(1);
});
