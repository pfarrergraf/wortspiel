import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { noiseCards, noiseCategories, noiseId, validateNoisePool } from "../src/rules/noises.js";
import { withMixedModes, cardModes, pickMixedCard, presentationMode, presentationSettings } from "../src/rules/play-modes.js";
import { configureGameMode } from "../src/rules/pantomime.js";
import { initialState, availableCards, createSession, startTurn, recordResult, undoResult, pause, resume, finishTurn, amendTurn, migrateSettings, exportBackup, importBackup } from "../src/engine.js";
const pool = JSON.parse(await readFile(new URL("../data/noises-de.json", import.meta.url), "utf8"));
const releasedIds = JSON.parse(await readFile(new URL("./fixtures/noises-v1-ids.json", import.meta.url), "utf8"));
const noises = noiseCards(pool);
const categories = [{ id: "a" }];
const fixture = withMixedModes([
  { id: "de:wahrheit", word: "Wahrheit", categories: ["a"], taboo: ["Lüge", "ehrlich", "Fakt"], difficulty: "easy" },
  { id: "de:hahn", word: "Hahn", categories: ["a"], taboo: ["Huhn", "Hof", "krähen"], difficulty: "easy" },
  { id: "de:pantomime:hahn", word: "Hahn", categories: ["pm-animals"], taboo: [], difficulty: "easy", points: 1 },
  { id: "de:noises:hahn", word: "Hahn", categories: ["ns-animals"], taboo: [], difficulty: "easy" },
]);
const randomSequence = (...values) => () => values.shift() ?? 0;
function state(gameMode = "mixed") {
  const state = initialState(categories);
  migrateSettings(state);
  Object.assign(state.settings, { gameMode, difficulty: "all" });
  return state;
}

test("sound pool has 160 unique, validated concrete prompts across all three difficulties", () => {
  assert.deepEqual(validateNoisePool(pool), []);
  assert.equal(noises.length, 160);
  assert.equal(new Set(noises.map(card => card.id)).size, 160);
  for (const id of releasedIds) assert.ok(noises.some(card => card.id === id), `preserve published ID ${id}`);
  assert.deepEqual(["easy", "medium", "hard"].map(level => noises.filter(card => card.difficulty === level).length), [72, 58, 30]);
  for (const word of ["Kuh", "Hahn", "Katze"]) assert.equal(noises.find(card => card.word === word).difficulty, "easy");
  assert.equal(noises.some(card => card.word === "Wahrheit"), false);
  assert.equal(noiseId("  KLAPPERnde Zähne! "), "de:noises:klappernde zähne");
  assert.deepEqual(noiseCategories(pool).map(category => category.id), pool.categories.map(category => `ns-${category.id}`));
});

test("sound pool rejects duplicate IDs, mismatched words, unknown categories and malformed metadata", () => {
  for (const patch of [{ id: "de:hahn" }, { category: "missing" }, { difficulty: "profi" }, { word: "" }, { emoji: null }]) {
    const bad = structuredClone(pool);
    Object.assign(bad.cards[0], patch);
    assert.ok(validateNoisePool(bad).length);
  }
  const duplicate = structuredClone(pool);
  duplicate.cards.push(duplicate.cards[0]);
  assert.ok(validateNoisePool(duplicate).length);
  assert.ok(validateNoisePool({ categories: [], cards: [] }).length);
});

test("noises uses its own categories and cumulative level filter, excluding seen and retired IDs", () => {
  const settings = { ...state("noises").settings, selected: [] };
  const cards = [...fixture, ...noises];
  for (const [difficulty, count] of [["easy", 72], ["medium", 130], ["all", 160]]) {
    const filtered = availableCards(noises, { ...settings, difficulty });
    assert.equal(filtered.length, count);
    assert.ok(filtered.every(card => card.id.startsWith("de:noises:")));
  }
  settings.noisesSelected = ["ns-household"];
  const selected = availableCards(cards, settings);
  assert.ok(selected.length);
  assert.ok(selected.every(card => card.categories.includes("ns-household")));
  assert.equal(availableCards(cards, settings, Object.fromEntries(selected.map(card => [card.id, 0]))).length, 0);
  assert.equal(availableCards(selected.map(card => ({ ...card, retired: true })), settings).length, 0);
  createSession({ ...state("noises"), settings }, cards, categories);
  assert.throws(() => createSession({ ...state("noises"), settings: { ...settings, noisesSelected: [] } }, cards, categories), /Geräusch-Kategorie/);
  assert.throws(() => createSession({ ...state("noises"), settings: { ...settings, noisesSelected: ["a"] } }, cards, categories), /Geräusch-Kategorien/);
});

test("same Hahn card can be explained, mimed or sounded, but abstract truth never becomes nonverbal", () => {
  assert.deepEqual(cardModes(fixture[0]), ["taboo", "free"]);
  assert.deepEqual(cardModes(fixture[1]), ["taboo", "free", "pantomime", "noises"]);
  for (const [index, mode, cardValue] of [[0, "taboo", .99], [1, "free", .99], [2, "pantomime", 0], [3, "noises", 0]]) {
    const current = state();
    createSession(current, fixture, categories);
    startTurn(current, fixture, 1000, randomSequence((index + .1) / 4, cardValue));
    assert.equal(current.session.currentMode, mode);
    assert.equal(current.session.current, "de:hahn");
    assert.equal(current.groups["group:unsere runde"].seen["de:hahn"], 1000);
    assert.equal(presentationMode(current.session), mode);
  }
  const original = structuredClone(fixture);
  for (const choice of [0, .3, .55, .99, 1, NaN, Infinity]) {
    const picked = pickMixedCard(fixture, randomSequence(choice, 0));
    assert.ok(cardModes(picked.card).includes(picked.mode));
    if (["pantomime", "noises"].includes(picked.mode)) assert.notEqual(picked.card.word, "Wahrheit");
  }
  assert.deepEqual(fixture, original);
  const retiredSound = { ...fixture[0], id: "de:noises:wahrheit", categories: ["ns-animals"], taboo: [], retired: true };
  assert.deepEqual(cardModes(withMixedModes([fixture[0], retiredSound])[0]), ["taboo", "free"]);
});

