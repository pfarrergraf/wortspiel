import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { matchesAudience } from "../src/rules/audience.js";

const json = async (path) => JSON.parse(await readFile(new URL(path, import.meta.url), "utf8"));
const dataset = await json("../src/data/cards.json");
const byId = new Map(dataset.cards.map((c) => [c.id, c]));

test("all 2557 cards from the public integration baseline retain their IDs", async () => {
  const ids = (await readFile(new URL("./fixtures/card-ids-2026-10-09.txt", import.meta.url), "utf8")).trim().split("\n");
  assert.equal(ids.length, 2557);
  assert.deepEqual(ids.filter((id) => !byId.has(id)), []);
});

test("new packs extend an existing card without replacing its text or metadata", async () => {
  const before = await json("./fixtures/pack-precedence.json");
  const after = byId.get(before.id);
  for (const [key, value] of Object.entries(before)) {
    if (key === "categories") assert.ok(value.every((id) => after.categories.includes(id)));
    else assert.deepEqual(after[key], value, key);
  }
  assert.ok(after.categories.includes("food"));
});

test("reviewed semantic aliases remain stored but cannot be drawn", () => {
  const ids = ["de:samariter", "de:bildschirmfoto", "de:selfiestick", "de:videotelefonie", "de:glühbirne", "de:zwei faktor anmeldung", "de:spielekonsole", "de:alice im wunderland"];
  for (const id of ids) {
    assert.ok(byId.has(id), id);
    assert.equal(byId.get(id).retired, true, id);
    assert.equal(matchesAudience(byId.get(id), { ageGroup: null }), false);
  }
  for (const id of ["de:diakonin", "de:router", "de:spukhaus"]) {
    assert.ok(byId.has(id), id);
    assert.notEqual(byId.get(id).retired, true);
  }
  assert.equal(byId.get("de:powerbank").ageMin, 10);
});
