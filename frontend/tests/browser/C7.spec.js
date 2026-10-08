import { test, expect } from "@playwright/test";

// plan-v2 C7: input modality and orientation changes must not re-render or
// touch game state. Runs on the mobile and desktop projects (not @matrix).

async function begin(page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Los geht’s" }).click();
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

const seconds = (page) => page.locator("#timer-number").innerText().then(Number);

test("rotating mid-turn keeps card, timer and card history without re-rendering", async ({ page }) => {
  await begin(page);
  const word = await page.locator("#current-word").innerText();
  const cards = await seen(page);
  const start = await seconds(page);
  // Mark the live DOM node: a render() would replace it.
  await page.locator("#current-word").evaluate((node) => (node.dataset.c7 = "same"));
  const { width, height } = page.viewportSize();
  const portrait = { width: Math.min(width, height), height: Math.max(width, height) };
  const landscape = { width: portrait.height, height: portrait.width };

  for (const [size, orientation] of [
    [portrait, "portrait"],
    [landscape, "landscape"],
    [portrait, "portrait"],
  ]) {
    await page.setViewportSize(size);
    await expect(page.locator("html")).toHaveAttribute("data-orientation", orientation);
    await page.waitForTimeout(400);
    await expect(page.locator("#current-word")).toHaveText(word);
    await expect(page.locator("#current-word")).toHaveAttribute("data-c7", "same");
  }

  await expect.poll(() => seconds(page), { timeout: 5000 }).toBeLessThan(start);
  const before = await seconds(page);
  await expect.poll(() => seconds(page), { timeout: 5000 }).toBeLessThan(before);
  expect(await seen(page)).toBe(cards);
  await expect(page.locator("#current-word")).toHaveText(word);
});

test("touch input enlarges targets, mouse movement switches back", async ({ page }) => {
  const html = page.locator("html");
  // Before any interaction the value comes from media queries, not the UA.
  await page.goto("/");
  const initial = await page.evaluate(() =>
    matchMedia("(pointer: fine)").matches || !matchMedia("(any-pointer: coarse)").matches ? "mouse" : "touch",
  );
  await expect(html).toHaveAttribute("data-input", initial);
  await begin(page);
  const touch = () =>
    page.evaluate(() =>
      document.body.dispatchEvent(
        new PointerEvent("pointerdown", { pointerType: "touch", bubbles: true, isPrimary: true }),
      ),
    );
  await touch();
  await expect(html).toHaveAttribute("data-input", "touch");
  const heights = await page.locator(".game-action").evaluateAll((buttons) =>
    buttons.map((button) => button.getBoundingClientRect().height),
  );
  expect(heights).toHaveLength(3);
  for (const height of heights) expect(height).toBeGreaterThanOrEqual(64);
  for (const box of await page.locator(".play-main .icon-button, .play-bottom .text-button").evaluateAll((nodes) =>
    nodes.map((node) => node.getBoundingClientRect()),
  ))
    expect(box.height).toBeGreaterThanOrEqual(44);

  // A tiny jitter right after a tap must not flip back to mouse.
  await page.evaluate(() => {
    for (const x of [10, 11])
      document.body.dispatchEvent(
        new PointerEvent("pointermove", { pointerType: "mouse", clientX: x, clientY: 10, bubbles: true }),
      );
  });
  await expect(html).toHaveAttribute("data-input", "touch");

  // Real mouse movement (after the post-tap grace period) switches to mouse.
  await page.waitForTimeout(600);
  await expect
    .poll(async () => {
      await page.evaluate(() => {
        for (const x of [20, 40, 60])
          document.body.dispatchEvent(
            new PointerEvent("pointermove", { pointerType: "mouse", clientX: x, clientY: 30, bubbles: true }),
          );
      });
      return html.getAttribute("data-input");
    })
    .toBe("mouse");

  // Category labels on the setup screen stay large enough for touch.
  await touch();
  await page.getByRole("button", { name: "Spielübersicht" }).click();
  for (const box of await page.locator("label.category").evaluateAll((nodes) =>
    nodes.map((node) => node.getBoundingClientRect()),
  ))
    expect(box.height).toBeGreaterThanOrEqual(44);
});
