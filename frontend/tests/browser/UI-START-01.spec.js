import { test, expect } from "@playwright/test";

const saved = page => page.evaluate(() => JSON.parse(localStorage.getItem("wortspiel.state.v1")));

test("iPhone installation tip follows the direct start instead of pushing it off screen", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "platform", { get: () => "iPhone" });
    Object.defineProperty(navigator, "standalone", { get: () => false });
    Object.defineProperty(navigator, "maxTouchPoints", { get: () => 5 });
  });
  await page.goto("/");
  const hint = page.locator(".ios-install-hint");
  await expect(hint).toBeVisible();
  const start = await page.getByRole("button", { name: "Los geht’s", exact: true }).boundingBox();
  expect(start.y + start.height).toBeLessThanOrEqual(568);
  expect((await hint.boundingBox()).y).toBeGreaterThanOrEqual(start.y + start.height);
  await page.getByRole("button", { name: "Spiel anpassen", exact: true }).click();
  await expect(hint).toBeVisible();
  expect(await hint.evaluate(el => el.previousElementSibling.classList.contains("section-tabs"))).toBe(true);
});

test("@matrix compact phone start fits the first screen without a required tour", async ({ page }, testInfo) => {
  await page.goto("/");
  const { width, height } = page.viewportSize();
  const phone = width <= 743 || (width <= 950 && height <= 500);
  const start = page.getByRole("button", { name: "Los geht’s", exact: true });
  await expect(start).toBeVisible();
  if (phone) {
    await expect(page.locator(".category-grid")).toBeHidden();
    await expect(page.getByLabel("Rundenzeit", { exact: true })).toBeHidden();
    await expect(page.getByLabel("Schwierigkeitsgrad")).toBeVisible();
    await expect(page.locator(".mobile-quickstart")).toBeHidden();
    const box = await start.boundingBox();
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.y + box.height).toBeLessThanOrEqual(height);
    await expect(page.locator("#difficulty option")).toHaveText(["Leicht", "Mittel", "Schwer"]);
    for (const mode of ["free", "pantomime", "taboo"]) {
      const label = page.locator(`label.game-mode:has(input[value="${mode}"])`);
      await label.click();
      await expect(label).toHaveClass(/selected/);
      const next = await start.boundingBox();
      expect(next.y).toBeGreaterThanOrEqual(0);
      expect(next.y + next.height).toBeLessThanOrEqual(height);
    }
  } else {
    await expect(page.getByLabel("Name Team 1")).toBeVisible();
    await expect(page.locator(".category-grid")).toBeVisible();
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath("start.png"), fullPage: true });
  await start.click();
  await page.getByRole("button", { name: "Wir sind bereit", exact: true }).click();
  await expect(page.locator("#current-word")).toBeVisible();
  const state = await saved(page);
  expect(Object.values(state.groups).flatMap(g => Object.keys(g.seen))).toContain(state.session.current);
});

test("compact next-round summary follows edited settings without changing the saved party", async ({ page }) => {
  await page.setViewportSize({ width: 393, height: 852 });
  await page.goto("/");
  await page.getByRole("button", { name: "Los geht’s", exact: true }).click();
  await page.getByRole("button", { name: "Wir sind bereit", exact: true }).click();
  await page.getByRole("button", { name: "Runde pausieren", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Kurz durchatmen." })).toBeVisible();
  const before = await saved(page);
  await page.getByRole("button", { name: "Spielübersicht" }).click();
  await page.getByRole("button", { name: "Spiel anpassen", exact: true }).click();
  await page.locator("#group-name").fill("Neue Runde");
  await page.getByLabel("Name Team 1").fill("Neue Wörter");
  await page.getByRole("button", { name: "Einstellungen schließen", exact: true }).click();
  await expect(page.locator(".current-settings")).toContainText("Neue Runde");
  await expect(page.locator(".current-settings")).toContainText("Neue Wörter");
  await expect(page.locator(".compact-start p")).toContainText(await page.locator("#available-count").textContent());
  await expect(page.locator(".resume-banner")).toContainText(before.session.settings.group);
  expect((await saved(page)).session).toEqual(before.session);
  expect((await saved(page)).groups).toEqual(before.groups);
  await page.getByRole("button", { name: "Los geht’s", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("Neue Partie beginnen?");
  await page.getByRole("button", { name: "Abbrechen", exact: true }).click();
  expect((await saved(page)).session).toEqual(before.session);
});

test("optional settings retain their values when folded, rotated and used to start", async ({ page, context }) => {
  await page.setViewportSize({ width: 393, height: 852 });
  await page.goto("/");
  await page.getByRole("button", { name: "Spiel anpassen", exact: true }).click();
  await page.getByLabel("Name Team 1").fill("Die Wörter");
  await page.getByLabel("Name Team 2").fill("Team 2");
  await expect(page.getByLabel("Altersgruppe", { exact: true })).toHaveCount(0);
  await page.getByLabel("Rundenzeit", { exact: true }).selectOption("90");
  await page.getByLabel("Tabu-Stufe", { exact: true }).selectOption("light");
  await page.getByRole("button", { name: "Einstellungen schließen", exact: true }).click();
  await page.locator('label.game-mode:has(input[value="free"])').click();
  await page.getByLabel("Schwierigkeitsgrad").selectOption("medium");
  await page.setViewportSize({ width: 852, height: 393 });
  await expect(page.getByLabel("Name Team 1")).toBeHidden();
  await expect(page.locator('input[name="gameMode"][value="free"]')).toBeChecked();
  await page.getByRole("button", { name: "Spiel anpassen", exact: true }).click();
  await expect(page.getByLabel("Name Team 1")).toHaveValue("Die Wörter");
  await expect(page.getByLabel("Altersgruppe", { exact: true })).toHaveCount(0);
  await expect(page.getByLabel("Rundenzeit", { exact: true })).toHaveValue("90");
  await page.getByRole("button", { name: "Einstellungen schließen", exact: true }).click();
  await expect.poll(async () => (await saved(page)).settings.difficulty).toBe("medium");
  const before = await saved(page);
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller)
      await new Promise(resolve => navigator.serviceWorker.addEventListener("controllerchange", resolve, { once: true }));
  });
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByLabel("Schwierigkeitsgrad")).toHaveValue("medium");
  await expect(page.getByLabel("Rundenzeit", { exact: true })).toBeHidden();
  expect((await saved(page)).groups).toEqual(before.groups);
  expect((await saved(page)).settings).toEqual(before.settings);
  await page.getByRole("button", { name: "Los geht’s", exact: true }).click();
  await expect(page.getByRole("button", { name: "Wir sind bereit", exact: true })).toBeVisible();
  expect((await saved(page)).session.settings).toMatchObject({ teams: ["Die Wörter", "Team 2"], ageGroup: null, seconds: 90, gameMode: "free", tabooMode: "none", difficulty: "medium" });
});

test("native validation reveals a restored invalid required field before focusing it", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  const errors = [];
  page.on("pageerror", e => errors.push(e.message));
  await page.goto("/");
  await page.getByLabel("Name Team 1").evaluate(input => { input.value = ""; });
  await page.getByRole("button", { name: "Los geht’s", exact: true }).click();
  await expect(page.getByLabel("Name Team 1")).toBeVisible();
  await expect(page.getByLabel("Name Team 1")).toBeFocused();
  expect((await saved(page)).session).toBeNull();
  expect(await page.locator("#setup-form :disabled").count()).toBe(0);
  expect(errors).toEqual([]);
});
