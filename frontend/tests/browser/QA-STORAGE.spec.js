import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";

const KEY = "wortspiel.state.v1";

for (const relative of [-1, 0]) {
  test(`older local history is preserved against a ${relative ? "newer" : "same-revision"} database fork`, async ({ context }) => {
    const [a, b] = await harness(context);
    const committed = await a.evaluate(key => JSON.parse(localStorage.getItem(key)), KEY);
    const local = structuredClone(committed);
    local.revision += relative;
    local.groups[Object.keys(local.groups)[0]].seen["de:birne"] = 42;
    const raw = JSON.stringify(local);
    await b.evaluate(({ key, raw }) => localStorage.setItem(key, raw), { key: KEY, raw });
    const result = await a.evaluate(async key => {
      const { store, engine, categories } = window.__qa;
      const { Storage } = await import("./storage.js");
      const errors = [];
      for (const operation of [() => new Storage().open(engine.initialState(categories)), () => store.update(() => {}), () => store.snapshot()]) {
        try { await operation(); errors.push(null); } catch (error) { errors.push(error.name); }
      }
      const saved = await new Promise((resolve, reject) => {
        const request = store.db.transaction("state").objectStore("state").get(key);
        request.onsuccess = () => resolve(request.result); request.onerror = reject;
      });
      return { errors, saved };
    }, KEY);
    expect(result.errors).toEqual(["StorageLineageError", "StorageLineageError", "StorageLineageError"]);
    expect(result.saved).toEqual(committed);
    expect(await b.evaluate(key => localStorage.getItem(key), KEY)).toBe(raw);
    await Promise.all([a.close(), b.close()]);
  });
}

for (const mode of ["indexeddb", "local"]) {
  for (const revision of [-1, Number.MAX_SAFE_INTEGER + 1, Number.MAX_SAFE_INTEGER]) {
    test(`malformed revision or exhausted counter preserves original snapshot (${mode}, ${revision})`, async ({ context }) => {
      const [a, b] = await harness(context, mode);
      const before = await a.evaluate(key => JSON.parse(localStorage.getItem(key)), KEY);
      before.revision = revision;
      const raw = JSON.stringify(before);
      const result = await a.evaluate(async ({ key, before, raw, mode }) => {
        const { store, engine, categories } = window.__qa;
        localStorage.setItem(key, raw);
        if (mode === "indexeddb") await new Promise((resolve, reject) => {
          const tx = store.db.transaction("state", "readwrite"); tx.objectStore("state").put(before, key); tx.oncomplete = resolve; tx.onerror = reject;
        });
        const { Storage } = await import("./storage.js");
        let message;
        try { await new Storage().open(engine.initialState(categories)); } catch (error) { message = error.message; }
        let saved;
        if (store.db) saved = await new Promise((resolve, reject) => {
          const request = store.db.transaction("state").objectStore("state").get(key); request.onsuccess = () => resolve(request.result); request.onerror = reject;
        });
        return { message, raw: localStorage.getItem(key), saved };
      }, { key: KEY, before, raw, mode });
      expect(result.message).toBeTruthy();
      expect(result.raw).toBe(raw);
      if (mode === "indexeddb") expect(result.saved).toEqual(before);
      await Promise.all([a.close(), b.close()]);
    });
  }
}

test("zero revision local snapshot is kept instead of an empty initial state", async ({ context }) => {
  const [a, b] = await harness(context, "local");
  const before = await a.evaluate(key => JSON.parse(localStorage.getItem(key)), KEY);
  before.revision = 0;
  const after = await a.evaluate(async ({ key, before }) => {
    localStorage.setItem(key, JSON.stringify(before));
    const { Storage } = await import("./storage.js");
    return new Storage().open(window.__qa.engine.initialState(window.__qa.categories));
  }, { key: KEY, before });
  expect(after).toEqual({ ...before, revision: 1 });
  await Promise.all([a.close(), b.close()]);
});

