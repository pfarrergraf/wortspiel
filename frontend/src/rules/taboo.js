export const TABOO_MODES = Object.freeze([
  Object.freeze({
    id: "classic",
    name: "Klassisch",
    description: "Alle Tabuwörter auf der Karte sind verboten.",
  }),
  Object.freeze({
    id: "light",
    name: "Leicht – 3 Tabuwörter",
    description: "Nur die ersten drei Tabuwörter auf der Karte sind verboten.",
  }),
  Object.freeze({
    id: "none",
    name: "Frei erklären – ohne Tabuwörter",
    description: "Nur der Begriff selbst und seine Wortbestandteile sind verboten.",
  }),
]);

// Return a separate array so views cannot change the source card's taboo words.
export function visibleTaboo(card, settings) {
  const mode = settings?.gameMode === "free" ? "none" : settings?.tabooMode ?? "classic";
  if (mode === "none") return [];
  return mode === "light" ? card.taboo.slice(0, 3) : card.taboo.slice();
}

// Scoring still uses the internal result "taboo" in every mode.
export function tabooLabel(settings) {
  if (settings?.gameMode === "pantomime") return "Gesprochen";
  return settings?.gameMode === "free" || settings?.tabooMode === "none" ? "Wort gesagt" : "Tabuwort";
}

export function validateTabooMode(value) {
  if (!TABOO_MODES.some((mode) => mode.id === (value ?? "classic")))
    throw new Error("Wähle eine gültige Tabu-Stufe.");
}

// Add missing settings without changing a saved game's mode or card history.
export function migrateTabooMode(state) {
  state.settings.tabooMode ??= "classic";
  if (state.session) state.session.settings.tabooMode ??= "classic";
}
