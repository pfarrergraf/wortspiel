import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";

const pool = JSON.parse(await readFile(new URL("../../src/data/pantomime.json", import.meta.url), "utf8"));
const animals = new Map(pool.words.tiere.map(([word, emoji, points]) => [word, { emoji, points }]));

test("pantomime mode: own categories, emoji card, points scale, themes kept", async ({ page }) => {
  await page.goto("/");
  const tabooThemes = await page.locator('.category-grid input[name="category"]:checked').count();
  await page.locator(".game-mode", { hasText: "Pantomime" }).click();
  await expect(page.locator('input[name="pantomimeCategory"]')).toHaveCount(pool.categories.length);
  await expect(page.locator("#difficulty")).toHaveValue("all");
  await page.getByRole("button", { name: "Alle abwählen" }).click();
  await expect(page.locator("#selection-count")).toHaveText(`0 von ${pool.categories.length} ausgewählt`);
  await page.locator(".category", { hasText: "Tiere" }).click();
  await expect(page.locator(".category", { hasText: "Tiere" })).toContainText(`${animals.size} von ${animals.size} ungespielt`);

  await page.getByRole("button", { name: "Los geht’s" }).click();
  await expect(page.locator(".handover")).toContainText("vorspielende Person");
  await page.getByRole("button", { name: "Wir sind bereit" }).click();
  const word = await page.locator("#current-word").innerText();
  const card = animals.get(word);
  expect(card).toBeTruthy();
  await expect(page.locator(".pantomime-emoji")).toHaveText(card.emoji);
  await expect(page.locator(".card-points")).toContainText(`${card.points} Punkt`);
  await expect(page.locator(".forbidden-words")).toHaveCount(0);
  await expect(page.locator('[data-action="correct"] span')).toHaveText(`+${card.points} ${card.points === 1 ? "Punkt" : "Punkte"}`);
  await expect(page.locator('[data-action="taboo"] strong')).toHaveText("Gesprochen");
  await page.locator('[data-action="correct"]').click();
  await expect(page.locator(".round-points")).toHaveText(`+${card.points}`);

  await page.getByRole("button", { name: "← Spielübersicht" }).click();
  await page.locator(".game-mode", { hasText: "Tabu" }).click();
  await expect(page.locator('.category-grid input[name="category"]:checked')).toHaveCount(tabooThemes);
});
