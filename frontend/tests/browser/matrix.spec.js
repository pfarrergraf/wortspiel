// @matrix layout checks across the screen matrix in playwright.config.js.
// Owned by plan task C9; layout tasks C2–C8 make these pass.
import { test, expect } from "@playwright/test";

async function overflowX(page) {
  return page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
}

// Everything needed during a turn must be visible without scrolling.
async function hiddenPlayControls(page) {
  return page.evaluate(() => {
    const selectors = {
      Begriff: "#current-word",
      Timer: "#timer",
      Tabuwörter: ".forbidden-words",
      Erraten: '[data-action="correct"]',
      Überspringen: '[data-action="skip"]',
      Tabuwort: '[data-action="taboo"]',
    };
    return Object.entries(selectors)
      .filter(([, selector]) => {
        const box = document.querySelector(selector)?.getBoundingClientRect();
        return (
          !box ||
          box.top < 0 ||
          box.left < 0 ||
          box.bottom > window.innerHeight ||
          box.right > window.innerWidth
        );
      })
      .map(([name]) => name);
  });
}

// Baseline at v2-foundation: on these screens the card or the scoring buttons
// need scrolling during a turn. A C task that fixes one removes it here
// (Playwright reports "expected to fail, but passed" until it is removed).
const KNOWN_LAYOUT_GAPS = {
  "phone-small": "C2",
  "iphone-se": "C2",
  "iphone-landscape": "C3",
};

test("@matrix setup and play screens fit the screen", async ({ page }, testInfo) => {
  const gap = KNOWN_LAYOUT_GAPS[testInfo.project.name];
  test.fail(Boolean(gap), `known layout gap, fixed by ${gap}`);
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Los geht’s" })).toBeVisible();
  expect(await overflowX(page), "horizontal overflow on setup").toBeLessThanOrEqual(0);
  await page.getByRole("button", { name: "Los geht’s" }).click();
  await page.getByRole("button", { name: "Wir sind bereit" }).click();
  await expect(page.locator("#current-word")).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: `../test-results/matrix-${testInfo.project.name}-play.png` });
  expect(await overflowX(page), "horizontal overflow while playing").toBeLessThanOrEqual(0);
  const hidden = await hiddenPlayControls(page);
  // Acceptance criterion 2 (docs/plan-v2.md, Paket C). Soft until C2–C6 land.
  expect.soft(hidden, "play controls outside the first screen").toEqual([]);
});
