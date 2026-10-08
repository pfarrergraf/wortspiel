export const AGE_GROUPS = [
  { id: 6, name: "Kinder ab 6" },
  { id: 8, name: "Kinder ab 8" },
  { id: 10, name: "Ab 10 Jahren" },
  { id: 12, name: "Ab 12 Jahren" },
  { id: 14, name: "Ab 14 Jahren" },
  { id: null, name: "Alle" },
];

export function matchesAudience(card, settings) {
  if (card.retired === true) return false;
  return settings.ageGroup == null || (card.ageMin ?? 14) <= settings.ageGroup;
}

export function validateAgeGroup(value) {
  // Missing settings remain compatible with saved games from v1.
  if (value === undefined || AGE_GROUPS.some((group) => group.id === value))
    return;
  throw new Error("Wähle eine gültige Altersgruppe (6, 8, 10, 12, 14 oder Alle).");
}

export function migrateAudience(state) {
  state.settings.ageGroup ??= null;
  if (state.session) state.session.settings.ageGroup ??= null;
}