async function harness(context, mode = "indexeddb") {
  await context.route("**/__qa/**", async (route) => {
    const path = new URL(route.request().url()).pathname.split("/__qa/")[1];
    if (path === "index.html") return route.fulfill({ contentType: "text/html", body: "<!doctype html><title>Storage regression harness</title>" });
    if (!/^(storage|engine)\.js$|^rules\/[a-z-]+\.js$/.test(path)) return route.abort();
    await route.fulfill({ contentType: "text/javascript", body: await readFile(new URL(`../../src/${path}`, import.meta.url), "utf8") });
  });
  const pages = await Promise.all([context.newPage(), context.newPage()]);
  for (const [index, page] of pages.entries()) {
    const backend = Array.isArray(mode) ? mode[index] : mode;
    if (backend.startsWith("local")) await page.addInitScript(() => {
      Object.defineProperty(window, "indexedDB", { get: () => { throw new Error("IndexedDB unavailable in regression test"); } });
    });
    if (backend.endsWith("no-locks")) await page.addInitScript(() => {
      Object.defineProperty(navigator, "locks", { value: undefined });
    });
    await page.goto("/__qa/index.html");
    await page.evaluate(async () => {
      const { Storage } = await import("./storage.js");
      const engine = await import("./engine.js");
      const categories = [{ id: "food" }];
      const cards = ["Apfel", "Brot", "Milch", "Birne"].map((word) => ({ id: `de:${word.toLowerCase()}`, word, taboo: ["Essen"], categories: ["food"], difficulty: "easy" }));
      const state = engine.initialState(categories);
      engine.createSession(state, cards, categories);
      engine.startTurn(state, cards, Date.now(), () => 0);
      const store = new Storage();
      await store.open(state);
      window.__qa = { store, engine, cards, categories };
    });
  }
  for (const page of pages) await page.evaluate((key) => {
    window.__qa.store.state = JSON.parse(localStorage.getItem(key));
  }, KEY);
  return pages;
}

const modes = ["indexeddb", "indexeddb-no-locks", "local", "local-no-locks", ["indexeddb", "local"], ["indexeddb-no-locks", "local-no-locks"]];
for (const mode of modes) {
  test(`stale card scoring is rejected without modifying points/history (${mode})`, async ({ context }) => {
    const [a, b] = await harness(context, mode);
    const before = await b.evaluate(() => structuredClone(window.__qa.store.state));
    await a.evaluate(async () => {
      const { store, engine, cards } = window.__qa;
      await store.update(s => engine.recordResult(s, cards, "correct", Date.now(), () => 0), { expectedRevision: store.state.revision });
    });
    const rejection = await b.evaluate(async () => {
      const { store, engine, cards } = window.__qa;
      try {
        await store.update(s => engine.recordResult(s, cards, "correct", Date.now(), () => 0), { expectedRevision: store.state.revision });
        return null;
      } catch (error) { return { name: error.name, message: error.message }; }
    });
    expect(rejection?.name).toBe("StorageConflictError");
    const after = await a.evaluate((key) => JSON.parse(localStorage.getItem(key)), KEY);
    expect(after.session.scores).toEqual([1, 0]);
    expect(after.session.log).toHaveLength(1);
    expect(Object.keys(after.groups[Object.keys(before.groups)[0]].seen)).toHaveLength(2);
    expect(after.session.current).toBe("de:brot");
    await Promise.all([a.close(), b.close()]);
  });
}

for (const mode of modes) {
  test(`concurrent reservations wait for the writer and never expose the same fresh ID (${mode})`, async ({ context }) => {
    const [a, b] = await harness(context, mode);
    const held = a.evaluate(async () => {
      const { store, engine, cards } = window.__qa;
      await store.withLock(async () => {
        window.__qa.release = null;
        const gate = new Promise(resolve => { window.__qa.release = resolve; });
        await gate;
        await store.write(s => engine.drawCard(s, cards, () => 0), undefined);
      });
      return store.state.session.current;
    });
    await a.waitForFunction(() => Boolean(window.__qa.release));
    const competing = b.evaluate(async () => {
      const { store, engine, cards } = window.__qa;
      window.__qa.attempted = true;
      await store.update(s => engine.drawCard(s, cards, () => 0));
      window.__qa.completed = true;
      return store.state.session.current;
    });
    await b.waitForFunction(() => window.__qa.attempted);
    expect(await b.evaluate(() => Boolean(window.__qa.completed))).toBe(false);
    expect(await a.evaluate(key => JSON.parse(localStorage.getItem(key)).session.current, KEY)).toBe("de:apfel");
    await a.evaluate(() => window.__qa.release());
    const [first, second] = await Promise.all([held, competing]);
    expect([first, second]).toEqual(["de:brot", "de:milch"]);
    const saved = await b.evaluate(key => JSON.parse(localStorage.getItem(key)), KEY);
    expect(Object.values(saved.groups).flatMap(g => Object.keys(g.seen))).toEqual(["de:apfel", "de:brot", "de:milch"]);
    await Promise.all([a.close(), b.close()]);
  });

  test(`failed mutations abort completely and release the writer lock (${mode})`, async ({ context }) => {
    const [a, b] = await harness(context, mode);
    const before = await a.evaluate(key => JSON.parse(localStorage.getItem(key)), KEY);
    const message = await a.evaluate(async () => {
      try { await window.__qa.store.update(s => {
        s.groups[Object.keys(s.groups)[0]].seen["de:uncommitted"] = 42;
        s.session.scores[0] = 99;
        throw new Error("Intentional invalid mutation");
      }); } catch (error) { return error.message; }
    });
    expect(message).toContain("Intentional invalid mutation");
    expect(await a.evaluate(key => JSON.parse(localStorage.getItem(key)), KEY)).toEqual(before);
    await b.evaluate(async () => {
      const { store, engine, cards } = window.__qa;
      await store.update(s => engine.recordResult(s, cards, "correct", Date.now(), () => 0));
    });
    const saved = await b.evaluate(key => JSON.parse(localStorage.getItem(key)), KEY);
    expect(saved.session.scores).toEqual([1, 0]);
    expect(saved.groups[Object.keys(saved.groups)[0]].seen).not.toHaveProperty("de:uncommitted");
    expect(await a.evaluate(() => Object.keys(localStorage).filter(key => key.startsWith("wortspiel.state.v1.lock:")))).toEqual([]);
    await Promise.all([a.close(), b.close()]);
  });
}

