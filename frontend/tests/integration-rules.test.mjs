import test from "node:test";
import assert from "node:assert/strict";
import { initialState, createSession, startTurn, recordResult, undoResult, importBackup, groupId } from "../src/engine.js";
import { configureGameMode, validateGameMode } from "../src/rules/pantomime.js";
import { visibleTaboo, tabooLabel } from "../src/rules/taboo.js";

const categories = [{ id: "food" }];
const cards = ["Apfel", "Brot", "Milch"].map((word) => ({ id: `de:${word.toLowerCase()}`, word, taboo: ["Obst", "Essen", "Küche", "Rot"], difficulty: "easy", categories: ["food"] }));

test("undo restores the mode of the scored card and preserves every exposed ID", () => {
  const state = initialState(categories);
  state.settings.modes = ["explain", "draw"];
  createSession(state, cards, categories);
  const random = [0, 0.9, 0, 0];
  startTurn(state, cards, 1000, () => random.shift());
  assert.equal(state.session.currentMode, "draw");
  recordResult(state, cards, "correct", 2000, () => random.shift());
  assert.equal(state.session.currentMode, "explain");
  assert.equal(state.session.log[0].mode, "draw");
  undoResult(state);
  assert.equal(state.session.currentMode, "draw");
  assert.equal(state.session.current, "de:apfel");
  assert.deepEqual(state.session.scores, [0, 0]);
  assert.deepEqual(Object.keys(state.groups[groupId(state.settings.group)].seen), ["de:apfel", "de:brot"]);
  state.session.log.push({ id: "de:brot", delta: 0 });
  undoResult(state);
  assert.equal(state.session.currentMode, "explain");
});

test("invalid later backup groups cannot partially modify earlier groups", () => {
  const state = initialState(categories);
  const before = structuredClone(state);
  const backup = { app: "wortspiel", schema: 1, groups: {
    "group:valid": { name: "Valid", seen: { "de:apfel": 42 } },
    "group:invalid": { name: "Invalid", seen: { bad: 43 } },
  } };
  assert.throws(() => importBackup(state, backup), /ungültige Kartendaten/);
  assert.deepEqual(state, before);
});

test("free explaining stays coherent after settings sections and explicit switches", () => {
  const previous = { gameMode: "taboo", tabooMode: "classic", difficulty: "easy" };
  const free = configureGameMode({ ...previous, gameMode: "free" }, previous, "gameMode");
  assert.equal(free.tabooMode, "none");
  assert.doesNotThrow(() => validateGameMode(free));
  assert.deepEqual(visibleTaboo(cards[0], free), []);
  assert.equal(tabooLabel(free), "Wort gesagt");
  assert.equal(configureGameMode({ ...free, tabooMode: "classic" }, free, "seconds").tabooMode, "none");
  const classic = configureGameMode({ ...free, gameMode: "taboo" }, free, "gameMode");
  assert.equal(classic.tabooMode, "classic");
  const light = configureGameMode({ ...free, tabooMode: "light" }, free, "tabooMode");
  assert.equal(light.gameMode, "taboo");
  assert.equal(visibleTaboo(cards[0], light).length, 3);
  assert.equal(configureGameMode({ ...previous, tabooMode: "none" }, previous, "tabooMode").gameMode, "free");
  assert.throws(() => validateGameMode({ gameMode: "free", tabooMode: "classic" }), /keine zusätzlichen/);
  assert.equal(configureGameMode({ ...previous, gameMode: "pantomime" }, previous, "gameMode").difficulty, "all");
});
