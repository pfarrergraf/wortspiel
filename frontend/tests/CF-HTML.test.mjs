import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, dirname, resolve } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

test("worker changes invalidate caches while Windows/Linux line endings do not", async () => {
  const root = await mkdtemp(join(tmpdir(), "wortspiel-CF-HTML-"));
  const generator = await readFile(new URL("../scripts/service-worker.mjs", import.meta.url), "utf8");
  try {
    await mkdir(join(root, "scripts")); await mkdir(join(root, "dist"));
    await writeFile(join(root, "dist", "index.html"), "<!doctype html><title>Game</title>");
    await writeFile(join(root, "dist", "projekt.html"), "<!doctype html><title>Project</title>");
    const build = async source => {
      await writeFile(join(root, "scripts", "service-worker.mjs"), source);
      await promisify(execFile)(process.execPath, [join(root, "scripts", "service-worker.mjs")]);
      return (await readFile(join(root, "dist", "sw.js"), "utf8")).match(/const CACHE = '([^']+)'/)[1];
    };
    const lf = generator.replace(/\r\n/g, "\n");
    const first = await build(lf);
    assert.equal(await build(lf.replace(/\n/g, "\r\n")), first);
    assert.notEqual(await build(lf + "\n// Changed worker implementation\n"), first);
  } finally {
    assert.equal(dirname(root), resolve(tmpdir()));
    await rm(root, { recursive: true, force: true });
  }
});