test("no-Web-Locks fallback times out safely instead of expiring another writer's ticket", async ({ context }) => {
  const [a, b] = await harness(context, "local-no-locks");
  const before = await a.evaluate(key => JSON.parse(localStorage.getItem(key)), KEY);
  const message = await a.evaluate(async () => {
    localStorage.setItem("wortspiel.state.v1.lock:blocked-writer", JSON.stringify({ choosing: false, number: 1 }));
    window.__qa.store.lockTimeout = 80;
    try { await window.__qa.store.update(s => { s.session.scores[0] = 99; }); }
    catch (error) { return error.message; }
  });
  expect(message).toContain("anderen Tab");
  expect(await a.evaluate(key => JSON.parse(localStorage.getItem(key)), KEY)).toEqual(before);
  expect(await a.evaluate(() => Object.keys(localStorage).filter(key => key.startsWith("wortspiel.state.v1.lock:")))).toEqual(["wortspiel.state.v1.lock:blocked-writer"]);
  // Explicit harness cleanup after the simulated writer is stopped, never a
  // production TTL that could let a suspended tab overwrite a later writer.
  await a.evaluate(() => localStorage.removeItem("wortspiel.state.v1.lock:blocked-writer"));
  await b.evaluate(async () => {
    const { store, engine, cards } = window.__qa;
    await store.update(s => engine.recordResult(s, cards, "correct", Date.now(), () => 0));
  });
  expect((await b.evaluate(key => JSON.parse(localStorage.getItem(key)), KEY)).session.scores).toEqual([1, 0]);
  await Promise.all([a.close(), b.close()]);
});

for (const mode of ["indexeddb", "local", "local-no-locks"]) {
  test(`visible stale scoring refreshes the card and never awards another point (${mode})`, async ({ page: a, context }) => {
    if (mode.startsWith("local")) await context.addInitScript(() => {
      Object.defineProperty(window, "indexedDB", { get: () => { throw new Error("IndexedDB unavailable in regression test"); } });
    });
    if (mode.endsWith("no-locks")) await context.addInitScript(() => Object.defineProperty(navigator, "locks", { value: undefined }));
    // Register before the application's listener. Window is the event target;
    // adding a later capture listener does not precede earlier target listeners.
    await a.addInitScript(() => window.addEventListener("storage", event => {
      if (window.__QA_FreezeStorage) event.stopImmediatePropagation();
    }));
    await a.goto("/");
    const b = await context.newPage();
    await b.goto("/");
    await a.getByRole("button", { name: "Los geht’s", exact: true }).click();
    await a.getByRole("button", { name: "Wir sind bereit", exact: true }).click();
    await b.getByRole("button", { name: "Partie fortsetzen", exact: true }).click();
    await b.getByRole("button", { name: "Weiter geht’s", exact: true }).click();
    await expect(a.locator("#current-word")).toBeVisible();
    const original = await a.locator("#current-word").innerText();
    // Simulate a suspended/missed notification while its old card stays visible.
    await a.evaluate(() => { window.__QA_FreezeStorage = true; });
    await b.locator('[data-action="correct"]').click();
    await expect(b.locator("#current-word")).not.toHaveText(original);
    const current = await b.locator("#current-word").innerText();
    await expect(a.locator("#current-word")).toHaveText(original);
    await a.locator('[data-action="correct"]').click();
    await expect(a.locator("#toast")).toContainText("Es wurde nichts gewertet");
    await expect(a.locator("#current-word")).toHaveText(current);
    const saved = await b.evaluate(key => JSON.parse(localStorage.getItem(key)), KEY);
    expect(saved.session.scores).toEqual([1, 0]);
    expect(saved.session.log).toHaveLength(1);
    expect(Object.values(saved.groups).flatMap(g => Object.keys(g.seen))).toHaveLength(2);
    await b.close();
  });
}

