import test from "node:test";
import assert from "node:assert/strict";
import pool from "../src/data/pantomime.json" with { type: "json" };
import { pantomimeCards, pantomimeId, PANTOMIME } from "../src/rules/pantomime.js";
import { availableCards, createSession, drawCard, initialState, migrateSettings, normalize, validateSettings } from "../src/engine.js";
import { tabooLabel } from "../src/rules/taboo.js";

const words = pantomimeCards(pool);
const categories = [{ id: "a" }];
const taboo = [{ id: "de:auto", word: "Auto", taboo: ["A", "B", "C", "D", "E"], categories: ["a"], difficulty: "easy" }];
const cards = [...taboo, ...words];

test("pantomime pool has 500 unique, emoji-tagged words in three levels", () => {
  assert.equal(words.length, 500);
  assert.equal(new Set(words.map((c) => c.id)).size, 500);
  assert.equal(new Set(words.map((c) => normalize(c.word))).size, 500);
  for (const card of words) {
    assert.ok(["easy", "medium", "hard"].includes(card.difficulty), card.word);
    assert.ok(card.emoji, card.word);
    assert.equal(card.id, pantomimeId(card.word));
    assert.ok(card.id.startsWith("de:pantomime:"));
  }
  for (const level of ["easy", "medium", "hard"]) assert.ok(pool[level].length >= 100, level);
});

test("pantomime ids never collide with taboo cards of the same word", () => {
  assert.notEqual(pantomimeId("Auto"), "de:auto");
  // Word ids are normalised without colons, so the namespace cannot be hit.
  assert.ok(!normalize("pantomime: auto").includes(":"));
});

test("pantomime mode plays only its own pool, regardless of themes", () => {
  const settings = { ...initialState(categories).settings, gameMode: PANTOMIME, difficulty: "all" };
  const pool = availableCards(cards, settings);
  assert.equal(pool.length, 500);
  assert.ok(pool.every((c) => c.categories.includes(PANTOMIME)));
  const classic = availableCards(cards, { ...settings, gameMode: "taboo" });
  assert.deepEqual(classic.map((c) => c.id), ["de:auto"]);
  assert.equal(availableCards(cards, { ...settings, difficulty: "easy" }).length, pool.filter((c) => c.difficulty === "easy").length);
});

test("pantomime mode does not need themes and always draws in pantomime", () => {
  const state = initialState(categories);
  state.settings.gameMode = PANTOMIME;
  state.settings.selected = [];
  assert.doesNotThrow(() => validateSettings(state.settings, categories));
  createSession(state, cards, categories);
  assert.ok(drawCard(state, cards, () => 0.5, 1));
  assert.equal(state.session.currentMode, PANTOMIME);
  assert.ok(state.session.current.startsWith("de:pantomime:"));
  assert.equal(tabooLabel(state.session.settings), "Gesprochen");
  // Exposed words are reserved in the group's history like every card.
  assert.ok(Object.hasOwn(Object.values(state.groups)[0].seen, state.session.current));
});

test("older saves migrate to the taboo game and reject unknown modes", () => {
  const state = initialState(categories);
  migrateSettings(state);
  assert.equal(state.settings.gameMode, "taboo");
  assert.throws(() => validateSettings({ ...state.settings, gameMode: "dance" }, categories));
  assert.throws(() => validateSettings({ ...state.settings, selected: [] }, categories));
});
