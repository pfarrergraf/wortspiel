import { test, expect } from "@playwright/test";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname } from "node:path";

const DIST = new URL("../../dist/", import.meta.url);
const pages = [
  ["projekt", "Für gute gemeinsame Runden."],
  ["impressum", "Impressum"],
  ["datenschutz", "Datenschutz beim Spielen"],
  ["unterstuetzen", "Jugendarbeit möglich machen."],
];
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".webmanifest": "application/manifest+json", ".png": "image/png", ".svg": "image/svg+xml", ".woff2": "font/woff2", ".txt": "text/plain" };

async function serve(prefix) {
  const server = createServer(async (request, response) => {
    const url = new URL(request.url, "http://localhost");
    if (!url.pathname.startsWith(prefix)) return response.writeHead(404).end();
    let file = decodeURIComponent(url.pathname.slice(prefix.length));
    if (file.includes("..") || ["_headers", "_redirects"].includes(file)) return response.writeHead(404).end();
    if (file.endsWith(".html")) {
      const canonical = file === "index.html" ? "" : file.slice(0, -5);
      return response.writeHead(308, { Location: prefix + canonical + url.search }).end();
    }
    if (!file) file = "index.html";
    else if (!extname(file)) file += ".html";
    try {
      const body = await readFile(new URL(file, DIST));
      response.writeHead(200, { "content-type": TYPES[extname(file)] || "application/octet-stream", "cache-control": "no-cache" }).end(body);
    } catch { response.writeHead(404).end(); }
  });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  return { base: `http://127.0.0.1:${server.address().port}${prefix}`, close: () => new Promise(resolve => server.close(resolve)) };
}

for (const prefix of ["/", "/wortspiel/"]) {
  test(`CF-HTML every Pages HTML redirect has usable offline aliases (${prefix})`, async ({ browser }) => {
    const server = await serve(prefix);
    const context = await browser.newContext();
    const page = await context.newPage();
    const state = () => page.evaluate(() => JSON.parse(localStorage.getItem("wortspiel.state.v1")));
    try {
      await page.goto(server.base);
      await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));
      const cached = await page.evaluate(async () => {
        const cache = await caches.open((await caches.keys()).find(key => key.startsWith("wortspiel-")));
        return Promise.all((await cache.keys()).map(async request => ({ url: request.url, redirected: (await cache.match(request)).redirected })));
      });
      expect(cached.every(entry => !entry.redirected)).toBe(true);
      for (const [name] of pages)
        for (const suffix of [name, `${name}.html`]) expect(cached.map(entry => entry.url)).toContain(server.base + suffix);

      await page.getByRole("button", { name: "Los geht’s", exact: true }).click();
      await page.getByRole("button", { name: "Wir sind bereit", exact: true }).click();
      await page.locator('[data-action="correct"]').click();
      await expect(page.locator(".round-points")).toHaveText("+1");
      await page.getByRole("button", { name: "Runde pausieren", exact: true }).click();
      const before = await state();
      await context.setOffline(true);
      for (const [name, heading] of pages) {
        for (const suffix of [`${name}.html?offline=1`, `${name}?offline=1`]) {
          await page.goto(server.base + suffix);
          await expect(page.getByRole("heading", { name: heading, exact: true })).toBeVisible();
          expect(await state()).toEqual(before);
        }
      }
      for (const suffix of ["index.html", "?from=homescreen", ""]) {
        await page.goto(server.base + suffix);
        await expect(page.getByRole("heading", { name: "Kurz durchatmen.", exact: true })).toBeVisible();
        // App startup commits its revision/checkpoint; all game data stays.
        const after = await state();
        expect(after.schema).toBe(before.schema);
        expect(after.groups).toEqual(before.groups);
        expect(after.settings).toEqual(before.settings);
        expect(after.session).toEqual(before.session);
        expect(after.revision).toBeGreaterThanOrEqual(before.revision);
      }
    } finally { await context.close(); await server.close(); }
  });
}
