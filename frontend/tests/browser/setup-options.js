// Tests which configure optional values follow the explicit phone entry.
// Gameplay/layout tests retain the default compact route.
export async function openSetupOptions(page) {
  await page.locator("#setup-form").waitFor({ state: "attached" });
  if (!await page.getByLabel("Name Team 1").isVisible())
    await page.getByRole("button", { name: "Spiel anpassen", exact: true }).click();
}
