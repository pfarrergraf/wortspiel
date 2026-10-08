import test from "node:test";
import assert from "node:assert/strict";
import { MODES, pickMode, validateModes, migrateModes } from "../src/rules/modes.js";
import { initialState, createSession, startTurn, recordResult, ensureGroup } from "../src/engine.js";

const ids = ["explain", "pantomime", "draw", "oneword"];
const noRandom = () => assert.fail("A single available mode must not consume randomness");

test("all four modes have German names and short rules for the interface", () => {
  assert.deepEqual(MODES.map((mode) => mode.id), ids);
  assert.deepEqual(MODES.map((mode) => mode.name), ["Erklären", "Pantomime", "Zeichnen", "Ein Wort"]);
  for (const mode of MODES) assert.ok(mode.description.trim().length > 20);
});

test("legacy settings and a single mode do not consume card-selection randomness", () => {
  for (const settings of [undefined, {}, { modes: undefined }, { modes: null }, { modes: ["explain"] }])
    assert.equal(pickMode({ difficulty: "easy" }, settings, noRandom), "explain");
  assert.equal(pickMode({ difficulty: "hard" }, { modes: ["oneword"] }, noRandom), "oneword");
});

test("visual modes are allowed for easy and medium cards only", () => {
  for (const difficulty of ["easy", "medium"])
    for (const mode of ["pantomime", "draw"])
      assert.equal(pickMode({ difficulty }, { modes: [mode] }, noRandom), mode);
  for (const difficulty of ["hard", undefined, null, "all", "unknown"])
    for (const mode of ["pantomime", "draw"])
      assert.equal(pickMode({ difficulty }, { modes: [mode] }, noRandom), "explain");
  assert.equal(pickMode(null, { modes: ["draw"] }, noRandom), "explain");
});

test("filtering keeps nonvisual selected modes and uses explain only if no mode remains", () => {
  assert.equal(pickMode({ difficulty: "hard" }, { modes: ["draw", "oneword", "pantomime"] }, noRandom), "oneword");
  assert.equal(pickMode({ difficulty: "hard" }, { modes: ["draw", "pantomime"] }, noRandom), "explain");
  for (const modes of [[], ["unknown"], [null], "draw"])
    assert.equal(pickMode({ difficulty: "easy" }, { modes }, noRandom), "explain");
  assert.equal(pickMode({ difficulty: "easy" }, { modes: ["draw", "draw", "unknown"] }, noRandom), "draw");
});

test("every selected mode gets an equal random interval, with exactly one random call", () => {
  for (const modes of [ids, ["draw", "oneword"], ["oneword", "pantomime", "explain"]]) {
    const counts = new Map(modes.map((mode) => [mode, 0]));
    for (let sample = 0; sample < modes.length * 100; sample++) {
      let calls = 0;
      const mode = pickMode({ difficulty: "medium" }, { modes }, () => {
        calls++;
        return (sample + 0.5) / (modes.length * 100);
      });
      counts.set(mode, counts.get(mode) + 1);
      assert.equal(calls, 1);
    }
    assert.deepEqual([...counts.values()], modes.map(() => 100));
    modes.forEach((mode, index) => {
      assert.equal(pickMode({ difficulty: "easy" }, { modes }, () => index / modes.length), mode);
      assert.equal(pickMode({ difficulty: "easy" }, { modes }, () => (index + 1) / modes.length - Number.EPSILON), mode);
    });
  }
});

test("hard cards randomize only the remaining eligible modes without duplicate weighting", () => {
  const settings = Object.freeze({ modes: Object.freeze(["draw", "oneword", "oneword", "explain", "pantomime"]) });
  const card = Object.freeze({ difficulty: "hard" });
  assert.equal(pickMode(card, settings, () => 0), "oneword");
  assert.equal(pickMode(card, settings, () => 0.5), "explain");
  assert.equal(pickMode(card, settings, () => 1 - Number.EPSILON), "explain");
  assert.deepEqual(settings.modes, ["draw", "oneword", "oneword", "explain", "pantomime"]);
});

