import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { migrateSettings, restoreSession, ensureGroup, resume, recordResult, undoResult, importBackup, exportBackup, initialState, groupId, createSession } from "../src/engine.js";
import { pantomimeCards } from "../src/rules/pantomime.js";

const dataset = JSON.parse(await readFile(new URL("../src/data/cards.json", import.meta.url)));
const pantomime = JSON.parse(await readFile(new URL("../src/data/pantomime.json", import.meta.url)));
const cards = [...dataset.cards, ...pantomimeCards(pantomime)];
const fixture = async (name) => JSON.parse(await readFile(new URL(`./fixtures/QA-STORAGE/${name}.json`, import.meta.url)));

test("new sessions have distinct identities while preserving schema and seen cards", () => {
  const state = initialState(dataset.categories);
  ensureGroup(state).seen["de:apfel"] = 42;
  createSession(state, cards, dataset.categories);
  const first = state.session.id;
  createSession(state, cards, dataset.categories);
  assert.match(first, /^[a-f0-9]{32}$/);
  assert.notEqual(state.session.id, first);
  assert.equal(state.schema, 1);
  assert.equal(ensureGroup(state).seen["de:apfel"], 42);
});

for (const name of ["legacy-v1", "legacy-v2-retired", "legacy-v2-pantomime"]) {
  test(`${name}: migration preserves three groups, scores, teams, logs, seen IDs and the paused round`, async () => {
    const state = await fixture(name);
    const old = structuredClone(state);
    migrateSettings(state);
    restoreSession(state);
    ensureGroup(state);
    assert.equal(state.schema, 1);
    assert.equal(state.revision, old.revision);
    assert.deepEqual(state.groups, old.groups);
    for (const key of ["scores", "turns", "log", "current", "phase", "remaining", "turnIndex"])
      assert.deepEqual(state.session[key], old.session[key], key);
    for (const [key, value] of Object.entries(old.session.settings))
      assert.deepEqual(state.session.settings[key], value, key);
    for (const group of Object.values(state.groups))
      assert.ok(Object.keys(group.seen).every(id => cards.some(card => card.id === id)), "all historical IDs still resolve");
    if (name === "legacy-v1") {
      assert.equal(state.settings.difficulty, "easy");
      assert.equal(state.session.settings.difficulty, "all");
    }
    if (name === "legacy-v2-retired") {
      assert.equal(state.session.settings.gameMode, "taboo");
      assert.equal(state.session.settings.tabooMode, "none");
      assert.equal(cards.find(c => c.id === state.session.current).retired, true);
    }
  });

  test(`${name}: old round resumes, scores its original card and undo keeps the new card reserved`, async () => {
    const state = await fixture(name);
    migrateSettings(state);
    const old = structuredClone(state);
    resume(state, 1000);
    recordResult(state, cards, "correct", 2000, () => 0);
    assert.equal(state.session.log.at(-1).id, old.session.current);
    assert.equal(state.session.log.length, old.session.log.length + 1);
    const newCard = state.session.current;
    assert.ok(!Object.hasOwn(old.groups[groupId(state.settings.group)].seen, newCard));
    undoResult(state);
    assert.deepEqual(state.session.scores, old.session.scores);
    assert.equal(state.session.current, old.session.current);
    assert.ok(Object.hasOwn(state.groups[groupId(state.settings.group)].seen, newCard));
    for (const [id, group] of Object.entries(old.groups))
      for (const [card, timestamp] of Object.entries(group.seen))
        assert.equal(state.groups[id].seen[card], timestamp);
  });
}

test("playing legacy round pauses on reload without changing scores/history or spending another card", async () => {
  const state = await fixture("legacy-v1");
  state.session.phase = "playing";
  state.session.deadline = 61000;
  const before = structuredClone(state);
  migrateSettings(state);
  restoreSession(state, 1000);
  assert.equal(state.session.phase, "paused");
  assert.equal(state.session.remaining, 60000);
  assert.equal(state.session.current, before.session.current);
  assert.deepEqual(state.session.scores, before.session.scores);
  assert.deepEqual(state.session.turns, before.session.turns);
  assert.deepEqual(state.groups, before.groups);
});

test("original v1 backup merges all groups, retaining newer timestamps and existing session/settings", async () => {
  const backup = await fixture("legacy-v1-backup");
  const state = await fixture("legacy-v2-pantomime");
  const before = structuredClone(state);
  const expected = Object.values(backup.groups).reduce((n,g) => n + Object.keys(g.seen).filter(id => !Object.hasOwn(state.groups[groupId(g.name)]?.seen ?? {}, id)).length, 0);
  assert.equal(importBackup(state, backup), expected);
  assert.equal(importBackup(state, backup), 0);
  assert.deepEqual(state.session, before.session);
  assert.deepEqual(state.settings, before.settings);
  for (const [id, group] of Object.entries(before.groups))
    for (const [card, timestamp] of Object.entries(group.seen))
      assert.ok(state.groups[id].seen[card] >= timestamp);
  const target = initialState(dataset.categories);
  importBackup(target, exportBackup(state));
  assert.deepEqual(Object.keys(target.groups).sort(), Object.keys(state.groups).sort());
  for (const [id, group] of Object.entries(state.groups))
    assert.deepEqual(target.groups[id].seen, group.seen);
});
