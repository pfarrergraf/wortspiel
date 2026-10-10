import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { normalize } from "../src/engine.js";

const json = async path => JSON.parse(await readFile(new URL(path, import.meta.url), "utf8"));
const dataset = await json("../src/data/cards.json");
const byId = new Map(dataset.cards.map(card => [card.id, card]));
const baseline = await json("./fixtures/cards-2026-10-10-metadata.json");

test("main consolidation preserves every released card ID, category and metadata field", () => {
  for (const [id, digest, categories] of baseline) {
    const card = byId.get(id);
    assert.ok(card, id);
    const metadata = Object.fromEntries(Object.entries(card).filter(([key]) => key !== "categories").sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0));
    assert.equal(createHash("sha256").update(JSON.stringify(metadata)).digest("hex"), digest, id);
    assert.ok(categories.every(category => card.categories.includes(category)), id);
  }
});

test("reviewed sports source is fully integrated after the existing packs", async () => {
  const pack = await json("../data/packs/sports-plus.json");
  const order = await json("../data/pack-order.json");
  assert.equal(pack.cards.length, 120);
  assert.equal(order.at(-1), "sports-plus.json");
  for (const source of pack.cards) {
    const card = byId.get(`de:${normalize(source.word)}`);
    assert.ok(card?.categories.includes("sports"), source.word);
  }
});