test("random endpoints cannot select an undefined mode", () => {
  for (const value of [-1, 0, NaN, Infinity, -Infinity])
    assert.equal(pickMode({ difficulty: "easy" }, { modes: ids }, () => value), "explain");
  for (const value of [1, 2])
    assert.equal(pickMode({ difficulty: "easy" }, { modes: ids }, () => value), "oneword");
});

test("mode validation rejects empty, duplicate and unknown selections with a German message", () => {
  for (const value of [undefined, null, ids, ["draw"], ["oneword", "explain"]])
    assert.doesNotThrow(() => validateModes(value));
  for (const value of [[], "explain", {}, 1, false, ["unknown"], ["explain", "explain"], [null], ["draw", 2], Array(1)])
    assert.throws(() => validateModes(value), /Wähle mindestens einen gültigen Spielmodus/);
});

test("migration adds independent defaults without changing an active game or group history", () => {
  const state = {
    settings: { modes: null, group: "Konfis" },
    session: { settings: {}, phase: "paused", current: "de:apfel", currentMode: "explain", scores: [2, 0], remaining: 32000 },
    groups: { "group:konfis": { seen: { "de:apfel": 42 } } },
  };
  const before = structuredClone(state);
  migrateModes(state);
  before.settings.modes = ["explain"];
  before.session.settings.modes = ["explain"];
  assert.deepEqual(state, before);
  assert.notEqual(state.settings.modes, state.session.settings.modes);
  state.settings.modes.push("draw");
  migrateModes(state);
  assert.deepEqual(state.session.settings.modes, ["explain"]);
  assert.deepEqual(state.settings.modes, ["explain", "draw"]);
  assert.doesNotThrow(() => migrateModes({ settings: {}, session: null }));
});

test("migration preserves each existing modes array and is idempotent", () => {
  const selected = ["draw", "oneword"];
  const active = ["pantomime"];
  const state = { settings: { modes: selected }, session: { settings: { modes: active } } };
  migrateModes(state);
  migrateModes(state);
  assert.equal(state.settings.modes, selected);
  assert.equal(state.session.settings.modes, active);
});

test("drawing chooses from the session snapshot and preserves reserved cards across new modes", () => {
  const categories = [{ id: "food" }];
  const cards = ["Apfel", "Brot", "Milch"].map((word) => ({
    id: `de:${word.toLowerCase()}`, word, categories: ["food"], difficulty: "easy", taboo: ["Essen", "Küche", "Hunger"],
  }));
  const state = initialState(categories);
  state.settings.modes = ["draw"];
  createSession(state, cards, categories);
  state.settings.modes = ["oneword"];
  let calls = 0;
  const random = () => { calls++; return 0; };
  startTurn(state, cards, 1000, random);
  assert.equal(calls, 1);
  assert.equal(state.session.currentMode, "draw");
  assert.equal(ensureGroup(state).seen["de:apfel"], 1000);
  recordResult(state, cards, "skip", 2000, random);
  assert.equal(calls, 2);
  assert.equal(state.session.currentMode, "draw");
  assert.deepEqual(Object.keys(ensureGroup(state).seen), ["de:apfel", "de:brot"]);
  createSession(state, cards, categories);
  startTurn(state, cards, 3000, random);
  assert.equal(state.session.current, "de:milch");
  assert.equal(state.session.currentMode, "oneword");
  assert.deepEqual(Object.keys(ensureGroup(state).seen), ["de:apfel", "de:brot", "de:milch"]);
});

test("legacy engine draws keep consuming only the existing card random call", () => {
  const categories = [{ id: "food" }];
  const cards = [{ id: "de:apfel", word: "Apfel", categories: ["food"], difficulty: "easy", taboo: ["Obst"] }];
  const state = initialState(categories);
  createSession(state, cards, categories);
  let calls = 0;
  startTurn(state, cards, 1000, () => { calls++; return 0; });
  assert.equal(calls, 1);
  assert.equal(state.session.currentMode, "explain");
});
