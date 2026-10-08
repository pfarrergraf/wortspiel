import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  initialState,
  createSession,
  startTurn,
  matchesSettings,
} from "../src/engine.js";
import { validatePack, cardId } from "../scripts/cards-lib.mjs";

const valid = {
  category: { id: "gaming", name: "Gaming", emoji: "🎮", color: "purple" },
  cards: [
    {
      word: "Minecraft",
      taboo: ["Blöcke", "Bauen", "Creeper", "Pixel", "Videospiel"],
      difficulty: "easy",
      ageMin: 8,
    },
  ],
};

test("stable card ids: every id of the v1 dataset still exists", async () => {
  const before = (await readFile(new URL("./fixtures/card-ids-v1.txt", import.meta.url), "utf8"))
    .split("\n")
    .filter(Boolean);
  const { cards } = JSON.parse(
    await readFile(new URL("../src/data/cards.json", import.meta.url), "utf8"),
  );
  const now = new Set(cards.map((card) => card.id));
  assert.deepEqual(before.filter((id) => !now.has(id)), []);
});

test("pack validation accepts a correct pack and explains mistakes", () => {
  assert.deepEqual(validatePack("gaming.json", valid, new Set()), []);
  const broken = structuredClone(valid);
  broken.cards.push(
    { word: "Schulbus", taboo: ["Schulbus", "Gelb", "Fahren"], difficulty: "leicht", ageMin: 7 },
    { word: "Minecraft", taboo: ["A1", "B1", "C1", "D1", "E1"], difficulty: "easy", ageMin: 8 },
  );
  const errors = validatePack("gaming.json", broken, new Set(), ["gelb"]);
  for (const part of ["5 bis 6 Tabuwörter", "difficulty", "ageMin", "gesperrtes Wort", "doppelt in diesem Paket"])
    assert.ok(errors.some((e) => e.includes(part)), part);
  // Extending an existing category needs no name, emoji or colour.
  assert.deepEqual(
    validatePack("tv.json", { category: { id: "tv" }, cards: valid.cards }, new Set(["tv"])),
    [],
  );
  assert.equal(cardId("Straße"), "de:strasse");
});

test("drawing a card records a play mode and settings filter combines rules", () => {
  const categories = [{ id: "a" }];
  const cards = [{ id: "de:x", word: "X", taboo: ["a", "b", "c"], categories: ["a"], difficulty: "easy" }];
  const s = initialState(categories);
  createSession(s, cards, categories);
  startTurn(s, cards, 1000, () => 0);
  assert.equal(s.session.current, "de:x");
  assert.equal(s.session.currentMode, "explain");
  assert.equal(matchesSettings(cards[0], { difficulty: "easy" }), true);
  assert.equal(matchesSettings({ ...cards[0], difficulty: "hard" }, { difficulty: "easy" }), false);
});
