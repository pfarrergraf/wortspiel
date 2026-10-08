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
