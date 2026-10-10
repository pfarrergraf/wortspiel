import { readFile, readdir, rm } from "node:fs/promises";
import { createHash } from "node:crypto";
import assert from "node:assert/strict";

const root = new URL("../", import.meta.url);
const read = path => readFile(new URL(path, root), "utf8");
const config = JSON.parse(await read("capacitor.config.json"));
assert.equal(config.appId, "io.github.pfarrergraf.ludeverbis");
assert.equal(config.server.hostname, "localhost");
assert.equal(config.server.androidScheme, "https");
assert.equal(config.server.url, undefined, "No live website in the native package");
assert.equal(config.server.allowNavigation, undefined);
assert.equal(config.android.webContentsDebuggingEnabled, false);
const publicRoot = new URL("android/app/src/main/assets/public/", root);
// Android serves the version bundled in the app, never a stale SW or host policy.
for (const file of ["sw.js", "_headers", "_redirects", ".nojekyll"]) await rm(new URL(file, publicRoot), { force: true });
async function list(directory, prefix = "") {
  const paths = [];
  for (const item of await readdir(directory, { withFileTypes: true })) {
    if (item.isDirectory()) paths.push(...await list(new URL(`${item.name}/`, directory), `${prefix}${item.name}/`));
    else paths.push(`${prefix}${item.name}`);
  }
  return paths.sort();
}
let verified = 0;
for (const path of await list(new URL("../frontend/dist/", root))) {
  if (["sw.js", "_headers", "_redirects", ".nojekyll"].includes(path)) continue;
  const expected = await readFile(new URL(`../frontend/dist/${path}`, root));
  const actual = await readFile(new URL(path, publicRoot));
  assert.equal(createHash("sha256").update(actual).digest("hex"), createHash("sha256").update(expected).digest("hex"), path);
  verified++;
}
const variables = await read("android/variables.gradle");
assert.match(variables, /targetSdkVersion\s*=\s*36/);
assert.match(variables, /compileSdkVersion\s*=\s*36/);
const manifest = await read("android/app/src/main/AndroidManifest.xml");
assert.match(manifest, /android:allowBackup="false"/);
assert.match(manifest, /android:usesCleartextTraffic="false"/);
assert.deepEqual([...manifest.matchAll(/<uses-permission android:name="([^"]+)"/g)].map(m => m[1]), ["android.permission.INTERNET"]);
console.log(`Android: API 36, ${verified} exact bundled web assets, no microphone/storage permissions or remote app URL.`);