for (const name of ["legacy-v1", "legacy-v2-retired", "legacy-v2-pantomime"]) {
  for (const localOnly of [false, true]) {
    test(`${name} round survives real startup and reload (${localOnly ? "local" : "indexeddb"})`, async ({ page }) => {
      const fixture = JSON.parse(await readFile(new URL(`../fixtures/QA-STORAGE/${name}.json`, import.meta.url)));
      await page.addInitScript(({ fixture, localOnly }) => {
        if (localOnly) Object.defineProperty(window, "indexedDB", { get: () => { throw new Error("IndexedDB unavailable in regression test"); } });
        if (!sessionStorage.getItem("QA-STORAGE-seeded")) {
          localStorage.setItem("wortspiel.state.v1", JSON.stringify(fixture));
          sessionStorage.setItem("QA-STORAGE-seeded", "yes");
        }
      }, { fixture, localOnly });
      await page.goto("/");
      await expect(page.getByRole("heading", { name: "Kurz durchatmen." })).toBeVisible();
      const read = () => page.evaluate(key => JSON.parse(localStorage.getItem(key)), KEY);
      const migrated = await read();
      expect(migrated.groups).toEqual(fixture.groups);
      expect(migrated.session.scores).toEqual(fixture.session.scores);
      expect(migrated.session.turns).toEqual(fixture.session.turns);
      expect(migrated.session.log).toEqual(fixture.session.log);
      expect(migrated.session.settings.teams).toEqual(fixture.session.settings.teams);
      await page.getByRole("button", { name: "Weiter geht’s", exact: true }).click();
      await expect(page.locator("#current-word")).toBeVisible();
      expect((await read()).session.current).toBe(fixture.session.current);
      const original = await page.locator("#current-word").innerText();
      await page.locator('[data-action="correct"]').click();
      await expect(page.locator("#current-word")).not.toHaveText(original);
      const scored = await read();
      expect(scored.session.log.at(-1).id).toBe(fixture.session.current);
      const newCard = scored.session.current;
      await page.getByRole("button", { name: "Letzte Wertung zurück", exact: true }).click();
      await expect(page.locator("#current-word")).toHaveText(original);
      await page.getByRole("button", { name: "Runde pausieren", exact: true }).click();
      await page.reload();
      await expect(page.getByRole("heading", { name: "Kurz durchatmen." })).toBeVisible();
      const reloaded = await read();
      expect(reloaded.session.scores).toEqual(fixture.session.scores);
      expect(reloaded.session.turns).toEqual(fixture.session.turns);
      expect(reloaded.session.current).toBe(fixture.session.current);
      expect(Object.values(reloaded.groups).some(g => Object.hasOwn(g.seen, newCard))).toBe(true);
      for (const [id, group] of Object.entries(fixture.groups))
        for (const [card, timestamp] of Object.entries(group.seen))
          expect(reloaded.groups[id].seen[card]).toBe(timestamp);
    });
  }
}

test("pending native Web Lock is canceled on timeout without expiring the active writer", async ({ context }) => {
  const [a, b] = await harness(context, "local");
  const before = await a.evaluate(key => JSON.parse(localStorage.getItem(key)), KEY);
  const held = a.evaluate(async () => window.__qa.store.withLock(async () => {
    await new Promise(resolve => { window.__qa.release = resolve; });
    const { store, engine, cards } = window.__qa;
    await store.write(s => engine.recordResult(s, cards, "correct", Date.now(), () => 0), undefined);
  }));
  await a.waitForFunction(() => Boolean(window.__qa.release));
  const message = await b.evaluate(async () => {
    window.__qa.store.lockTimeout = 80;
    try { await window.__qa.store.update(s => { window.__qa.entered = true; s.session.scores[0] = 99; }); }
    catch (error) { return error.message; }
  });
  expect(message).toContain("anderen Tab");
  expect(await b.evaluate(() => Boolean(window.__qa.entered))).toBe(false);
  expect(await b.evaluate(key => JSON.parse(localStorage.getItem(key)), KEY)).toEqual(before);
  await a.evaluate(() => window.__qa.release());
  await held;
  expect((await b.evaluate(key => JSON.parse(localStorage.getItem(key)), KEY)).session.scores).toEqual([1, 0]);
  expect(await b.evaluate(() => Boolean(window.__qa.entered))).toBe(false);
  await Promise.all([a.close(), b.close()]);
});

