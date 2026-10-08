import test from "node:test";
import assert from "node:assert/strict";
import {
  AGE_GROUPS,
  matchesAudience,
  validateAgeGroup,
  migrateAudience,
} from "../src/rules/audience.js";
import {
  initialState,
  availableCards,
  createSession,
  startTurn,
  recordResult,
  undoResult,
  ensureGroup,
} from "../src/engine.js";

const categories = [{ id: "a" }, { id: "b" }];
const card = (id, ageMin, extra = {}) => ({
  id: `de:${id}`,
  word: id,
  taboo: ["Erklären", "Raten", "Spielen"],
  categories: ["a"],
  difficulty: "easy",
  ageMin,
  ...extra,
});

test("audience choices expose every supported group and an unrestricted option", () => {
  assert.deepEqual(AGE_GROUPS.map((group) => group.id), [6, 8, 10, 12, 14, null]);
  assert.equal(AGE_GROUPS[0].name, "Kinder ab 6");
  assert.equal(AGE_GROUPS.at(-1).name, "Alle");
  assert.ok(AGE_GROUPS.every((group) => typeof group.name === "string" && group.name.trim()));
});

test("each audience includes its boundary age and excludes older cards", () => {
  for (const ageGroup of [6, 8, 10, 12, 14]) {
    for (const ageMin of [6, 8, 10, 12, 14, 16]) {
      assert.equal(
        matchesAudience({ ageMin }, { ageGroup }),
        ageMin <= ageGroup,
        `ageMin ${ageMin}, ageGroup ${ageGroup}`,
      );
    }
  }
});

test("missing or null card ages safely default to 14", () => {
  for (const candidate of [{}, { ageMin: undefined }, { ageMin: null }]) {
    for (const ageGroup of [6, 8, 10, 12])
      assert.equal(matchesAudience(candidate, { ageGroup }), false);
    assert.equal(matchesAudience(candidate, { ageGroup: 14 }), true);
  }
});

test("null and missing audience preserve the full existing card pool", () => {
  for (const settings of [{}, { ageGroup: undefined }, { ageGroup: null }]) {
    for (const candidate of [{}, { ageMin: 6 }, { ageMin: 16 }])
      assert.equal(matchesAudience(candidate, settings), true);
  }
});

test("retired cards are excluded at every audience including unrestricted games", () => {
  for (const ageGroup of [undefined, null, 6, 8, 10, 12, 14]) {
    assert.equal(matchesAudience({ ageMin: 6, retired: true }, { ageGroup }), false);
    assert.equal(matchesAudience({ ageMin: 6, retired: false }, { ageGroup }), true);
  }
  // Only the explicit retirement flag hides a card.
  assert.equal(matchesAudience({ ageMin: 6, retired: "true" }, {}), true);
});

test("audience validation accepts supported values and rejects coercible or invalid input", () => {
  for (const value of [undefined, null, 6, 8, 10, 12, 14])
    assert.doesNotThrow(() => validateAgeGroup(value));
  for (const value of [0, 7, 16, -1, NaN, Infinity, "6", "14", "all", "", true, false, [], {}])
    assert.throws(() => validateAgeGroup(value), /gültige Altersgruppe/);
});

test("legacy audience migration preserves current card, scores, timer and group histories", () => {
  const state = initialState(categories);
  const pool = [card("alt", undefined), card("weiter", undefined)];
  createSession(state, pool, categories);
  startTurn(state, pool, 1000, () => 0);
  ensureGroup(state, "Andere Gruppe").seen["de:separat"] = 42;
  const before = structuredClone(state);

  migrateAudience(state);
  before.settings.ageGroup = null;
  before.session.settings.ageGroup = null;
  assert.deepEqual(state, before);
  migrateAudience(state);
  assert.deepEqual(state, before, "migration is idempotent");
});

test("migration keeps explicitly chosen audiences independent for setup and current session", () => {
  const state = initialState(categories);
  state.settings.ageGroup = 8;
  createSession(state, [card("kind", 6)], categories);
  state.settings.ageGroup = 14;
  migrateAudience(state);
  assert.equal(state.settings.ageGroup, 14);
  assert.equal(state.session.settings.ageGroup, 8);
  state.session.settings.ageGroup = undefined;
  migrateAudience(state);
  assert.equal(state.settings.ageGroup, 14);
  assert.equal(state.session.settings.ageGroup, null);

  state.session = null;
  state.settings.ageGroup = undefined;
  migrateAudience(state);
  assert.equal(state.settings.ageGroup, null);
  assert.equal(state.session, null);
});

test("engine combines audience, difficulty, categories and history without modifying the pool", () => {
  const pool = [
    card("kind", 6),
    card("jugend", 14),
    card("alt", undefined),
    card("ausgeblendet", 6, { retired: true }),
    card("schwer", 6, { difficulty: "hard" }),
    card("anderes thema", 6, { categories: ["b"] }),
  ];
  const settings = { ...initialState(categories).settings, ageGroup: 8, selected: ["a"] };
  const before = structuredClone(pool);
  assert.deepEqual(availableCards(pool, settings).map((item) => item.id), ["de:kind"]);
  assert.deepEqual(availableCards(pool, settings, { "de:kind": 0 }), []);
  settings.ageGroup = null;
  assert.deepEqual(availableCards(pool, settings).map((item) => item.id), ["de:kind", "de:jugend", "de:alt"]);
  assert.deepEqual(pool, before);
});

test("changing audiences, undo and a new game a week later keep exposed cards reserved", () => {
  const state = initialState(categories);
  const pool = [card("eins", 6), card("zwei", 8), card("drei", 14), card("vier", 16)];
  state.settings.ageGroup = 8;
  createSession(state, pool, categories);
  startTurn(state, pool, 1000, () => 0);
  assert.equal(state.session.current, "de:eins");
  state.settings.ageGroup = null;
  recordResult(state, pool, "correct", 2000, () => 0);
  assert.equal(state.session.current, "de:zwei");
  assert.equal(state.session.settings.ageGroup, 8, "running game keeps its audience");
  undoResult(state);
  assert.equal(state.session.scores[0], 0);
  assert.equal(state.session.current, "de:eins");
  assert.deepEqual(ensureGroup(state).seen, { "de:eins": 1000, "de:zwei": 2000 });

  createSession(state, pool, categories);
  startTurn(state, pool, 7 * 24 * 60 * 60 * 1000, () => 0);
  assert.equal(state.session.current, "de:drei");
  state.settings.ageGroup = 8;
  const history = structuredClone(state.groups);
  assert.throws(() => createSession(state, pool, categories), /keine ungespielten/);
  assert.deepEqual(state.groups, history, "exhaustion never clears history");

  state.settings.group = "Andere Gruppe";
  createSession(state, pool, categories);
  startTurn(state, pool, 10000, () => 0);
  assert.equal(state.session.current, "de:eins", "history remains scoped to its group");
});
