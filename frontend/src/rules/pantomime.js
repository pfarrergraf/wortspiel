import { normalize } from "../engine.js";

// Pantomime word pool: easy-to-mime words in their own categories, separate
// from the taboo cards. Ids use their own "de:pantomime:" namespace so their
// history never blocks a taboo card with the same word. Ids depend only on
// the word, so moving a word to another category or changing its points
// keeps its history. Never rename a word once it has shipped.
export const PANTOMIME = "pantomime";
export const FREE = "free";
export const CATEGORY_PREFIX = "pm-";

export const GAME_MODES = [
  { id: "taboo", name: "Tabu – Begriffe erklären", description: "Die Themenpakete mit Tabuwörtern. Erklären, ohne die verbotenen Wörter zu sagen." },
  { id: FREE, name: "Frei erklären", description: "Erklärt mit eigenen Worten, ohne zusätzliche Tabuwörter. Der Begriff selbst und seine Wortbestandteile bleiben verboten." },
  { id: PANTOMIME, name: "Pantomime – Vorspielen", description: "Wörter zum Vorspielen, ohne Worte, Geräusche oder Gegenstände. Schwere Begriffe bringen bis zu 3 Punkte." },
];

// Points decide the difficulty level, so the existing level filter still works.
export const POINT_LEVELS = { 1: "easy", 2: "medium", 3: "hard" };

export const pantomimeId = (word) => `de:${PANTOMIME}:${normalize(word)}`;

export function pantomimeCategories(pool) {
  return pool.categories.map(({ id, name, emoji, color }) => ({
    id: `${CATEGORY_PREFIX}${id}`,
    name,
    emoji,
    color,
  }));
}

export function pantomimeCards(pool) {
  return Object.entries(pool.words).flatMap(([category, entries]) =>
    entries.map(([word, emoji, points]) => ({
      id: pantomimeId(word),
      word,
      taboo: [],
      categories: [`${CATEGORY_PREFIX}${category}`],
      source: "original",
      difficulty: POINT_LEVELS[points],
      points,
      ageMin: 6,
      emoji,
    })),
  );
}

export const isPantomime = (settings) => settings?.gameMode === PANTOMIME;
export const isPantomimeCard = (card) =>
  card?.categories.some((id) => id.startsWith(CATEGORY_PREFIX)) ?? false;

// Selected pantomime categories; null (older saves) means all of them.
export function inPantomimeSelection(card, settings) {
  const selected = settings.pantomimeSelected;
  return selected == null
    ? isPantomimeCard(card)
    : card.categories.some((id) => selected.includes(id));
}

// Points for a guessed card: the card's scale in pantomime, otherwise 1.
export const cardPoints = (card, settings) =>
  isPantomime(settings) && Number.isInteger(card?.points) ? card.points : 1;

export function validateGameMode(settings) {
  // Missing settings in older saves mean the taboo game.
  const mode = settings.gameMode;
  if (mode != null && !GAME_MODES.some((m) => m.id === mode))
    throw new Error("Wähle einen gültigen Spielmodus.");
  if (mode === FREE && settings.tabooMode !== "none")
    throw new Error("Frei erklären verwendet keine zusätzlichen Tabuwörter.");
  const selected = settings.pantomimeSelected;
  if (
    selected != null &&
    (!Array.isArray(selected) ||
      selected.some((id) => typeof id !== "string" || !id.startsWith(CATEGORY_PREFIX)))
  )
    throw new Error("Ungültige Pantomime-Kategorien.");
  if (mode === PANTOMIME && Array.isArray(selected) && !selected.length)
    throw new Error("Wähle mindestens eine Pantomime-Kategorie.");
}

// Only future-game setup is reconciled here. Never rewrite a saved session.
export function configureGameMode(settings, previous, changedField) {
  const next = { ...settings };
  const changed = next.gameMode !== (previous.gameMode ?? "taboo");
  if (changed && next.gameMode === PANTOMIME) next.difficulty = "all";
  if (next.gameMode === PANTOMIME) return next;
  if (changedField === "tabooMode")
    next.gameMode = next.tabooMode === "none" ? FREE : "taboo";
  else if (changed && next.gameMode === "taboo") next.tabooMode = "classic";
  if (next.gameMode === FREE) next.tabooMode = "none";
  else if (next.tabooMode === "none") next.gameMode = FREE;
  return next;
}

export function migrateGameMode(state) {
  state.settings.gameMode ??= "taboo";
  state.settings.pantomimeSelected ??= null;
  if (state.session) {
    state.session.settings.gameMode ??= "taboo";
    state.session.settings.pantomimeSelected ??= null;
  }
}