for (const mode of ["indexeddb", "local-no-locks"]) {
  test(`quota failure preserves the last local backup and any committed database write (${mode})`, async ({ context }) => {
    const [a, b] = await harness(context, mode);
    const before = await a.evaluate(key => localStorage.getItem(key), KEY);
    const result = await a.evaluate(async () => {
      const original = Storage.prototype.setItem;
      Storage.prototype.setItem = function(key, value) {
        if (key === "wortspiel.state.v1") throw new DOMException("Test quota exhausted", "QuotaExceededError");
        return original.call(this, key, value);
      };
      let outcome;
      try {
        await window.__qa.store.update(s => { s.session.scores[0] = 5; });
        outcome = { committed: true };
      } catch (error) { outcome = { committed: false, message: error.message }; }
      finally { Storage.prototype.setItem = original; }
      return outcome;
    });
    expect(await a.evaluate(key => localStorage.getItem(key), KEY)).toBe(before);
    if (mode === "indexeddb") {
      expect(result.committed).toBe(true);
      await a.evaluate(async () => {
        const { Storage } = await import("./storage.js");
        const store = new Storage();
        await store.open(window.__qa.engine.initialState(window.__qa.categories));
        window.__qa.store = store;
      });
      expect((await a.evaluate(key => JSON.parse(localStorage.getItem(key)), KEY)).session.scores).toEqual([5, 0]);
    } else {
      expect(result.committed).toBe(false);
      expect(result.message).toContain("Test quota exhausted");
      expect(await a.evaluate(() => Object.keys(localStorage).filter(key => key.startsWith("wortspiel.state.v1.lock:")))).toEqual([]);
    }
    await Promise.all([a.close(), b.close()]);
  });
}

for (const raw of ['{"schema":', '{"schema":2,"revision":999,"groups":{},"settings":{}}']) {
  test(`startup refuses to overwrite malformed or newer local data (${raw.startsWith('{"schema":2') ? "future schema" : "invalid JSON"})`, async ({ page }) => {
    await page.addInitScript(raw => localStorage.setItem("wortspiel.state.v1", raw), raw);
    await page.goto("/");
    await expect(page.locator(".startup-error")).toContainText("bleibt unverändert gespeichert");
    expect(await page.evaluate(key => localStorage.getItem(key), KEY)).toBe(raw);
  });
}

test("unknown IndexedDB snapshot is never overwritten by a valid older local mirror", async ({ context }) => {
  const [a, b] = await harness(context);
  const before = await a.evaluate(key => localStorage.getItem(key), KEY);
  const future = { schema: 2, revision: 999, groups: {}, settings: {} };
  const result = await a.evaluate(async ({ key, future }) => {
    const { store, engine, categories } = window.__qa;
    await new Promise((resolve, reject) => {
      const tx = store.db.transaction("state", "readwrite");
      tx.objectStore("state").put(future, key);
      tx.oncomplete = resolve; tx.onerror = reject;
    });
    const { Storage } = await import("./storage.js");
    let openError, writeError;
    try { await new Storage().open(engine.initialState(categories)); } catch (error) { openError = error.message; }
    try { await store.update(s => { s.session.scores[0] = 99; }); } catch (error) { writeError = error.message; }
    const saved = await new Promise((resolve, reject) => {
      const request = store.db.transaction("state").objectStore("state").get(key);
      request.onsuccess = () => resolve(request.result); request.onerror = reject;
    });
    return { openError, writeError, saved };
  }, { key: KEY, future });
  expect(result.openError).toContain("unbekanntes Format");
  expect(result.writeError).toContain("unbekanntes Format");
  expect(result.saved).toEqual(future);
  expect(await b.evaluate(key => localStorage.getItem(key), KEY)).toBe(before);
  await Promise.all([a.close(), b.close()]);
});

