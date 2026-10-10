import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { initialState, migrateSettings, createSession, startTurn, pause } from "../../src/engine.js";
import { openSetupOptions } from "./setup-options.js";

const dataset = JSON.parse(await readFile(new URL("../../src/data/cards.json", import.meta.url), "utf8"));
const saved = page => page.evaluate(() => JSON.parse(localStorage.getItem("wortspiel.state.v1")));

test("legacy age restriction cannot hide cards or alter a paused party and its history", async ({ page }) => {
  const legacy = initialState(dataset.categories);
  migrateSettings(legacy);
  legacy.settings.ageGroup = 6;
  legacy.settings.selected = ["food"];
  createSession(legacy, dataset.cards, dataset.categories);
  startTurn(legacy, dataset.cards, 1000, () => 0);
  pause(legacy, 2000);
  await page.addInitScript(state => {
    if (!localStorage.getItem("wortspiel.state.v1"))
      localStorage.setItem("wortspiel.state.v1", JSON.stringify(state));
  }, legacy);
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Kurz durchatmen." })).toBeVisible();
  expect((await saved(page)).session).toEqual(legacy.session);
  expect((await saved(page)).groups).toEqual(legacy.groups);
  await page.getByRole("button", { name: "Spielübersicht" }).click();
  await openSetupOptions(page);
  await expect(page.getByLabel("Altersgruppe")).toHaveCount(0);
  const expected = dataset.cards.filter(card => card.retired !== true && card.difficulty === "easy" && card.categories.includes("food") && card.id !== legacy.session.current);
  expect(expected.some(card => (card.ageMin ?? 14) > 6)).toBe(true);
  await expect(page.locator("#available-count")).toHaveText(expected.length.toLocaleString("de-DE"));
  await page.getByRole("button", { name: "Kinder", exact: true }).click();
  await page.getByLabel("Rundenzeit", { exact: true }).selectOption("60");
  await expect.poll(async () => (await saved(page)).settings.seconds).toBe(60);
  const after = await saved(page);
  expect(after.settings.ageGroup).toBe(6);
  expect(after.session).toEqual(legacy.session);
  expect(after.groups).toEqual(legacy.groups);
  await page.reload();
  expect((await saved(page)).session).toEqual(legacy.session);
  expect((await saved(page)).groups).toEqual(legacy.groups);
});
