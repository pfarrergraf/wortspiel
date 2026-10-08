import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";

const dataset = JSON.parse(await readFile(new URL("../../src/data/cards.json", import.meta.url), "utf8"));

test("kids preset: age filter, free explaining without taboo words and a gentle scoring label", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Kinder (6–9)" }).click();
  await expect(page.getByLabel("Altersgruppe")).toHaveValue("8");
  await expect(page.getByLabel("Tabu-Stufe")).toHaveValue("none");
  await expect(page.getByLabel("Rundenzeit")).toHaveValue("90");
  await page.getByRole("button", { name: "Los geht’s" }).click();
  await page.getByRole("button", { name: "Wir sind bereit" }).click();
  await expect(page.locator("#current-word")).toBeVisible();
  await expect(page.locator(".forbidden-words")).toHaveCount(0);
  await expect(page.locator(".free-explain")).toBeVisible();
  await expect(page.locator('[data-action="taboo"] strong')).toHaveText("Wort gesagt");
  const word = await page.locator("#current-word").innerText();
  const card = dataset.cards.find((c) => c.word === word);
  expect(card.ageMin ?? 14).toBeLessThanOrEqual(8);
  await page.locator('[data-action="taboo"]').click();
  await expect(page.locator(".round-points")).toHaveText("0");
});

test("light taboo level shows exactly three taboo words", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Tabu-Stufe").selectOption("light");
  await page.getByRole("button", { name: "Los geht’s" }).click();
  await page.getByRole("button", { name: "Wir sind bereit" }).click();
  await expect(page.locator(".forbidden-words li")).toHaveCount(3);
});
