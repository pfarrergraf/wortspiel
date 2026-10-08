import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";

const pool = JSON.parse(await readFile(new URL("../../src/data/pantomime.json", import.meta.url), "utf8"));
const easy = new Map(pool.easy.map(([word, emoji]) => [word, emoji]));

test("pantomime mode: own word pool, emoji card, no taboo words, themes kept", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".category-grid")).toBeVisible();
  await page.locator(".game-mode", { hasText: "Pantomime" }).click();
  await expect(page.locator(".category-grid")).toHaveCount(0);
  await expect(page.locator(".pantomime-pool")).toContainText(`${easy.size} von ${easy.size} Pantomime-Wörtern ungespielt`);
  await page.getByRole("button", { name: "Los geht’s" }).click();
  await expect(page.locator(".handover")).toContainText("vorspielende Person");
  await page.getByRole("button", { name: "Wir sind bereit" }).click();
  const word = await page.locator("#current-word").innerText();
  expect(easy.has(word)).toBe(true);
  await expect(page.locator(".pantomime-emoji")).toHaveText(easy.get(word));
  await expect(page.locator(".forbidden-words")).toHaveCount(0);
  await expect(page.locator('[data-action="taboo"] strong')).toHaveText("Gesprochen");
  await page.locator('[data-action="correct"]').click();
  await expect(page.locator(".round-points")).toHaveText("+1");

  await page.getByRole("button", { name: "← Spielübersicht" }).click();
  await page.locator(".game-mode", { hasText: "Tabu" }).click();
  await expect(page.locator(".category-grid input:checked").first()).toBeVisible();
});
