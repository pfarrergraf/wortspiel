import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { initialState, migrateSettings, createSession, startTurn, pause } from "../../src/engine.js";
import { pantomimeCards } from "../../src/rules/pantomime.js";
import { noiseCards } from "../../src/rules/noises.js";
import { withMixedModes, PRESENTATIONS, cardModes } from "../../src/rules/play-modes.js";
import { openSetupOptions } from "./setup-options.js";
const read = async file => JSON.parse(await readFile(new URL(file, import.meta.url), "utf8"));
const dataset = await read("../../src/data/cards.json");
const pantomime = await read("../../src/data/pantomime.json");
const noises = await read("../../data/noises-de.json");
const cards = withMixedModes([...dataset.cards, ...pantomimeCards(pantomime), ...noiseCards(noises)]);
const saved = page => page.evaluate(() => JSON.parse(localStorage.getItem("wortspiel.state.v1")));
function mixedFixture(index, speech = false) {
  const state = initialState(dataset.categories);
  migrateSettings(state);
  Object.assign(state.settings, { gameMode: "mixed", difficulty: "all", sound: false, speech });
  createSession(state, cards, dataset.categories);
  const random = [ (index + .1) / 4, .5 ];
  startTurn(state, cards, 1000, () => random.shift());
  pause(state, 1100);
  return state;
}
async function seed(page, fixture) {
  await page.addInitScript(state => {
    if (!localStorage.getItem("wortspiel.state.v1")) localStorage.setItem("wortspiel.state.v1", JSON.stringify(state));
  }, fixture);
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Kurz durchatmen." })).toBeVisible();
  await page.getByRole("button", { name: "Weiter geht’s", exact: true }).click();
}

for (const [index, mode] of PRESENTATIONS.entries())
  test(`mixed ${mode.id}: symbol, named task, background and suitable card survive reload`, async ({ page }, testInfo) => {
    const fixture = mixedFixture(index);
    const card = cards.find(card => card.id === fixture.session.current);
    expect(cardModes(card)).toContain(mode.id);
    await seed(page, fixture);
    await expect(page.locator(".mode-indicator strong")).toHaveText(mode.name);
    await expect(page.locator(".mode-indicator > span")).toHaveText(mode.symbol);
    await expect(page.locator(".game-card")).toHaveClass(new RegExp(`mode-${mode.id}`));
    expect(await page.locator(".mode-indicator").evaluate(el => getComputedStyle(el).backgroundColor)).not.toBe("rgba(0, 0, 0, 0)");
    await expect(page.locator("#current-word")).toHaveText(card.word);
    if (mode.id === "taboo") expect(await page.locator(".forbidden-words li").count()).toBeGreaterThanOrEqual(3);
    else await expect(page.locator(".forbidden-words")).toHaveCount(0);
    await page.screenshot({ path: testInfo.outputPath(`${mode.id}.png`), fullPage: true });
    await page.reload();
    await expect(page.getByRole("heading", { name: "Kurz durchatmen." })).toBeVisible();
    const restored = await saved(page);
    expect(restored.session.currentMode).toBe(mode.id);
    expect(restored.session.current).toBe(fixture.session.current);
    expect(restored.groups).toEqual(fixture.groups);
    await page.getByRole("button", { name: "Weiter geht’s", exact: true }).click();
    await expect(page.locator(".mode-indicator strong")).toHaveText(mode.name);
  });

test("sound-only game has its own level counts and manual scoring with durable undo", async ({ page }) => {
  await page.goto("/");
  await page.locator('label.game-mode:has(input[value="noises"])').click();
  await openSetupOptions(page);
  await expect(page.locator('input[name="category"]')).toHaveCount(0);
  await expect(page.locator('input[name="noisesCategory"]')).toHaveCount(7);
  for (const [difficulty, count] of [["easy", 72], ["medium", 130], ["all", 160]]) {
    await page.getByLabel("Schwierigkeitsgrad").selectOption(difficulty);
    await expect(page.locator("#available-count")).toHaveText(count.toLocaleString("de-DE"));
  }
  await page.getByRole("button", { name: "Los geht’s", exact: true }).click();
  await page.getByRole("button", { name: "Wir sind bereit", exact: true }).click();
  await expect(page.locator(".mode-indicator strong")).toHaveText("Geräusche");
  await expect(page.locator(".free-explain")).toContainText("Keine Wörter, Gesten oder Gegenstände");
  const before = await saved(page);
  expect(before.session.current.startsWith("de:noises:")).toBe(true);
  await page.locator('[data-action="correct"]').click();
  await expect(page.locator(".round-points")).toHaveText("+1");
  await page.getByRole("button", { name: "Letzte Wertung zurück" }).click();
  await expect(page.locator(".round-points")).toHaveText("0");
  const after = await saved(page);
  expect(after.session.current).toBe(before.session.current);
  expect(after.session.currentMode).toBe("noises");
  expect(Object.keys(after.groups["group:unsere runde"].seen)).toHaveLength(2);
});

