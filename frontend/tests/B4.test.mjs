import test from "node:test";
import assert from "node:assert/strict";
import { sessionStats } from "../src/rules/stats.js";
import { initialState, createSession, startTurn, recordResult, finishTurn, nextTurn, undoResult } from "../src/engine.js";

const categories = [{ id: "a" }];
const cards = Array.from({ length: 12 }, (_, i) => ({
  id: `de:begriff ${i}`, word: `Begriff ${i}`, taboo: ["A", "B", "C"],
  categories: ["a"], difficulty: "easy",
}));
const makeState = () => initialState(categories);

test("B4: absent and empty sessions produce no winners or phantom cards", () => {
  assert.deepEqual(sessionStats(null), {
    perTeam: [], bestTurn: null, tabooKing: null, totalCards: 0,
  });
  const s = makeState();
  createSession(s, cards, categories);
  assert.deepEqual(sessionStats(s.session), {
    perTeam: [
      { correct: 0, taboo: 0, skip: 0, points: 0 },
      { correct: 0, taboo: 0, skip: 0, points: 0 },
    ],
    bestTurn: null, tabooKing: null, totalCards: 0,
  });
});

test("B4: completed turns determine counts, points and unique awards", () => {
  const s = makeState();
  s.settings.skipPenalty = 1;
  createSession(s, cards, categories);
  startTurn(s, cards, 1000, () => 0);
  recordResult(s, cards, "correct", 2000, () => 0);
  recordResult(s, cards, "correct", 3000, () => 0);
  recordResult(s, cards, "skip", 4000, () => 0);
  finishTurn(s, 5000);
  nextTurn(s);
  startTurn(s, cards, 10000, () => 0);
  recordResult(s, cards, "taboo", 11000, () => 0);
  recordResult(s, cards, "taboo", 12000, () => 0);
  finishTurn(s, 13000);
  const before = structuredClone(s);
  assert.deepEqual(sessionStats(s.session), {
    perTeam: [
      { correct: 2, taboo: 0, skip: 1, points: 1 },
      { correct: 0, taboo: 2, skip: 0, points: -2 },
    ],
    bestTurn: { team: 0, cycle: 1, points: 1 },
    tabooKing: 1,
    totalCards: 5,
  });
  assert.deepEqual(s, before);
});

test("B4: a running log and score changes are excluded; undo removes a result", () => {
  const s = makeState();
  createSession(s, cards, categories);
  startTurn(s, cards, 1000, () => 0);
  recordResult(s, cards, "correct", 2000, () => 0);
  recordResult(s, cards, "taboo", 3000, () => 0);
  assert.equal(sessionStats(s.session).totalCards, 0);
  assert.equal(sessionStats(s.session).bestTurn, null);
  undoResult(s);
  finishTurn(s, 4000);
  const stats = sessionStats(s.session);
  assert.equal(stats.totalCards, 1);
  assert.deepEqual(stats.perTeam[0], { correct: 1, taboo: 0, skip: 0, points: 1 });
  assert.equal(stats.tabooKing, null);
  assert.equal(Object.keys(s.groups["group:unsere runde"].seen).length, 3);
});

test("B4: equal best rounds and equal taboo totals produce no arbitrary winner", () => {
  const session = {
    settings: { teams: ["A", "B", "C"] },
    turns: [
      { team: 0, cycle: 1, points: 0, log: [{ result: "correct" }, { result: "taboo" }] },
      { team: 1, cycle: 1, points: 0, log: [{ result: "correct" }, { result: "taboo" }] },
      { team: 2, cycle: 1, points: -1, log: [{ result: "skip" }] },
    ],
  };
  const stats = sessionStats(session);
  assert.equal(stats.bestTurn, null);
  assert.equal(stats.tabooKing, null);
  assert.equal(stats.totalCards, 5);
  // Even equal best rounds by the same team are a tie between rounds.
  session.turns[1].team = 0;
  assert.equal(sessionStats(session).bestTurn, null);
  assert.equal(sessionStats(session).tabooKing, 0);
});

test("B4: negative rounds can win and historical empty logs are safe", () => {
  const session = {
    settings: { teams: ["A", "B"] },
    turns: [
      { team: 0, cycle: 1, points: -2, log: [] },
      { team: 1, cycle: 1, points: -1 },
    ],
  };
  assert.deepEqual(sessionStats(session).bestTurn, { team: 1, cycle: 1, points: -1 });
  assert.equal(sessionStats(session).tabooKing, null);
  assert.equal(sessionStats(session).totalCards, 0);
});