for (const noLocks of [false, true]) {
  test(`unmirrored database commit blocks a stale fallback writer until recovery (${noLocks ? "bakery" : "Web Locks"})`, async ({ context }) => {
    const [a, b] = await harness(context, noLocks ? ["indexeddb-no-locks", "local-no-locks"] : ["indexeddb", "local"]);
    const before = await b.evaluate(key => localStorage.getItem(key), KEY);
    await a.evaluate(async () => {
      const original = Storage.prototype.setItem;
      Storage.prototype.setItem = function(key, value) {
        if (key === "wortspiel.state.v1") throw new DOMException("Test mirror quota exhausted", "QuotaExceededError");
        return original.call(this, key, value);
      };
      try {
        const { store, engine, cards } = window.__qa;
        await store.update(s => engine.recordResult(s, cards, "correct", Date.now(), () => 0));
      } finally { Storage.prototype.setItem = original; }
    });
    expect(await b.evaluate(key => localStorage.getItem(key), KEY)).toBe(before);
    const snapshot = await a.evaluate(async () => {
      const snapshot = await window.__qa.store.snapshot();
      snapshot.session.scores[0] = 99;
      return window.__qa.store.snapshot();
    });
    expect(snapshot.session.scores).toEqual([1, 0]);
    expect(snapshot.revision).toBe(JSON.parse(before).revision + 1);
    const backupError = await b.evaluate(async () => {
      try { await window.__qa.store.snapshot(); } catch (error) { return error.name; }
    });
    expect(backupError).toBe("StorageMirrorPendingError");
    const error = await b.evaluate(async () => {
      const { store, engine, cards } = window.__qa;
      try { await store.update(s => engine.recordResult(s, cards, "correct", Date.now(), () => 0), { expectedRevision: store.state.revision }); }
      catch (error) { return { name: error.name, message: error.message }; }
      return null;
    });
    expect(error?.name).toBe("StorageMirrorPendingError");
    expect(await b.evaluate(key => localStorage.getItem(key), KEY)).toBe(before);
    // A readable database can publish its durable snapshot without losing its
    // point/card, then B must first refresh its old action rather than score it.
    await a.evaluate(async () => { await window.__qa.store.update(() => {}); });
    const stale = await b.evaluate(async () => {
      const { store, engine, cards } = window.__qa;
      try { await store.update(s => engine.recordResult(s, cards, "correct", Date.now(), () => 0), { expectedRevision: store.state.revision }); }
      catch (error) { return error.name; }
    });
    expect(stale).toBe("StorageConflictError");
    await b.evaluate(async () => {
      const { store, engine, cards } = window.__qa;
      await store.update(s => engine.recordResult(s, cards, "correct", Date.now(), () => 0), { expectedRevision: store.state.revision });
    });
    await a.evaluate(async () => { await window.__qa.store.update(() => {}); });
    const saved = await a.evaluate(key => JSON.parse(localStorage.getItem(key)), KEY);
    expect(saved.session.scores).toEqual([2, 0]);
    expect(saved.session.log.map(entry => entry.id)).toEqual(["de:apfel", "de:brot"]);
    expect(Object.values(saved.groups).flatMap(g => Object.keys(g.seen))).toEqual(["de:apfel", "de:brot", "de:milch"]);
    expect(await a.evaluate(() => localStorage.getItem("wortspiel.state.v1.pending"))).toBeNull();
    await Promise.all([a.close(), b.close()]);
  });
}

test("a pre-existing legacy local fork never overwrites a database's missing card history", async ({ context }) => {
  const [a, b] = await harness(context, ["indexeddb", "local"]);
  const old = await b.evaluate(key => JSON.parse(localStorage.getItem(key)), KEY);
  await a.evaluate(async () => {
    const { store, engine, cards } = window.__qa;
    await store.update(s => engine.recordResult(s, cards, "correct", Date.now(), () => 0));
  });
  const committed = await a.evaluate(key => JSON.parse(localStorage.getItem(key)), KEY);
  // Model an already-forked pre-journal backup, not an allowed new write.
  old.revision = committed.revision + 1;
  await b.evaluate(({ key, old }) => localStorage.setItem(key, JSON.stringify(old)), { key: KEY, old });
  const result = await a.evaluate(async key => {
    let name;
    try { await window.__qa.store.update(() => {}); } catch (error) { name = error.name; }
    const saved = await new Promise((resolve, reject) => {
      const request = window.__qa.store.db.transaction("state").objectStore("state").get(key);
      request.onsuccess = () => resolve(request.result); request.onerror = reject;
    });
    return { name, saved };
  }, KEY);
  expect(result.name).toBe("StorageLineageError");
  expect(result.saved).toEqual(committed);
  expect(await b.evaluate(key => JSON.parse(localStorage.getItem(key)), KEY)).toEqual(old);
  await Promise.all([a.close(), b.close()]);
});

test("an explicitly reset local group still syncs without resurrecting old history", async ({ context }) => {
  const [a, b] = await harness(context, ["indexeddb", "local"]);
  await b.evaluate(async () => {
    const { store, engine } = window.__qa;
    await store.update(s => engine.resetGroup(s, s.settings.group));
  });
  await a.evaluate(async () => { await window.__qa.store.update(() => {}); });
  const saved = await a.evaluate(key => JSON.parse(localStorage.getItem(key)), KEY);
  expect(saved.session).toBeNull();
  const group = saved.groups[Object.keys(saved.groups)[0]];
  expect(group.seen).toEqual({});
  expect(group.resetAt).toBeGreaterThan(0);
  await Promise.all([a.close(), b.close()]);
});