test("mixed pool avoids repeated words across namespaces while preserving independent single-mode history", () => {
  const mixed = state().settings;
  assert.deepEqual(availableCards(fixture, mixed).map(card => card.id), ["de:wahrheit", "de:hahn"]);
  for (const id of ["de:hahn", "de:pantomime:hahn", "de:noises:hahn"]) {
    const seen = { [id]: 1000 };
    assert.deepEqual(availableCards(fixture, mixed, seen).map(card => card.id), ["de:wahrheit"]);
    assert.deepEqual(seen, { [id]: 1000 });
  }
  assert.deepEqual(availableCards(fixture, state("noises").settings, { "de:hahn": 0 }).map(card => card.id), ["de:noises:hahn"]);
});

test("mixed mode chooses presentation before the card so a small sound pool still participates", () => {
  const cards = [...Array.from({ length: 100 }, (_, index) => ({ ...fixture[0], id: `de:abstract ${index}` })), fixture[3]];
  const chosen = pickMixedCard(cards, randomSequence(.99, 0));
  assert.equal(chosen.mode, "noises");
  assert.equal(chosen.card.id, "de:noises:hahn");
  const abstract = pickMixedCard([fixture[0]], randomSequence(.99, 0));
  assert.equal(abstract.mode, "free");
  assert.equal(pickMixedCard([]), null);
});

test("mixed difficulty respects the chosen presentation, not just an easy explanation word", () => {
  const harder = withMixedModes([fixture[1], { ...fixture[2], difficulty: "hard" }, { ...fixture[3], difficulty: "medium" }]);
  const word = harder[0];
  assert.deepEqual(cardModes(word, { difficulty: "easy" }), ["taboo", "free"]);
  assert.deepEqual(cardModes(word, { difficulty: "medium" }), ["taboo", "free", "noises"]);
  assert.deepEqual(cardModes(word, { difficulty: "all" }), ["taboo", "free", "pantomime", "noises"]);
  assert.equal(pickMixedCard([word], randomSequence(.99, 0), { difficulty: "easy" }).mode, "free");
  assert.equal(pickMixedCard([word], randomSequence(.99, 0), { difficulty: "medium" }).mode, "noises");
});

test("mixed scoring, undo, pause and after-round correction preserve mode and every exposed ID", () => {
  const current = state();
  createSession(current, fixture, categories);
  startTurn(current, fixture, 1000, randomSequence(.99, 0));
  assert.equal(current.session.currentMode, "noises");
  recordResult(current, fixture, "correct", 2000, randomSequence(0, 0));
  assert.equal(current.session.scores[0], 1);
  assert.equal(current.session.log[0].mode, "noises");
  assert.equal(current.session.current, "de:wahrheit");
  undoResult(current);
  assert.equal(current.session.current, "de:hahn");
  assert.equal(current.session.currentMode, "noises");
  assert.equal(current.session.scores[0], 0);
  pause(current, 3000);
  const persisted = structuredClone(current);
  resume(persisted, 4000);
  assert.equal(persisted.session.currentMode, "noises");
  finishTurn(persisted, 5000);
  assert.equal(persisted.session.turns[0].openMode, "noises");
  amendTurn(persisted, fixture, 0, "open", "correct");
  assert.equal(persisted.session.turns[0].log[0].mode, "noises");
  assert.equal(persisted.session.scores[0], 1);
  assert.deepEqual(persisted.groups, current.groups);
  const history = state("noises");
  const backup = exportBackup(persisted, 6000);
  assert.equal(importBackup(history, backup), 2);
  assert.equal(importBackup(history, backup), 0);
  assert.deepEqual(history.groups["group:unsere runde"].seen, persisted.groups["group:unsere runde"].seen);
});

test("new setup modes preserve legacy snapshots and mode-specific taboo rules", () => {
  const legacy = state("free");
  legacy.settings.tabooMode = "none";
  createSession(legacy, fixture, categories);
  const before = structuredClone(legacy);
  const noise = configureGameMode({ ...legacy.settings, gameMode: "noises" }, legacy.settings, "gameMode");
  const mixed = configureGameMode({ ...legacy.settings, gameMode: "mixed" }, legacy.settings, "gameMode");
  assert.equal(noise.gameMode, "noises");
  assert.equal(mixed.gameMode, "mixed");
  assert.equal(mixed.tabooMode, "classic");
  assert.deepEqual(legacy, before);
  assert.equal(presentationSettings({ settings: mixed, currentMode: "free" }).tabooMode, "none");
  assert.equal(presentationSettings({ settings: mixed, currentMode: "noises" }).tabooMode, "none");
  assert.equal(presentationSettings({ settings: mixed, currentMode: "taboo" }).tabooMode, "classic");
  const oldFreeSession = { settings: { gameMode: "taboo", tabooMode: "none" }, currentMode: "explain" };
  const oldFreeBefore = structuredClone(oldFreeSession);
  assert.equal(presentationMode(oldFreeSession), "free");
  assert.deepEqual(oldFreeSession, oldFreeBefore);
});
