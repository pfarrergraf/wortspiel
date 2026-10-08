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
