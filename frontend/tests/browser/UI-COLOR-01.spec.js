import { test, expect } from "@playwright/test";

const saved = page => page.evaluate(() => JSON.parse(localStorage.getItem("wortspiel.state.v1")));
const names = ["Verbotene Wörter", "Frei", "Pantomime", "Geräusche", "Gemischt"];

test("colorful start keeps five named choices stationary while the ring rotates", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".start-title h1")).toContainText("Ludeverbis");
  await expect(page.locator(".start-title h1 span")).toHaveText("Spiele mit Wörtern");
  const choices = page.locator(".mode-wheel .game-mode");
  await expect(choices).toHaveCount(5);
  for (const name of names) await expect(page.getByRole("radio", { name, exact: true })).toBeAttached();
  await expect(choices.locator(".choice-symbol")).toHaveCount(5);
  const colors = await choices.evaluateAll(nodes => nodes.map(el => getComputedStyle(el).backgroundColor));
  expect(new Set(colors).size).toBe(5);
  expect(await page.locator(".mode-landing").evaluate(el => getComputedStyle(el).backgroundImage)).toContain("linear-gradient");
  await page.mouse.move(0, 0);
  const startPositions = await choices.evaluateAll(nodes => nodes.map(el => {
    const { x, y, width, height } = el.getBoundingClientRect(); return { x, y, width, height };
  }));
  await expect.poll(() => page.locator(".orbit-ring").evaluate(el => el.getAnimations()[0]?.currentTime ?? 0)).toBeGreaterThan(300);
  expect(await choices.evaluateAll(nodes => nodes.map(el => {
    const { x, y, width, height } = el.getBoundingClientRect(); return { x, y, width, height };
  }))).toEqual(startPositions);
  await expect(page.locator("body")).not.toContainText(/\bTabu\b|Tabuwort|Tabu-Stufe/);
  // Native keyboard selection remains usable and exposes the selected state.
  await page.getByRole("radio", { name: "Verbotene Wörter", exact: true }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("radio", { name: "Frei", exact: true })).toBeChecked();
  await expect(page.locator(".choice-free")).toHaveClass(/selected/);
});

test("pausing the start animation never writes game data and survives setup repaint", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".mode-landing")).toBeVisible();
  const before = await saved(page);
  await page.getByRole("button", { name: "Animation anhalten", exact: true }).click();
  await expect(page.locator(".mode-landing")).toHaveClass(/motion-paused/);
  await expect(page.locator(".orbit-ring")).toHaveCSS("animation-play-state", "paused");
  await expect(page.getByRole("button", { name: "Animation fortsetzen", exact: true })).toHaveAttribute("aria-pressed", "true");
  expect(await saved(page)).toEqual(before);
  await page.locator('.game-mode:has(input[value="noises"])').click();
  await expect(page.locator(".choice-noises")).toHaveClass(/selected/);
  await expect(page.locator(".mode-landing")).toHaveClass(/motion-paused/);
  const changed = await saved(page);
  expect(changed.groups).toEqual(before.groups);
  expect(changed.session).toEqual(before.session);
  await page.getByRole("button", { name: "Animation fortsetzen", exact: true }).click();
  await expect(page.locator(".mode-landing")).not.toHaveClass(/motion-paused/);
  await expect(page.locator(".orbit-ring")).toHaveCSS("animation-play-state", "running");
  expect(await saved(page)).toEqual(changed);
});

test("reduced motion stops decoration while all five modes still select normally", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  expect(await page.locator(".orbit-ring").evaluate(el => getComputedStyle(el).animationName)).toBe("none");
  await expect(page.locator(".orbit-motion")).toBeHidden();
  for (const mode of ["free", "pantomime", "noises", "mixed", "taboo"]) {
    await page.locator(`.game-mode:has(input[value="${mode}"])`).click();
    await expect(page.locator(`input[name="gameMode"][value="${mode}"]`)).toBeChecked();
    expect(await page.locator(".orbit-ring").evaluate(el => getComputedStyle(el).animationName)).toBe("none");
  }
});
