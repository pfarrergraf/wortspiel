export const MODES = [
  { id: "explain", name: "Erklären", description: "Erkläre den Begriff, ohne ihn, seine Wortteile oder die verbotenen Wörter zu sagen." },
  { id: "pantomime", name: "Pantomime", description: "Stelle den Begriff mit Gesten dar. Bleibe stumm und benutze keine Gegenstände." },
  { id: "draw", name: "Zeichnen", description: "Zeichne den Begriff, ohne zu sprechen. Verwende keine Buchstaben oder Zahlen." },
  { id: "oneword", name: "Ein Wort", description: "Gib genau ein Hinweiswort. Der Begriff, seine Wortteile und die verbotenen Wörter sind verboten." },
];

const modeIds = new Set(MODES.map((mode) => mode.id));

export function validateModes(value) {
  // Missing settings in older saves mean the classic explanation mode.
  if (value == null) return;
  if (
    !Array.isArray(value) ||
    value.length === 0 ||
    [...value].some((mode) => !modeIds.has(mode)) ||
    new Set(value).size !== value.length
  )
    throw new Error("Wähle mindestens einen gültigen Spielmodus, jeden nur einmal.");
}

export function pickMode(card, settings, random = Math.random) {
  const selected = Array.isArray(settings?.modes) ? settings.modes : ["explain"];
  const visual = card?.difficulty === "easy" || card?.difficulty === "medium";
  const allowed = [...new Set(selected)].filter(
    (mode) => modeIds.has(mode) && (visual || !["pantomime", "draw"].includes(mode)),
  );
  if (allowed.length === 0) return "explain";
  if (allowed.length === 1) return allowed[0];

  // Keep the existing card-selection random sequence when there is no choice.
  const value = random();
  const index = Number.isFinite(value)
    ? Math.min(allowed.length - 1, Math.floor(Math.max(0, value) * allowed.length))
    : 0;
  return allowed[index];
}

export function migrateModes(state) {
  state.settings.modes ??= ["explain"];
  if (state.session) state.session.settings.modes ??= ["explain"];
}
