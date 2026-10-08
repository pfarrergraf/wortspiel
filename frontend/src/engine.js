import { matchesAudience } from "./rules/audience.js";
import { pickMode } from "./rules/modes.js";

export const SCHEMA = 1;
export const normalize = (text) =>
  String(text)
    .normalize("NFKC")
    .toLocaleLowerCase("de")
    .replace(/ß/g, "ss")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
export const groupId = (name) => `group:${normalize(name)}`;

export const DIFFICULTIES = [
  { id: "easy", name: "Leicht", description: "Vertraute Begriffe aus Alltag, Schule und Freizeit. Keine seltenen Promis oder Spezialbegriffe." },
  { id: "medium", name: "Mittel", description: "Leichte Karten plus mehr Allgemeinwissen, bekannte Personen und Begriffe aus dem Konfi-Unterricht." },
  { id: "all", name: "Alles / knifflig", description: "Der gesamte Bestand, einschließlich seltener Promis und Spezialwissen." },
];
export const PRESETS = [
  { id: "youth", name: "Jugendliche", difficulty: "easy", categories: ["animals", "city-country", "food", "sports", "things", "tv", "web", "everyday"] },
  { id: "confirmation", name: "Konfis", difficulty: "easy", categories: ["animals", "city-country", "food", "sports", "things", "tv", "web", "everyday", "faith"] },
  { id: "mixed", name: "Gemischte Runde", difficulty: "medium", categories: null },
];

export function applyPreset(settings, presetId, categories) {
  const preset = PRESETS.find((p) => p.id === presetId);
  if (!preset) throw new Error("Unbekannte Gruppenauswahl.");
  settings.difficulty = preset.difficulty;
  settings.selected = categories
    .filter((c) => !preset.categories || preset.categories.includes(c.id))
    .map((c) => c.id);
}

export function matchesDifficulty(card, difficulty = "all") {
  // Missing metadata is never treated as an easy card.
  return difficulty === "all" || card.difficulty === "easy" ||
    (difficulty === "medium" && card.difficulty === "medium");
}

export function migrateDifficulty(state) {
  // Safer defaults for future games; keep an existing game's original pool.
  state.settings.difficulty ??= "easy";
  if (state.session) state.session.settings.difficulty ??= "all";
}

export function initialState(categories) {
  return {
    schema: SCHEMA,
    revision: 0,
    groups: {},
    session: null,
    settings: {
      group: "Unsere Runde",
      teams: ["Team Konfetti", "Team Rakete"],
      selected: categories.map((c) => c.id),
      difficulty: "easy",
      seconds: 60,
      cycles: 3,
      skipPenalty: 0,
      tabooPenalty: 1,
      sound: true,
      speech: false,
    },
  };
}

export function ensureGroup(state, name = state.settings.group) {
  const clean = name.trim().slice(0, 60) || "Unsere Runde";
  const id = groupId(clean);
  if (!state.groups[id])
    state.groups[id] = {
      name: clean,
      seen: {},
      createdAt: Date.now(),
      resetAt: null,
    };
  return state.groups[id];
}

// Every per-card filter that does not depend on categories or history.
export function matchesSettings(card, settings) {
  return (
    matchesDifficulty(card, settings.difficulty) &&
    matchesAudience(card, settings)
  );
}

export function availableCards(cards, settings, seen = {}) {
  const selected = new Set(settings.selected);
  return cards.filter(
    (card) =>
      card.categories.some((id) => selected.has(id)) &&
      matchesSettings(card, settings) &&
      !Object.hasOwn(seen, card.id),
  );
}