for (const mode of ["indexeddb", "indexeddb-no-locks"]) {
  for (const access of ["get", "set", ...(mode.endsWith("no-locks") ? ["lock"] : [])]) {
    test(`unavailable durable journal aborts before database mutation (${mode}, ${access})`, async ({ context }) => {
      const [a, b] = await harness(context, mode);
      const before = await a.evaluate(key => JSON.parse(localStorage.getItem(key)), KEY);
      const result = await a.evaluate(async ({ key, access }) => {
        const method = `${access === "lock" ? "set" : access}Item`;
        const original = Storage.prototype[method];
        Storage.prototype[method] = function(key, ...args) {
          if (access === "lock" ? key.startsWith("wortspiel.state.v1.lock:") : key === "wortspiel.state.v1.pending") throw new DOMException("Test journal unavailable", "SecurityError");
          return original.call(this, key, ...args);
        };
        let message;
        try {
          const { store, engine, cards } = window.__qa;
          await store.update(s => engine.recordResult(s, cards, "correct", Date.now(), () => 0));
        } catch (error) { message = error.message; }
        finally { Storage.prototype[method] = original; }
        const saved = await new Promise((resolve, reject) => {
          const request = window.__qa.store.db.transaction("state").objectStore("state").get(key);
          request.onsuccess = () => resolve(request.result); request.onerror = reject;
        });
        return { message, saved };
      }, { key: KEY, access });
      expect(result.message).toContain(access === "get" ? "Website-Speicher" : "Test journal unavailable");
      expect(result.saved).toEqual(before);
      expect(await b.evaluate(key => JSON.parse(localStorage.getItem(key)), KEY)).toEqual(before);
      expect(await a.evaluate(() => localStorage.getItem("wortspiel.state.v1.pending"))).toBeNull();
      await Promise.all([a.close(), b.close()]);
    });
  }
}

test("a blocked local replica hides its stale card, stops navigation and preserves the live round", async ({ page, context }) => {
  await context.addInitScript(() => Object.defineProperty(window, "indexedDB", { get: () => { throw new Error("IndexedDB unavailable in regression test"); } }));
  await page.goto("/");
  await page.getByRole("button", { name: "Los geht’s", exact: true }).click();
  await page.getByRole("button", { name: "Wir sind bereit", exact: true }).click();
  await expect(page.locator("#current-word")).toBeVisible();
  const original = await page.locator("#current-word").innerText();
  const before = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), KEY);
  await page.evaluate(revision => localStorage.setItem("wortspiel.state.v1.pending", JSON.stringify({ revision })), before.revision + 1);
  await page.locator('[data-action="correct"]').click();
  await expect(page.locator("#toast")).toContainText("neueste Spielstand");
  await expect(page.locator("#current-word")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Partie fortsetzen", exact: true })).toBeVisible();
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)), KEY)).toEqual(before);
  await page.getByRole("button", { name: "Partie fortsetzen", exact: true }).click();
  await expect(page.locator("#current-word")).toHaveCount(0);
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)), KEY)).toEqual(before);
  // Explicit harness recovery after its simulated remote writer is stopped.
  await page.evaluate(() => localStorage.removeItem("wortspiel.state.v1.pending"));
  await page.getByRole("button", { name: "Partie fortsetzen", exact: true }).click();
  await page.getByRole("button", { name: "Weiter geht’s", exact: true }).click();
  await expect(page.locator("#current-word")).toHaveText(original);
  const after = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), KEY);
  expect(after.session.scores).toEqual(before.session.scores);
  expect(after.groups).toEqual(before.groups);
});

