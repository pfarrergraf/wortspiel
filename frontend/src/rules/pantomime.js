import { normalize } from "../engine.js";

// Pantomime word pool: 500 easy-to-mime words, separate from the taboo cards.
// Ids use their own "de:pantomime:" namespace so their history never blocks
// a taboo card with the same word. Never rename an id once it has shipped.
export const PANTOMIME = "pantomime";

export const GAME_MODES = [
  { id: "taboo", name: "Tabu – Begriffe erklären", description: "Die Themenpakete mit Tabuwörtern. Erklären, ohne die verbotenen Wörter zu sagen." },
  { id: PANTOMIME, name: "Pantomime – Grundwortschatz", description: "500 Wörter zum Vorspielen: Dinge, die man sehen, und Dinge, die man tun kann. Ohne Worte, ohne Geräusche, ohne Gegenstände." },
];

export const pantomimeId = (word) => `de:${PANTOMIME}:${normalize(word)}`;

export function pantomimeCards(pool) {
  return Object.entries(pool).flatMap(([difficulty, entries]) =>
    entries.map(([word, emoji]) => ({
      id: pantomimeId(word),
      word,
      taboo: [],
      categories: [PANTOMIME],
      source: "original",
      difficulty,
      ageMin: 6,
      emoji,
    })),
  );
}

export const isPantomime = (settings) => settings?.gameMode === PANTOMIME;

export function validateGameMode(value) {
  // Missing settings in older saves mean the taboo game.
  if (value == null || GAME_MODES.some((mode) => mode.id === value)) return;
  throw new Error("Wähle einen gültigen Spielmodus.");
}

export function migrateGameMode(state) {
  state.settings.gameMode ??= "taboo";
  if (state.session) state.session.settings.gameMode ??= "taboo";
}