export function validateSettings(settings, categories) {
  if (!DIFFICULTIES.some((d) => d.id === (settings.difficulty ?? "all")))
    throw new Error("Wähle einen gültigen Schwierigkeitsgrad.");
  if (
    typeof settings.group !== "string" ||
    !settings.group.trim() ||
    settings.group.length > 60
  )
    throw new Error("Gib deiner Gruppe einen Namen (bis zu 60 Zeichen).");
  if (
    !Array.isArray(settings.teams) ||
    settings.teams.length < 2 ||
    settings.teams.length > 6 ||
    settings.teams.some(
      (t) => typeof t !== "string" || !t.trim() || t.length > 30,
    )
  )
    throw new Error("Ihr braucht 2 bis 6 Teams mit Namen.");
  if (new Set(settings.teams.map(normalize)).size !== settings.teams.length)
    throw new Error("Bitte verwende unterschiedliche Teamnamen.");
  if (
    !Array.isArray(settings.selected) ||
    settings.selected.length === 0 ||
    settings.selected.some((id) => !categories.some((c) => c.id === id))
  )
    throw new Error("Wähle mindestens ein Themenpaket.");
  if (
    !Number.isInteger(settings.seconds) ||
    settings.seconds < 15 ||
    settings.seconds > 180
  )
    throw new Error("Die Rundenzeit muss zwischen 15 und 180 Sekunden liegen.");
  if (
    !Number.isInteger(settings.cycles) ||
    settings.cycles < 1 ||
    settings.cycles > 20
  )
    throw new Error("Wähle 1 bis 20 Runden pro Team.");
  if (
    ![0, 1].includes(settings.skipPenalty) ||
    ![0, 1].includes(settings.tabooPenalty)
  )
    throw new Error("Ungültige Punkte-Regel.");
}

export function createSession(state, cards, categories) {
  validateSettings(state.settings, categories);
  const group = ensureGroup(state);
  if (!availableCards(cards, state.settings, group.seen).length)
    throw new Error(
      "Für diese Themen und diese Stufe sind keine ungespielten Karten übrig (oder die Auswahl ist ausgespielt). Wähle weitere Themen oder eine höhere Stufe. Der Kartenspeicher bleibt erhalten.",
    );
  state.session = {
    settings: structuredClone(state.settings),
    phase: "ready",
    turnIndex: 0,
    scores: state.settings.teams.map(() => 0),
    turns: [],
    log: [],
    current: null,
    remaining: state.settings.seconds * 1000,
    deadline: null,
    exhausted: false,
  };
}

export const teamIndex = (session) =>
  session.turnIndex % session.settings.teams.length;
export const cycle = (session) =>
  Math.floor(session.turnIndex / session.settings.teams.length) + 1;
export const roundPoints = (session) =>
  session.log.reduce((sum, entry) => sum + entry.delta, 0);

export function drawCard(state, cards, random = Math.random, now = Date.now()) {
  const session = state.session;
  const group = ensureGroup(state, session.settings.group);
  const remaining = availableCards(cards, session.settings, group.seen);
  if (!remaining.length) {
    session.current = null;
    session.exhausted = true;
    return false;
  }
  const chosen =
    remaining[
      Math.min(
        remaining.length - 1,
        Math.floor(Math.max(0, random()) * remaining.length),
      )
    ];
  group.seen[chosen.id] = now;
  session.current = chosen.id;
  session.currentMode = pickMode(chosen, session.settings, random);
  return true;
}

export function startTurn(
  state,
  cards,
  now = Date.now(),
  random = Math.random,
) {
  const session = state.session;
  if (!session || session.phase !== "ready") return;
  session.log = [];
  session.remaining = session.settings.seconds * 1000;
  if (!drawCard(state, cards, random, now)) {
    session.phase = "finished";
    return;
  }
  session.phase = "playing";
  session.deadline = now + session.remaining;
}

export function finishTurn(state, now = Date.now()) {
  const session = state.session;
  if (!session || !["playing", "paused"].includes(session.phase)) return;
  session.turns.push({
    team: teamIndex(session),
    cycle: cycle(session),
    points: roundPoints(session),
    log: structuredClone(session.log),
    endedAt: now,
  });
  session.phase = "summary";
  session.current = null;
  session.deadline = null;
  session.remaining = 0;
}

