import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, writeFile, rm, copyFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
const exec = promisify(execFile);

async function fixture(run) {
  const root = await mkdtemp(join(tmpdir(), "wortspiel-CF-1-"));
  try {
    await mkdir(join(root, "scripts")); await mkdir(join(root, "dist"));
    await copyFile(new URL("../scripts/service-worker.mjs", import.meta.url), join(root, "scripts", "service-worker.mjs"));
    for (const [file, body] of Object.entries({ "index.html": "<!doctype html><title>Game</title>", "app.js": "export const game=1;", "_headers": "/*\n  X-Content-Type-Options: nosniff\n", "_redirects": "/old / 302\n" }))
      await writeFile(join(root, "dist", file), body);
    const build = async () => {
      await exec(process.execPath, [join(root, "scripts", "service-worker.mjs")]);
      const worker = await readFile(join(root, "dist", "sw.js"), "utf8");
      return { version: worker.match(/const CACHE = '([^']+)'/)[1], files: JSON.parse(worker.match(/const FILES = (.+);/)[1]) };
    };
    await run(root, build);
  } finally { await rm(root, { recursive: true, force: true }); }
}

test("host-only metadata and redirected index are never fetched during precache", () => fixture(async (_, build) => {
  const { files } = await build();
  assert.ok(files.includes("./"));
  assert.ok(files.includes("./app.js"));
  for (const file of ["./_headers", "./_redirects", "./index.html", "./sw.js"])
    assert.ok(!files.includes(file), `${file} must not be a network precache request`);
}));

test("HTML and host policy changes each invalidate the offline cache", () => fixture(async (root, build) => {
  const first = await build();
  await writeFile(join(root, "dist", "index.html"), "<!doctype html><title>Updated rules</title>");
  const second = await build();
  assert.notEqual(second.version, first.version);
  await writeFile(join(root, "dist", "_headers"), "/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: no-referrer\n");
  const third = await build();
  assert.notEqual(third.version, second.version);
  assert.ok(!third.files.includes("./_headers"));
}));
