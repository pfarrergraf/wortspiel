import test from "node:test";
import assert from "node:assert/strict";
import pool from "../src/data/pantomime.json" with { type: "json" };
import shippedIds from "./fixtures/pantomime-v1-ids.json" with { type: "json" };
import { pantomimeCards, pantomimeCategories, pantomimeId, PANTOMIME } from "../src/rules/pantomime.js";
import { availableCards, createSession, drawCard, initialState, migrateSettings, normalize, recordResult, startTurn, validateSettings } from "../src/engine.js";
import { tabooLabel } from "../src/rules/taboo.js";

const words = pantomimeCards(pool);
const groups = pantomimeCategories(pool);
const categories = [{ id: "a" }];
const taboo = [{ id: "de:auto", word: "Auto", taboo: ["A", "B", "C", "D", "E"], categories: ["a"], difficulty: "easy" }];
const cards = [...taboo, ...words];
const pantomimeState = (extra = {}) => {
  const state = initialState(categories);
  Object.assign(state.settings, { gameMode: PANTOMIME, difficulty: "all", ...extra });
  return state;
};

test("pantomime pool: unique words, emoji, 1–3 points and known categories", () => {
  assert.ok(words.length >= 1000, `${words.length} words`);
  assert.equal(new Set(words.map((c) => c.id)).size, words.length);
  assert.equal(new Set(words.map((c) => normalize(c.word))).size, words.length);
  const ids = new Set(groups.map((g) => g.id));
  assert.equal(ids.size, pool.categories.length);
  for (const card of words) {
    assert.ok([1, 2, 3].includes(card.points), card.word);
    assert.equal(card.difficulty, { 1: "easy", 2: "medium", 3: "hard" }[card.points]);
    assert.ok(card.emoji, card.word);
    assert.ok(card.word.length <= 40, card.word);
    assert.ok(ids.has(card.categories[0]), card.word);
    assert.equal(card.id, pantomimeId(card.word));
  }
  for (const group of groups) {
    const inGroup = words.filter((c) => c.categories.includes(group.id));
    assert.ok(inGroup.length >= 40, group.id);
    for (const points of [1, 2, 3])
      if (group.id !== "pm-fantasie") assert.ok(inGroup.some((c) => c.points === points), `${group.id} has ${points}`);
  }
});

test("every shipped pantomime word keeps its id", () => {
  const ids = new Set(words.map((c) => c.id));
  assert.deepEqual(shippedIds.filter((id) => !ids.has(id)), []);
});

test("pantomime ids never collide with taboo cards of the same word", () => {
  assert.notEqual(pantomimeId("Auto"), "de:auto");
  assert.ok(!normalize("pantomime: auto").includes(":"));
});

test("pantomime mode plays only its selected categories", () => {
  const all = pantomimeState().settings;
  assert.equal(availableCards(cards, all).length, words.length);
  const [first, second] = groups;
  const some = { ...all, pantomimeSelected: [first.id] };
  const pool = availableCards(cards, some);
  assert.ok(pool.length > 0);
  assert.ok(pool.every((c) => c.categories.includes(first.id)));
  assert.ok(!pool.some((c) => c.categories.includes(second.id)));
  assert.deepEqual(availableCards(cards, { ...all, gameMode: "taboo" }).map((c) => c.id), ["de:auto"]);
  const easy = availableCards(cards, { ...all, difficulty: "easy" });
  assert.ok(easy.length > 0 && easy.every((c) => c.points === 1));
});

test("a guessed pantomime word scores its points; undo keeps the scale", () => {
  for (const points of [1, 2, 3]) {
    const card = words.find((c) => c.points === points);
    const state = pantomimeState({ pantomimeSelected: [card.categories[0]] });
    const only = [card, words.find((c) => c.id !== card.id && c.categories[0] === card.categories[0])];
    createSession(state, only, categories);
    startTurn(state, only, 1000, () => 0);
    state.session.current = card.id;
    recordResult(state, only, "correct", 2000, () => 0);
    assert.equal(state.session.scores[0], points);
    assert.equal(state.session.log[0].delta, points);
  }
  // The taboo game always scores 1, even for a card with points.
  const state = initialState(categories);
  const card = { ...words.find((c) => c.points === 3), categories: ["a"] };
  createSession(state, [card, taboo[0]], categories);
  startTurn(state, [card, taboo[0]], 1000, () => 0);
  state.session.current = card.id;
  recordResult(state, [card, taboo[0]], "correct", 2000, () => 0);
  assert.equal(state.session.scores[0], 1);
});

test("pantomime mode needs no themes, always draws in pantomime", () => {
  const state = pantomimeState({ selected: [] });
  assert.doesNotThrow(() => validateSettings(state.settings, categories));
  createSession(state, cards, categories);
  assert.ok(drawCard(state, cards, () => 0.5, 1));
  assert.equal(state.session.currentMode, PANTOMIME);
  assert.ok(state.session.current.startsWith("de:pantomime:"));
  assert.equal(tabooLabel(state.session.settings), "Gesprochen");
  assert.ok(Object.hasOwn(Object.values(state.groups)[0].seen, state.session.current));
  assert.throws(() => validateSettings({ ...state.settings, pantomimeSelected: [] }, categories));
  assert.throws(() => validateSettings({ ...state.settings, pantomimeSelected: ["a"] }, categories));
});

test("older saves migrate to the taboo game with all pantomime categories", () => {
  const state = initialState(categories);
  migrateSettings(state);
  assert.equal(state.settings.gameMode, "taboo");
  assert.equal(state.settings.pantomimeSelected, null);
  assert.throws(() => validateSettings({ ...state.settings, gameMode: "dance" }, categories));
  assert.throws(() => validateSettings({ ...state.settings, selected: [] }, categories));
});
