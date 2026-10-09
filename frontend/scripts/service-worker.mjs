import { readdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";

const root = new URL("../dist/", import.meta.url);
async function list(directory, prefix = "") {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map((entry) =>
      entry.isDirectory()
        ? list(new URL(`${entry.name}/`, directory), `${prefix}${entry.name}/`)
        : `${prefix}${entry.name}`,
    ),
  );
  return nested.flat();
}
const files = (await list(root)).filter((file) => file !== "sw.js");
// Hash HTML and host policies too: policy changes must replace cached responses.
// Host config is not served by Pages; index.html redirects to the scope root.
const requests = files.filter((file) => !["index.html", "_headers", "_redirects"].includes(file));
const hash = createHash("sha256");
for (const file of files.sort())
  hash.update(await readFile(new URL(file, root)));
const version = hash.digest("hex").slice(0, 14);
const worker = `// Generated from the complete production build. No external resources required.
const CACHE = 'wortspiel-${version}';
const PREFIX = 'wortspiel-';
const FILES = ${JSON.stringify(["./", ...requests.map((file) => `./${file}`)])};
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(async cache => {
    await cache.addAll(FILES);
    const home = await cache.match(self.registration.scope);
    if (!home) throw new Error('Offline start page missing');
    // Keep the explicit HTML entry usable without caching a redirected fetch.
    // New Response also removes the redirected flag for offline navigation.
    await cache.put(new URL('./index.html', self.registration.scope), new Response(await home.arrayBuffer(), {
      status: home.status, statusText: home.statusText, headers: home.headers,
    }));
    await self.skipWaiting();
  }));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith(PREFIX) && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  const scope = new URL(self.registration.scope);
  if (event.request.method !== 'GET' || url.origin !== scope.origin || !url.pathname.startsWith(scope.pathname)) return;
  event.respondWith(caches.open(CACHE).then(async cache => {
    const cached = await cache.match(event.request, { ignoreSearch: event.request.mode === 'navigate', ignoreVary: true });
    if (cached) return cached;
    try { return await fetch(event.request); }
    catch (error) {
      if (event.request.mode === 'navigate') return await cache.match(self.registration.scope) || Response.error();
      throw error;
    }
  }));
});
`;
await writeFile(new URL("sw.js", root), worker);
await writeFile(new URL(".nojekyll", root), "");
console.log(`Offline-Cache ${version}: ${files.length} Dateien`);