export function recordResult(
  state,
  cards,
  result,
  now = Date.now(),
  random = Math.random,
) {
  const session = state.session;
  if (!session || session.phase !== "playing") return;
  if (now >= session.deadline) {
    finishTurn(state, now);
    return;
  }
  if (!["correct", "taboo", "skip"].includes(result))
    throw new Error("Ungültige Kartenwertung.");
  const card = cards.find((c) => c.id === session.current);
  if (!card) throw new Error("Karte nicht gefunden.");
  const delta =
    result === "correct"
      ? 1
      : result === "taboo"
        ? -session.settings.tabooPenalty
        : -session.settings.skipPenalty;
  session.log.push({ id: card.id, word: card.word, result, delta });
  session.scores[teamIndex(session)] += delta;
  session.remaining = Math.max(0, session.deadline - now);
  if (!drawCard(state, cards, random, now)) finishTurn(state, now);
}

// Undo repairs scoring only. Both exposed cards stay in the repetition history.
export function undoResult(state) {
  const session = state.session;
  if (
    !session ||
    !["playing", "paused"].includes(session.phase) ||
    !session.log.length
  )
    return;
  const entry = session.log.pop();
  session.scores[teamIndex(session)] -= entry.delta;
  session.current = entry.id;
}

export function pause(state, now = Date.now()) {
  const session = state.session;
  if (session?.phase !== "playing") return;
  if (now >= session.deadline) {
    finishTurn(state, now);
    return;
  }
  session.remaining = session.deadline - now;
  session.deadline = null;
  session.phase = "paused";
}

export function resume(state, now = Date.now()) {
  const session = state.session;
  if (session?.phase !== "paused") return;
  session.phase = "playing";
  session.deadline = now + session.remaining;
}

export function nextTurn(state) {
  const session = state.session;
  if (session?.phase !== "summary") return;
  session.turnIndex++;
  const finished =
    session.exhausted ||
    session.turnIndex >=
      session.settings.teams.length * session.settings.cycles;
  session.phase = finished ? "finished" : "ready";
  session.remaining = session.settings.seconds * 1000;
  session.log = [];
}

export function restoreSession(state, now = Date.now()) {
  if (state.session?.phase === "playing") pause(state, now);
}

export function resetGroup(state, name) {
  const group = ensureGroup(state, name);
  group.seen = {};
  group.resetAt = Date.now();
  if (state.session && groupId(state.session.settings.group) === groupId(name))
    state.session = null;
}

export function exportBackup(state) {
  return {
    app: "wortspiel",
    schema: SCHEMA,
    exportedAt: new Date().toISOString(),
    groups: structuredClone(state.groups),
  };
}

export function importBackup(state, backup) {
  if (
    !backup ||
    backup.app !== "wortspiel" ||
    backup.schema !== SCHEMA ||
    typeof backup.groups !== "object" ||
    !backup.groups ||
    Array.isArray(backup.groups)
  )
    throw new Error("Das ist keine gültige Wortspiel-Sicherung.");
  const entries = Object.entries(backup.groups);
  if (entries.length > 200)
    throw new Error("Die Sicherung enthält zu viele Gruppen.");
  let added = 0;
  for (const [id, group] of entries) {
    if (
      !group ||
      typeof group.name !== "string" ||
      !group.name.trim() ||
      group.name.length > 60 ||
      id !== groupId(group.name) ||
      !group.seen ||
      typeof group.seen !== "object" ||
      Array.isArray(group.seen)
    )
      throw new Error("Die Sicherung enthält ungültige Gruppendaten.");
    const seen = Object.entries(group.seen);
    if (
      seen.length > 50000 ||
      seen.some(
        ([key, time]) =>
          !key.startsWith("de:") ||
          key.length > 300 ||
          !Number.isFinite(time) ||
          time < 0,
      )
    )
      throw new Error("Die Sicherung enthält ungültige Kartendaten.");
    const target = ensureGroup(state, group.name);
    for (const [key, time] of seen) {
      if (!Object.hasOwn(target.seen, key)) added++;
      target.seen[key] = Math.max(target.seen[key] || 0, time);
    }
  }
  return added;
}
