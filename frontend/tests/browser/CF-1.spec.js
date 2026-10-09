import { test, expect } from "@playwright/test";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname } from "node:path";

const DIST = new URL("../../dist/", import.meta.url);
const CSP = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; manifest-src 'self'; worker-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'none'";
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".webmanifest": "application/manifest+json", ".png": "image/png", ".svg": "image/svg+xml", ".woff2": "font/woff2", ".woff": "font/woff", ".txt": "text/plain" };

async function serve(prefix) {
  const requests = [];
  const server = createServer(async (request, response) => {
    const url = new URL(request.url, "http://localhost");
    requests.push(url.pathname);
    if (!url.pathname.startsWith(prefix)) return response.writeHead(404).end();
    const path = decodeURIComponent(url.pathname.slice(prefix.length)) || "index.html";
    if (path.includes("..") || ["_headers", "_redirects"].includes(path)) return response.writeHead(404).end();
    // Cloudflare Pages normalizes explicit index.html to the scope root.
    if (url.pathname === `${prefix}index.html`) return response.writeHead(308, { Location: prefix }).end();
    try {
      const body = await readFile(new URL(path, DIST));
      response.writeHead(200, { "content-type": TYPES[extname(path)] || "application/octet-stream", "content-security-policy": CSP, "x-content-type-options": "nosniff", "referrer-policy": "no-referrer", "cache-control": path === "sw.js" ? "no-cache" : "max-age=0" });
      response.end(body);
    } catch { response.writeHead(404).end(); }
  });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  return { base: `http://127.0.0.1:${server.address().port}${prefix}`, prefix, requests, close: () => new Promise(resolve => server.close(resolve)) };
}

async function controlled(page) {
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller), { timeout: 15000 });
}
const state = page => page.evaluate(() => JSON.parse(localStorage.getItem("wortspiel.state.v1")));

for (const prefix of ["/", "/wortspiel/"]) {
  test(`CF-1 redirected index and unavailable host files preserve offline navigation (${prefix})`, async ({ browser }) => {
    const server = await serve(prefix);
    const context = await browser.newContext({ viewport: { width: 393, height: 852 } });
    const page = await context.newPage();
    const errors = []; page.on("pageerror", error => errors.push(error.message));
    try {
      await page.goto(server.base);
      await expect(page.getByRole("button", { name: "Los geht’s", exact: true })).toBeVisible();
      await controlled(page);
      const cache = await page.evaluate(async () => {
        const name = (await caches.keys()).find(key => key.startsWith("wortspiel-"));
        const cache = await caches.open(name);
        const requests = await cache.keys();
        const entries = await Promise.all(requests.map(async request => ({ url: request.url, redirected: (await cache.match(request)).redirected })));
        const scope = (await navigator.serviceWorker.ready).scope;
        return { entries, root: await (await cache.match(scope)).text(), index: await (await cache.match(new URL("./index.html", scope))).text() };
      });
      expect(cache.root).toBe(cache.index);
      expect(cache.entries.every(entry => !entry.redirected)).toBe(true);
      expect(cache.entries.map(entry => entry.url)).toContain(`${server.base}index.html`);
      expect(server.requests).not.toContain(`${prefix}index.html`);
      expect(server.requests).not.toContain(`${prefix}_headers`);
      expect(server.requests).not.toContain(`${prefix}_redirects`);
      await page.getByRole("button", { name: "Los geht’s", exact: true }).click();
      await page.getByRole("button", { name: "Wir sind bereit", exact: true }).click();
      await expect(page.locator("#current-word")).toBeVisible();
      await page.locator('[data-action="correct"]').click();
      await expect(page.locator(".round-points")).toHaveText("+1");
      await page.getByRole("button", { name: "Runde pausieren", exact: true }).click();
      const before = await state(page);
      await context.setOffline(true);
      for (const suffix of ["index.html", "?from=homescreen", ""]) {
        await page.goto(server.base + suffix);
        await expect(page.getByRole("heading", { name: "Kurz durchatmen." })).toBeVisible();
        const after = await state(page);
        expect(after.groups).toEqual(before.groups);
        expect(after.session.scores).toEqual(before.session.scores);
        expect(after.session.current).toBe(before.session.current);
      }
      expect(errors).toEqual([]);
    } finally { await context.close(); await server.close(); }
  });
}

test("CF-1 CSP allows the startup retry button without inline script or data reset", async ({ browser }) => {
  const server = await serve("/");
  const context = await browser.newContext();
  await context.addInitScript(() => {
    localStorage.setItem("wortspiel.state.v1", '{"schema":');
    window.__qaViolations = [];
    document.addEventListener("securitypolicyviolation", event => window.__qaViolations.push(event.violatedDirective));
  });
  const page = await context.newPage();
  try {
    await page.goto(server.base);
    await expect(page.locator(".startup-error")).toBeVisible();
    await page.getByRole("button", { name: "Erneut versuchen", exact: true }).click();
    await expect.poll(() => server.requests.filter(path => path === "/").length).toBeGreaterThanOrEqual(2);
    await expect(page.locator(".startup-error")).toContainText("bleibt unverändert gespeichert");
    expect(await page.evaluate(() => localStorage.getItem("wortspiel.state.v1"))).toBe('{"schema":');
    expect(await page.evaluate(() => window.__qaViolations)).toEqual([]);
  } finally { await context.close(); await server.close(); }
});