for (const mode of ["indexeddb", "local", "local-no-locks"]) {
  test(`stale end-turn request never opens a dialog or finishes the fresh turn (${mode})`, async ({ page: a, context }) => {
    if (mode.startsWith("local")) await context.addInitScript(() => {
      Object.defineProperty(window, "indexedDB", { get: () => { throw new Error("IndexedDB unavailable in regression test"); } });
    });
    if (mode.endsWith("no-locks")) await context.addInitScript(() => Object.defineProperty(navigator, "locks", { value: undefined }));
    await a.addInitScript(() => window.addEventListener("storage", event => {
      if (window.__QA_FreezeStorage) event.stopImmediatePropagation();
    }));
    await a.goto("/");
    const b = await context.newPage(); await b.goto("/");
    await a.getByRole("button", { name: "Los geht’s", exact: true }).click();
    await a.getByRole("button", { name: "Wir sind bereit", exact: true }).click();
    await b.getByRole("button", { name: "Partie fortsetzen", exact: true }).click();
    await b.getByRole("button", { name: "Weiter geht’s", exact: true }).click();
    await expect(a.locator("#current-word")).toBeVisible();
    await a.evaluate(() => { window.__QA_FreezeStorage = true; });
    await b.getByRole("button", { name: "Runde beenden", exact: true }).click();
    await b.locator("#modal").getByRole("button", { name: "Runde beenden", exact: true }).click();
    await b.locator('[data-action="next-turn"]').click();
    await b.getByRole("button", { name: "Wir sind bereit", exact: true }).click();
    await expect(b.locator("#current-word")).toBeVisible();
    const before = await b.evaluate(key => JSON.parse(localStorage.getItem(key)), KEY);
    await a.getByRole("button", { name: "Runde beenden", exact: true }).click();
    await expect(a.locator("#toast")).toContainText("Es wurde nichts gewertet");
    await expect(a.locator("#modal")).not.toBeVisible();
    await expect(a.locator("#current-word")).toHaveText(await b.locator("#current-word").innerText());
    expect(await b.evaluate(key => JSON.parse(localStorage.getItem(key)), KEY)).toEqual(before);
    await b.close();
  });
}

for (const noLocks of [false, true]) {
  test(`confirmed reset recovers an unmirrored commit after clock moves backward (${noLocks ? "bakery" : "Web Locks"})`, async ({ context }) => {
    const [a, b] = await harness(context, noLocks ? "indexeddb-no-locks" : "indexeddb");
    await a.evaluate(async () => {
      const { store, engine, cards, categories } = window.__qa;
      await store.update(s => {
        engine.resetGroup(s, s.settings.group);
        s.groups[Object.keys(s.groups)[0]].resetAt = Date.now() + 60000;
        engine.createSession(s, cards, categories);
        engine.startTurn(s, cards, Date.now(), () => 0);
      });
    });
    const before = await a.evaluate(key => JSON.parse(localStorage.getItem(key)), KEY);
    await a.evaluate(async () => {
      const original = Storage.prototype.setItem;
      Storage.prototype.setItem = function(key, value) {
        if (key === "wortspiel.state.v1") throw new DOMException("Test mirror quota", "QuotaExceededError");
        return original.call(this, key, value);
      };
      try { await window.__qa.store.update(s => window.__qa.engine.resetGroup(s, s.settings.group)); }
      finally { Storage.prototype.setItem = original; }
    });
    const result = await b.evaluate(async () => {
      let error;
      try { await window.__qa.store.update(() => {}); } catch (failure) { error = failure.name; }
      return { error, state: window.__qa.store.state };
    });
    expect(result.error).toBeUndefined();
    expect(result.state.session).toBeNull();
    const group = result.state.groups[Object.keys(result.state.groups)[0]];
    expect(group.seen).toEqual({});
    expect(group.resetAt).toBeGreaterThan(before.groups[Object.keys(before.groups)[0]].resetAt);
    expect(await a.evaluate(() => localStorage.getItem("wortspiel.state.v1.pending"))).toBeNull();
    await Promise.all([a.close(), b.close()]);
  });
}

test("a pre-reset local replica cannot resurrect historical cards after a newer database reset", async ({ context }) => {
  const [a, b] = await harness(context);
  await a.evaluate(async () => {
    const { store, engine, cards } = window.__qa;
    await store.update(s => engine.recordResult(s, cards, "correct", Date.now(), () => 0));
  });
  const old = await a.evaluate(key => JSON.parse(localStorage.getItem(key)), KEY);
  await a.evaluate(async () => {
    const { store, engine, cards, categories } = window.__qa;
    await store.update(s => {
      engine.resetGroup(s, s.settings.group);
      engine.createSession(s, cards, categories);
      engine.startTurn(s, cards, Date.now(), () => 0);
    });
  });
  const current = await a.evaluate(key => JSON.parse(localStorage.getItem(key)), KEY);
  old.revision = current.revision + 1;
  await b.evaluate(({key, old}) => localStorage.setItem(key, JSON.stringify(old)), { key: KEY, old });
  const result = await a.evaluate(async key => {
    let error;
    try { await window.__qa.store.update(() => {}); } catch (failure) { error = failure.name; }
    const request = window.__qa.store.db.transaction("state").objectStore("state").get(key);
    const saved = await new Promise((resolve, reject) => {request.onsuccess=()=>resolve(request.result);request.onerror=reject;});
    return { error, saved };
  }, KEY);
  expect(result.error).toBe("StorageLineageError");
  expect(result.saved).toEqual(current);
  expect(await b.evaluate(key => JSON.parse(localStorage.getItem(key)), KEY)).toEqual(old);
  await Promise.all([a.close(), b.close()]);
});
