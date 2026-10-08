// B2: taboo level (settings.tabooMode: "classic" | "light" | "none").
// Stub until B2 lands: always show every taboo word.
export function visibleTaboo(card, settings) {
  return card.taboo;
}
