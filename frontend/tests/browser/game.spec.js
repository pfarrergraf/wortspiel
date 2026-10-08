import { test, expect, chromium } from "@playwright/test";
import { readFile } from "node:fs/promises";

const dataset = JSON.parse(await readFile(new URL("../../src/data/cards.json", import.meta.url), "utf8"));

async function begin(page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Los geht’s" }).click();
  await expect(
    page.getByRole("button", { name: "Wir sind bereit" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Wir sind bereit" }).click();
  await expect(page.locator("#current-word")).toBeVisible();
}

async function seen(page) {
  return page.evaluate(() =>
    Object.values(
      JSON.parse(localStorage.getItem("wortspiel.state.v1")).groups,
    ).reduce((n, group) => n + Object.keys(group.seen).length, 0),
  );
}

test("youth and Konfi presets filter cards and counts, persist offline, and keep history across levels", async ({ page, context }, testInfo) => {
  await page.goto("/");
  await expect(page.getByLabel("Schwierigkeitsgrad")).toHaveValue("easy");
  await page.getByRole("button", { name: "Jugendliche", exact: true }).click();
  await expect(page.locator('input[name="category"]:checked')).toHaveCount(8);
  await expect(page.locator('input[value="faith"]')).not.toBeChecked();
  await page.getByRole("button", { name: "Konfis", exact: true }).click();
  await expect(page.locator('input[name="category"]:checked')).toHaveCount(9);
  await expect(page.locator('input[value="faith"]')).toBeChecked();
  const selected = await page.locator('input[name="category"]:checked').evaluateAll((inputs) => inputs.map((input) => input.value));
  const pool = dataset.cards.filter((c) => c.difficulty === "easy" && c.categories.some((id) => selected.includes(id)));
  await expect(page.locator("#available-count")).toHaveText(pool.length.toLocaleString("de-DE"));
  const faith = dataset.cards.filter((c) => c.difficulty === "easy" && c.categories.includes("faith")).length;
  await expect(page.locator("label.category").filter({ hasText: "Glaube & Kirche" })).toContainText(`${faith} von ${faith} ungespielt`);
  await page.getByRole("button", { name: "Los geht’s" }).click();
  await expect(page.locator(".game-heading")).toContainText("Leicht");
  await page.getByRole("button", { name: "Wir sind bereit" }).click();
  await expect(page.locator("#current-word")).toBeVisible();
  const first = await page.locator("#current-word").innerText();
  expect(pool.some((c) => c.word === first)).toBe(true);
  await page.getByRole("button", { name: "Spielübersicht" }).click();
  await page.getByLabel("Schwierigkeitsgrad").selectOption("all");
  await expect(page.locator("#available-count")).toHaveText((dataset.cards.filter((c) => c.categories.some((id) => selected.includes(id))).length - 1).toLocaleString("de-DE"));
  await page.getByRole("button", { name: "Los geht’s" }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Neue Partie starten" }).click();
  await expect(page.locator(".game-heading")).toContainText("Alles / knifflig");
  await page.getByRole("button", { name: "Wir sind bereit" }).click();
  await expect(page.locator("#current-word")).toBeVisible();
  await expect(page.locator("#current-word")).not.toHaveText(first);
  await expect.poll(() => seen(page)).toBe(2);
  await page.getByRole("button", { name: "Spielübersicht" }).click();
  await page.getByRole("button", { name: "Konfis", exact: true }).click();
  await expect(page.getByLabel("Schwierigkeitsgrad")).toHaveValue("easy");
  // Preparing the next game must not change the current game's pool.
  await page.getByRole("button", { name: "Partie fortsetzen" }).click();
  await expect(page.locator(".game-heading")).toContainText("Alles / knifflig");
  await page.getByRole("button", { name: "Spielübersicht" }).click();
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => new Promise((resolve) => {
    if (navigator.serviceWorker.controller) return resolve();
    navigator.serviceWorker.addEventListener("controllerchange", resolve, { once: true });
  })));
  await context.setOffline(true);
  await page.reload();
  await page.getByRole("button", { name: "Spielübersicht" }).click();
  await expect(page.getByLabel("Schwierigkeitsgrad")).toHaveValue("easy");
  await expect(page.locator('input[value="faith"]')).toBeChecked();
  await expect.poll(() => seen(page)).toBe(2);
  await page.screenshot({ path: `../test-results/${testInfo.project.name}-difficulty.png`, fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("existing saved games upgrade without losing cards or changing their active pool", async ({ page }) => {
  await begin(page);
  const first = await page.locator("#current-word").innerText();
  await page.getByRole("button", { name: "Runde pausieren" }).click();
  await expect(page.getByRole("heading", { name: "Kurz durchatmen." })).toBeVisible();
  await page.evaluate(() => {
    const old = JSON.parse(localStorage.getItem("wortspiel.state.v1"));
    delete old.settings.difficulty;
    delete old.session.settings.difficulty;
    old.revision += 100;
    localStorage.setItem("wortspiel.state.v1", JSON.stringify(old));
  });
  await page.reload();
  await expect(page.locator(".game-heading")).toContainText("Alles / knifflig");
  await page.getByRole("button", { name: "Weiter geht’s" }).click();
  await expect(page.locator("#current-word")).toHaveText(first);
  await page.getByRole("button", { name: "Spielübersicht" }).click();
  await expect(page.getByLabel("Schwierigkeitsgrad")).toHaveValue("easy");
  await expect.poll(() => seen(page)).toBe(1);
});

test("responsive setup, selectable categories and a complete manual round", async ({
  page,
}, testInfo) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Was kommt auf die Karten?" }),
  ).toBeVisible();
  await expect(page.locator('input[name="category"]:checked')).toHaveCount(dataset.categories.length);
  await page.getByRole("button", { name: "Alle abwählen" }).click();
  await expect(page.locator('input[name="category"]:checked')).toHaveCount(0);
  await page
    .locator("label.category")
    .filter({ hasText: "Glaube & Kirche" })
    .click();
  await expect(page.locator("#selection-count")).toHaveText(
    `1 von ${dataset.categories.length} ausgewählt`,
  );
  await page.getByRole("button", { name: "Los geht’s" }).click();
  await page.getByRole("button", { name: "Wir sind bereit" }).click();
  await expect(page.locator("#current-word")).toBeVisible();
  await expect.poll(() => seen(page)).toBe(1);
  const first = await page.locator("#current-word").innerText();
  await page.screenshot({
    path: `../test-results/${testInfo.project.name}-game.png`,
    fullPage: true,
  });
  await page.getByRole("button", { name: "Erraten", exact: false }).click();
  await expect(page.locator(".round-points")).toHaveText("+1");
  await expect(page.locator("#current-word")).not.toHaveText(first);
  await page.getByRole("button", { name: "Runde pausieren" }).click();
  await expect(
    page.getByRole("heading", { name: "Kurz durchatmen." }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Erraten", exact: false }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Weiter geht’s" }).click();
  await page.getByRole("button", { name: "Letzte Wertung zurück" }).click();
  await expect(page.locator("#current-word")).toHaveText(first);
  await expect(page.locator(".round-points")).toHaveText("0");
  await expect.poll(() => seen(page)).toBe(2);
  await page
    .getByRole("button", { name: "Runde beenden", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Runde beenden", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Das war eure Runde!" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Nächstes Team" }).click();
  await expect(
    page.getByRole("heading", { name: "Team Rakete" }),
  ).toBeVisible();
  expect(errors).toEqual([]);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("reload, offline play, backup import and manual reset retain history correctly", async ({
  page,
  context,
}, testInfo) => {
  await begin(page);
  const first = await page.locator("#current-word").innerText();
  await page.getByRole("button", { name: "Runde pausieren" }).click();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Kurz durchatmen." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Weiter geht’s" }).click();
  await expect(page.locator("#current-word")).toHaveText(first);
  await expect.poll(() => seen(page)).toBe(1);
  await page.getByRole("button", { name: "Spielübersicht" }).click();
  await page
    .getByRole("button", { name: "Kartenspeicher", exact: false })
    .click();
  const backupPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Sicherung herunterladen" }).click();
  const download = await backupPromise;
  const backupPath = await download.path();
  await page
    .getByRole("button", { name: "Kartenspeicher zurücksetzen" })
    .click();
  await page.getByRole("button", { name: "Ja, Speicher zurücksetzen" }).click();
  await expect.poll(() => seen(page)).toBe(0);
  await page.locator("#backup-input").setInputFiles(backupPath);
  await expect(page.locator("#toast")).toContainText("1 zusätzliche Karten");
  await expect.poll(() => seen(page)).toBe(1);
  await page.getByRole("button", { name: "Spiel vorbereiten" }).click();
  await expect(page.locator("#connection")).toHaveText("Offline bereit");
  await page.evaluate(() =>
    navigator.serviceWorker.ready.then(
      () =>
        new Promise((resolve) => {
          if (navigator.serviceWorker.controller) return resolve();
          navigator.serviceWorker.addEventListener(
            "controllerchange",
            resolve,
            { once: true },
          );
        }),
    ),
  );
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole("button", { name: "Los geht’s" })).toBeVisible();
  await page.getByRole("button", { name: "Los geht’s" }).click();
  await page.getByRole("button", { name: "Wir sind bereit" }).click();
  await expect(page.locator("#current-word")).not.toHaveText(first);
  await expect.poll(() => seen(page)).toBe(2);
  await page.screenshot({
    path: `../test-results/${testInfo.project.name}-offline.png`,
    fullPage: true,
  });
});

test("team names and timer settings are saved, empty selection is rejected", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByLabel("Name Team 1").fill("Die Wortfinder");
  await page.getByLabel("Rundenzeit", { exact: true }).selectOption("90");
  await expect(page.getByLabel("Name Team 1")).toHaveValue("Die Wortfinder");
  await page.getByRole("button", { name: "Alle abwählen" }).click();
  await page.getByRole("button", { name: "Los geht’s" }).click();
  await expect(page.locator("#toast")).toContainText(
    "mindestens ein Themenpaket",
  );
  await page.getByRole("button", { name: "Alle auswählen" }).click();
  await page.getByRole("button", { name: "Los geht’s" }).click();
  await expect(
    page.getByRole("heading", { name: "Die Wortfinder" }),
  ).toBeVisible();
});

test("history survives an actual Chrome restart and a new game", async ({}, testInfo) => {
  const profile = testInfo.outputPath("persistent-profile");
  const options = {
    channel: process.env.CI ? undefined : "chrome",
    headless: true,
    baseURL: "http://127.0.0.1:4173",
    viewport: { width: 390, height: 844 },
  };
  let context = await chromium.launchPersistentContext(profile, options);
  try {
    let page = context.pages()[0];
    await begin(page);
    const first = await page.locator("#current-word").innerText();
    await page.getByRole("button", { name: "Runde pausieren" }).click();
    await context.close();
    context = await chromium.launchPersistentContext(profile, options);
    page = context.pages()[0];
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: "Kurz durchatmen." }),
    ).toBeVisible();
    await expect.poll(() => seen(page)).toBe(1);
    await page.getByRole("button", { name: "Spielübersicht" }).click();
    await page.getByRole("button", { name: "Los geht’s" }).click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Neue Partie starten" })
      .click();
    await page.getByRole("button", { name: "Wir sind bereit" }).click();
    await expect(page.locator("#current-word")).not.toHaveText(first);
    await expect.poll(() => seen(page)).toBe(2);
  } finally {
    await context.close();
  }
});

test("timer ends the turn and all teams reach the final result", async ({
  page,
}) => {
  await page.clock.install();
  await page.goto("/");
  await page.getByLabel("Runden pro Team", { exact: true }).selectOption("1");
  await page.getByRole("button", { name: "Los geht’s" }).click();
  await page.getByRole("button", { name: "Wir sind bereit" }).click();
  await page.getByRole("button", { name: "Erraten", exact: false }).click();
  await expect(page.locator(".round-points")).toHaveText("+1");
  await page.clock.fastForward(61000);
  await expect(
    page.getByRole("heading", { name: "Das war eure Runde!" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Nächstes Team" }).click();
  await page.getByRole("button", { name: "Wir sind bereit" }).click();
  await expect(page.locator("#current-word")).toBeVisible();
  await page.clock.fastForward(61000);
  await expect(
    page.getByRole("heading", { name: "Das war eure Runde!" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Zum Ergebnis" }).click();
  await expect(
    page.getByRole("heading", { name: "Team Konfetti gewinnt!" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Neue Partie", exact: false }).click();
  await expect(page.getByRole("button", { name: "Los geht’s" })).toBeVisible();
  await expect.poll(() => seen(page)).toBe(3);
});
