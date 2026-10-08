import test from "node:test";
import assert from "node:assert/strict";
import {
  initialState,
  ensureGroup,
  createSession,
  startTurn,
  recordResult,
  pause,
  resume,
  finishTurn,
  nextTurn,
  undoResult,
  availableCards,
  groupId,
  resetGroup,
  exportBackup,
  importBackup,
} from "../src/engine.js";
import { findSpeechMatches } from "../src/speech.js";
import { readFile } from "node:fs/promises";

const categories = [{ id: "a" }, { id: "b" }];
const cards = Array.from({ length: 8 }, (_, i) => ({
  id: `de:wort ${i}`,
  word: `Wort ${i}`,
  taboo: ["Haus", "Straße", "Gute Laune"],
  categories: [i < 4 ? "a" : "b"],
}));
const state = () => initialState(categories);
const begin = (s) => {
  createSession(s, cards, categories);
  startTurn(s, cards, 1000, () => 0);
};

test("cards are reserved on reveal; skips, new games and a week later do not repeat them", () => {
  const s = state();
  begin(s);
  const first = s.session.current;
  assert.ok(ensureGroup(s).seen[first]);
  recordResult(s, cards, "skip", 2000, () => 0);
  assert.notEqual(s.session.current, first);
  const second = s.session.current;
  finishTurn(s, 3000);
  s.session = null;
  createSession(s, cards, categories);
  startTurn(s, cards, 7 * 24 * 60 * 60 * 1000, () => 0);
  assert.ok(![first, second].includes(s.session.current));
  assert.equal(Object.keys(ensureGroup(s).seen).length, 3);
});

test("repetition protection is global across categories but separate for groups", () => {
  const shared = [{ ...cards[0], categories: ["a", "b"] }];
  const s = state();
  s.settings.selected = ["a"];
  createSession(s, shared, categories);
  startTurn(s, shared, 1000);
  s.settings.selected = ["b"];
  assert.equal(
    availableCards(shared, s.settings, ensureGroup(s).seen).length,
    0,
  );
  s.settings.group = "Andere Gruppe";
  assert.equal(
    availableCards(shared, s.settings, ensureGroup(s).seen).length,
    1,
  );
});

test("time deadline prevents a late tap from awarding points or consuming another card", () => {
  const s = state();
  begin(s);
  recordResult(s, cards, "correct", 61000, () => 0);
  assert.equal(s.session.phase, "summary");
  assert.equal(s.session.scores[0], 0);
  assert.equal(Object.keys(ensureGroup(s).seen).length, 1);
});

test("scoring, undo, pause and resume preserve revealed cards", () => {
  const s = state();
  begin(s);
  const first = s.session.current;
  recordResult(s, cards, "correct", 2000, () => 0);
  const second = s.session.current;
  assert.equal(s.session.scores[0], 1);
  undoResult(s);
  assert.equal(s.session.scores[0], 0);
  assert.equal(s.session.current, first);
  assert.ok(ensureGroup(s).seen[second]);
  pause(s, 4000);
  assert.equal(s.session.remaining, 57000);
  resume(s, 100000);
  assert.equal(s.session.deadline, 157000);
  recordResult(s, cards, "taboo", 101000, () => 0);
  assert.equal(s.session.scores[0], -1);
  assert.notEqual(s.session.current, second);
});

test("exhausted packs stop without silently resetting history", () => {
  const s = state();
  const small = [cards[0]];
  createSession(s, small, categories);
  startTurn(s, small, 1000);
  recordResult(s, small, "correct", 2000);
  assert.equal(s.session.exhausted, true);
  assert.equal(s.session.phase, "summary");
  nextTurn(s);
  assert.equal(s.session.phase, "finished");
  assert.throws(() => createSession(s, small, categories), /ausgespielt/);
  assert.equal(Object.keys(ensureGroup(s).seen).length, 1);
});

test("all teams receive the configured number of rounds", () => {
  const s = state();
  s.settings.cycles = 2;
  createSession(s, cards, categories);
  for (let i = 0; i < 4; i++) {
    startTurn(s, cards, 1000 + i * 100000, () => 0);
    finishTurn(s);
    nextTurn(s);
  }
  assert.equal(s.session.phase, "finished");
  assert.deepEqual(
    s.session.turns.map((t) => [t.team, t.cycle]),
    [
      [0, 1],
      [1, 1],
      [0, 2],
      [1, 2],
    ],
  );
});

test("manual reset clears only the requested group and ends its running session", () => {
  const s = state();
  begin(s);
  ensureGroup(s, "Andere Gruppe").seen["de:wort 7"] = 1000;
  resetGroup(s, s.settings.group);
  assert.equal(s.session, null);
  assert.equal(Object.keys(ensureGroup(s).seen).length, 0);
  assert.equal(Object.keys(s.groups[groupId("Andere Gruppe")].seen).length, 1);
});

test("backup round trip merges histories; invalid imports are rejected", () => {
  const s = state();
  begin(s);
  const backup = exportBackup(s),
    target = state();
  assert.equal(importBackup(target, backup), 1);
  assert.equal(importBackup(target, backup), 0);
  begin(target);
  assert.notEqual(target.session.current, s.session.current);
  assert.throws(() => importBackup(target, { app: "other" }), /gültige/);
  backup.groups[groupId(s.settings.group)].seen["__proto__"] = 3;
  // Validate malformed history entries without allowing dangerous keys.
  Object.defineProperty(backup.groups[groupId(s.settings.group)].seen, "bad", {
    enumerable: true,
    value: 3,
  });
  assert.throws(() => importBackup(target, backup), /ungültige/);
});

test("speech matching respects word boundaries and phrases; values never auto-score", () => {
  const card = { word: "Gute Laune", taboo: ["Haus", "Straße"] };
  assert.deepEqual(
    findSpeechMatches("Im Kaufhaus herrscht gute Laune.", card),
    { taboo: [], guessed: true },
  );
  assert.deepEqual(findSpeechMatches("Ein Haus an der STRASSE", card).taboo, [
    "Haus",
    "Straße",
  ]);
});

test("the shipped dataset has complete, unique cards and no empty categories", async () => {
  const dataset = JSON.parse(
    await readFile(new URL("../src/data/cards.json", import.meta.url), "utf8"),
  );
  assert.ok(dataset.cards.length >= 1000);
  assert.equal(
    new Set(dataset.cards.map((c) => c.id)).size,
    dataset.cards.length,
  );
  for (const card of dataset.cards)
    assert.ok(
      card.word.trim() &&
        card.taboo.length >= 3 &&
        card.taboo.every((x) => x.trim()),
    );
  for (const category of dataset.categories)
    assert.ok(
      dataset.cards.some((c) => c.categories.includes(category.id)),
      `${category.name} has no cards`,
    );
});
