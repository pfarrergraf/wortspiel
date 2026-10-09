import { test, expect } from "@playwright/test";

const state = (page) => page.evaluate(() => JSON.parse(localStorage.getItem("wortspiel.state.v1")));
const seen = async (page) => Object.values((await state(page)).groups).reduce((sum, g) => sum + Object.keys(g.seen).length, 0);
async function next(page, step) {
  await page.getByRole("button", { name: "Weiter", exact: true }).click();
  await expect(page.locator("#wizard-progress")).toContainText(`Schritt ${step} von 5`);
}

test("guided setup saves fields, back navigation and explicit advanced settings", async ({ page }) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await page.getByRole("button", { name: "Neue Partie vorbereiten" }).click();
  await page.locator('label.game-mode:has(input[value="free"])').click();
  await next(page, 2);
  await page.getByRole("button", { name: "Jugendliche", exact: true }).click();
  expect((await state(page)).settings.gameMode).toBe("free");
  expect((await state(page)).settings.tabooMode).toBe("none");
  await next(page, 3);
  await page.getByLabel("Name Team 1").fill("Die Wörter");
  await page.getByLabel("Name Team 2").fill("Die Gesten");
  await next(page, 4);
  await page.getByRole("button", { name: "Zurück", exact: true }).click();
  await expect(page.getByLabel("Name Team 1")).toHaveValue("Die Wörter");
  await next(page, 4);
  await page.locator("#category-search").fill("Natur");
  await expect(page.locator(".category:visible")).toHaveCount(1);
  await page.getByRole("button", { name: "Alle abwählen" }).click();
  await page.locator(".category:visible").click();
  await next(page, 5);
  await page.getByLabel("Rundenzeit", { exact: true }).selectOption("90");
  await page.getByRole("button", { name: "Los geht’s" }).click();
  await page.getByRole("button", { name: "Wir sind bereit" }).click();
  await expect(page.locator(".free-explain")).toBeVisible();
  await expect(page.locator(".forbidden-words")).toHaveCount(0);
  expect((await state(page)).session.settings).toMatchObject({ gameMode: "free", tabooMode: "none", seconds: 90, teams: ["Die Wörter", "Die Gesten"], selected: ["planet"] });
  await page.getByRole("button", { name: "Spielübersicht" }).click();
  await page.getByRole("button", { name: "Alle Einstellungen", exact: true }).click();
  await expect(page.getByLabel("Name Team 1")).toBeVisible();
  await expect(page.getByLabel("Schwierigkeitsgrad")).toBeVisible();
  expect(errors).toEqual([]);
});

test("hidden required fields are revealed before native validation; browser back keeps values", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Neue Partie vorbereiten" }).click();
  await next(page, 2);
  await next(page, 3);
  await page.getByLabel("Name Team 1").fill("");
  await page.getByRole("button", { name: "Weiter", exact: true }).click();
  await expect(page.locator("#wizard-progress")).toContainText("Schritt 3 von 5");
  await expect(page.getByLabel("Name Team 1")).toBeFocused();
  await page.getByLabel("Name Team 1").fill("Gültig");
  await next(page, 4);
  await page.goBack();
  await expect(page.locator("#wizard-progress")).toContainText("Schritt 3 von 5");
  await expect(page.getByLabel("Name Team 1")).toHaveValue("Gültig");
  await next(page, 4);
  await next(page, 5);
  // Simulate a restored invalid value in a hidden team field, then submit.
  await page.locator('input[name="team"]').first().evaluate((input) => { input.value = ""; });
  await page.getByRole("button", { name: "Los geht’s" }).click();
  await expect(page.getByLabel("Name Team 1")).toBeVisible();
  await expect(page.getByLabel("Name Team 1")).toBeFocused();
  expect((await state(page)).session).toBeNull();
});

test("replay confirms replacement, retains session settings and never resets seen cards", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Name Team 1").fill("Original");
  await page.getByLabel("Rundenzeit", { exact: true }).selectOption("90");
  await page.getByRole("button", { name: "Los geht’s" }).click();
  await page.getByRole("button", { name: "Wir sind bereit" }).click();
  await expect(page.locator("#current-word")).toBeVisible();
  const first = (await state(page)).session.current;
  await page.getByRole("button", { name: "Spielübersicht" }).click();
  await page.getByLabel("Name Team 1").fill("Neue Auswahl");
  await page.getByRole("button", { name: "Nochmal spielen", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("Neue Partie beginnen?");
  await page.getByRole("button", { name: "Abbrechen", exact: true }).click();
  expect((await state(page)).session.current).toBe(first);
  await page.getByRole("button", { name: "Partie fortsetzen" }).click();
  await page.getByRole("button", { name: "Weiter geht’s" }).click();
  expect((await state(page)).session.current).toBe(first);
  await page.getByRole("button", { name: "Spielübersicht" }).click();
  await page.getByRole("button", { name: "Nochmal spielen", exact: true }).click();
  await page.getByRole("button", { name: "Neue Partie starten", exact: true }).click();
  await expect(page.getByRole("button", { name: "Wir sind bereit" })).toBeVisible();
  expect((await state(page)).session.settings.teams[0]).toBe("Original");
  expect((await state(page)).session.settings.seconds).toBe(90);
  await page.getByRole("button", { name: "Wir sind bereit" }).click();
  await expect(page.locator("#current-word")).toBeVisible();
  expect((await state(page)).session.current).not.toBe(first);
  expect(await seen(page)).toBe(2);
});

test("@matrix guided preparation and free play fit every configured screen", async ({ page }, testInfo) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Neue Partie vorbereiten" }).click();
  await page.locator('label.game-mode:has(input[value="free"])').click();
  for (let step = 2; step <= 5; step++) {
    await next(page, step);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  await page.getByRole("button", { name: "Los geht’s" }).click();
  await page.getByRole("button", { name: "Wir sind bereit" }).click();
  await expect(page.locator("#current-word")).toBeVisible();
  for (const selector of ["#current-word", "#timer", '[data-action="correct"]', '[data-action="skip"]', '[data-action="taboo"]']) {
    const box = await page.locator(selector).boundingBox();
    expect(box.y + box.height).toBeLessThanOrEqual(page.viewportSize().height);
  }
  await page.screenshot({ path: testInfo.outputPath("free-play.png") });
});
