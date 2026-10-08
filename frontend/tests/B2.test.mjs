import test from "node:test";
import assert from "node:assert/strict";
import {
  TABOO_MODES,
  visibleTaboo,
  tabooLabel,
  validateTabooMode,
  migrateTabooMode,
} from "../src/rules/taboo.js";
import {
  initialState,
  createSession,
  startTurn,
  recordResult,
  undoResult,
  ensureGroup,
  availableCards,
} from "../src/engine.js";

const categories = [{ id: "animals" }];
const cards = Array.from({ length: 5 }, (_, index) => ({
  id: `de:tier ${index}`,
  word: `Tier ${index}`,
  categories: ["animals"],
  difficulty: "easy",
  taboo: ["Pfoten", "Fell", "Haustier", "Fressen", "Spielen"],
}));

test("B2: classic and absent settings show every taboo word in source order", () => {
  for (const settings of [undefined, null, {}, { tabooMode: null }, { tabooMode: "classic" }])
    assert.deepEqual(visibleTaboo(cards[0], settings), cards[0].taboo);
});

test("B2: light shows the first three words and handles shorter lists", () => {
  assert.deepEqual(visibleTaboo(cards[0], { tabooMode: "light" }), [
    "Pfoten", "Fell", "Haustier",
  ]);
  for (const taboo of [[], ["Pfoten"], ["Pfoten", "Fell"], ["Pfoten", "Fell", "Haustier"]])
    assert.deepEqual(visibleTaboo({ taboo }, { tabooMode: "light" }), taboo);
});

test("B2: none shows no taboo words and uses the target-word violation label", () => {
  assert.deepEqual(visibleTaboo(cards[0], { tabooMode: "none" }), []);
  assert.equal(tabooLabel({ tabooMode: "none" }), "Wort gesagt");
  for (const settings of [undefined, null, {}, { tabooMode: null }, { tabooMode: "classic" }, { tabooMode: "light" }])
    assert.equal(tabooLabel(settings), "Tabuwort");
});

test("B2: visible arrays are independent of frozen source cards and settings", () => {
  const card = Object.freeze({ ...cards[0], taboo: Object.freeze([...cards[0].taboo]) });
  for (const tabooMode of ["classic", "light", "none"]) {
    const settings = Object.freeze({ tabooMode });
    const before = structuredClone({ card, settings });
    const first = visibleTaboo(card, settings);
    const second = visibleTaboo(card, settings);
    assert.notEqual(first, card.taboo);
    assert.notEqual(first, second);
    first.reverse();
    first.push("Nur in der Ansicht");
    assert.deepEqual({ card, settings }, before);
    assert.deepEqual(second, visibleTaboo(card, settings));
  }
});

test("B2: metadata defines every supported mode with German names and descriptions", () => {
  assert.deepEqual(TABOO_MODES.map(({ id, name }) => ({ id, name })), [
    { id: "classic", name: "Klassisch" },
    { id: "light", name: "Leicht – 3 Tabuwörter" },
    { id: "none", name: "Frei erklären – ohne Tabuwörter" },
  ]);
  for (const mode of TABOO_MODES) {
    assert.equal(typeof mode.description, "string");
    assert.ok(mode.description.includes("verboten"));
  }
});

test("B2: validation accepts modes and legacy missing values without coercing others", () => {
  for (const value of ["classic", "light", "none", undefined, null])
    assert.doesNotThrow(() => validateTabooMode(value));
  for (const value of ["", "CLASSIC", "easy", " classic ", 0, 1, false, true, [], ["light"], {}, NaN])
    assert.throws(() => validateTabooMode(value), /Wähle eine gültige Tabu-Stufe\./);
});

test("B2: migration adds classic to a new state with no session and is idempotent", () => {
  const state = initialState(categories);
  const expected = structuredClone(state);
  expected.settings.tabooMode = "classic";
  migrateTabooMode(state);
  assert.deepEqual(state, expected);
  migrateTabooMode(state);
  assert.deepEqual(state, expected);
});

test("B2: legacy session migration changes only the two missing settings", () => {
  for (const phase of ["ready", "playing", "paused", "summary", "finished"]) {
    const state = initialState(categories);
    createSession(state, cards, categories);
    startTurn(state, cards, 1000, () => 0);
    recordResult(state, cards, "correct", 2000, () => 0);
    state.session.phase = phase;
    const expected = structuredClone(state);
    expected.settings.tabooMode = "classic";
    expected.session.settings.tabooMode = "classic";
    migrateTabooMode(state);
    assert.deepEqual(state, expected, phase);
    migrateTabooMode(state);
    assert.deepEqual(state, expected, `${phase}: idempotent`);
  }
});

test("B2: migration preserves setup and session modes independently", () => {
  for (const setupMode of [undefined, null, "classic", "light", "none"])
    for (const sessionMode of [undefined, null, "classic", "light", "none"]) {
      const state = initialState(categories);
      state.settings.tabooMode = setupMode;
      createSession(state, cards, categories);
      state.session.settings.tabooMode = sessionMode;
      const expected = structuredClone(state);
      expected.settings.tabooMode = setupMode ?? "classic";
      expected.session.settings.tabooMode = sessionMode ?? "classic";
      migrateTabooMode(state);
      assert.deepEqual(state, expected);
    }
});

test("B2: all modes keep scoring, undo and durable card history compatible", () => {
  for (const tabooMode of ["classic", "light", "none"])
    for (const tabooPenalty of [0, 1]) {
      const state = initialState(categories);
      state.settings.tabooMode = tabooMode;
      state.settings.tabooPenalty = tabooPenalty;
      createSession(state, cards, categories);
      startTurn(state, cards, 1000, () => 0);
      const firstId = state.session.current;
      const firstHistory = structuredClone(ensureGroup(state).seen);
      visibleTaboo(cards[0], state.session.settings);
      tabooLabel(state.session.settings);
      assert.deepEqual(ensureGroup(state).seen, firstHistory);
      recordResult(state, cards, "taboo", 2000, () => 0);
      const secondId = state.session.current;
      assert.equal(state.session.scores[0], tabooPenalty ? -1 : 0);
      assert.equal(state.session.log[0].result, "taboo");
      assert.equal(state.session.log[0].delta, -tabooPenalty);
      undoResult(state);
      assert.equal(state.session.scores[0], 0);
      assert.equal(state.session.current, firstId);
      assert.deepEqual(Object.keys(ensureGroup(state).seen), [firstId, secondId]);
      recordResult(state, cards, "correct", 3000, () => 0);
      const thirdId = state.session.current;
      assert.equal(state.session.scores[0], 1);
      state.settings.tabooMode = tabooMode === "none" ? "classic" : "none";
      assert.equal(state.session.settings.tabooMode, tabooMode);
      assert.deepEqual(Object.keys(ensureGroup(state).seen), [firstId, secondId, thirdId]);
      assert.ok(availableCards(cards, state.settings, ensureGroup(state).seen)
        .every((card) => ![firstId, secondId, thirdId].includes(card.id)));
      createSession(state, cards, categories);
      startTurn(state, cards, 7 * 24 * 60 * 60 * 1000, () => 0);
      assert.ok(![firstId, secondId, thirdId].includes(state.session.current));
      assert.equal(Object.keys(ensureGroup(state).seen).length, 4);
    }
});