test("mixed category controls preserve three pools and permit an exclusively nonverbal selection", async ({ page }) => {
  await page.goto("/");
  await page.locator('label.game-mode:has(input[value="mixed"])').click();
  await openSetupOptions(page);
  expect(await page.locator('input[name="category"]').count()).toBeGreaterThan(0);
  expect(await page.locator('input[name="pantomimeCategory"]').count()).toBeGreaterThan(0);
  await expect(page.locator('input[name="noisesCategory"]')).toHaveCount(7);
  await expect(page.locator(".category-pool").filter({ hasText: /^Geräusche$/ })).toHaveCount(7);
  await page.getByRole("button", { name: "Alle abwählen", exact: true }).click();
  await expect(page.locator('.category input:checked')).toHaveCount(0);
  await page.locator('.category:has(input[name="noisesCategory"][value="ns-animals"])').click();
  await page.locator('.category:has(input[name="pantomimeCategory"])').first().click();
  await page.getByRole("button", { name: "Los geht’s", exact: true }).click();
  await page.getByRole("button", { name: "Wir sind bereit", exact: true }).click();
  const state = await saved(page);
  expect(state.session.settings.selected).toEqual([]);
  expect(state.session.settings.noisesSelected).toEqual(["ns-animals"]);
  expect(state.session.settings.pantomimeSelected).toHaveLength(1);
  expect(["free", "pantomime", "noises"]).toContain(state.session.currentMode);
});

test("mixed sound card keeps its task through undo, offline restart and retrospective correction", async ({ page, context }) => {
  const fixture = mixedFixture(3);
  await seed(page, fixture);
  await page.locator('[data-action="correct"]').click();
  await expect(page.locator(".round-points")).toHaveText("+1");
  const scored = await saved(page);
  expect(scored.session.log[0].mode).toBe("noises");
  await page.getByRole("button", { name: "Letzte Wertung zurück" }).click();
  await expect(page.locator(".mode-indicator strong")).toHaveText("Geräusche");
  const undone = await saved(page);
  expect(undone.session.current).toBe(fixture.session.current);
  expect(undone.session.currentMode).toBe("noises");
  expect(undone.session.scores).toEqual([0, 0]);
  expect(undone.groups).toEqual(scored.groups);
  await page.getByRole("button", { name: "Runde pausieren", exact: true }).click();
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller) await new Promise(resolve => navigator.serviceWorker.addEventListener("controllerchange", resolve, { once: true }));
  });
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Kurz durchatmen." })).toBeVisible();
  await page.getByRole("button", { name: "Weiter geht’s", exact: true }).click();
  await expect(page.locator(".mode-indicator strong")).toHaveText("Geräusche");
  expect((await saved(page)).groups).toEqual(scored.groups);
  await page.getByRole("button", { name: "Runde beenden", exact: true }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Runde beenden", exact: true }).click();
  await page.getByRole("button", { name: "Doch erraten (+1)", exact: true }).click();
  expect((await saved(page)).session.turns[0].log[0].mode).toBe("noises");
  await expect(page.locator(".result-mode")).toContainText("Geräusche");
  await page.locator('[data-action="amend:0:0"]').click();
  await page.getByRole("dialog").getByRole("button", { name: "Regelverstoß", exact: true }).click();
  const corrected = await saved(page);
  expect(corrected.session.scores[0]).toBe(-1);
  expect(corrected.session.turns[0].log[0].mode).toBe("noises");
  expect(corrected.groups).toEqual(scored.groups);
});

test("mixed nonverbal card never starts local speech despite a previously enabled microphone", async ({ page }) => {
  await page.addInitScript(() => {
    window.__speechStarts = 0;
    class LocalMock {
      static async available() { return "available"; }
      start() { window.__speechStarts++; }
      abort() {}
    }
    LocalMock.prototype.processLocally = false;
    window.SpeechRecognition = LocalMock;
  });
  const fixture = mixedFixture(3, true);
  await seed(page, fixture);
  await expect(page.locator("#speech-feedback")).toHaveText("Bei dieser Karte bleibt das Mikrofon aus.");
  expect(await page.evaluate(() => window.__speechStarts)).toBe(0);
  expect((await saved(page)).session.settings.speech).toBe(true);
});
