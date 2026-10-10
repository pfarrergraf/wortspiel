export const TABOO_MODES = Object.freeze([
  Object.freeze({
    id: "classic",
    name: "Alle Wörter",
    description: "Alle angezeigten Wörter auf der Karte sind verboten.",
  }),
  Object.freeze({
    id: "light",
    name: "Drei Wörter",
    description: "Nur die ersten drei angezeigten Wörter auf der Karte sind verboten.",
  }),
  Object.freeze({
    id: "none",
    name: "Keine zusätzlichen Wörter",
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
  if (settings?.gameMode === "noises") return "Regelverstoß";
  if (settings?.gameMode === "pantomime") return "Gesprochen";
  return settings?.gameMode === "free" || settings?.tabooMode === "none" ? "Wort gesagt" : "Verbotenes Wort";
}

export function validateTabooMode(value) {
  if (!TABOO_MODES.some((mode) => mode.id === (value ?? "classic")))
    throw new Error("Wähle eine gültige Regel für verbotene Wörter.");
}

// Add missing settings without changing a saved game's mode or card history.
export function migrateTabooMode(state) {
  state.settings.tabooMode ??= "classic";
  if (state.session) state.session.settings.tabooMode ??= "classic";
}
