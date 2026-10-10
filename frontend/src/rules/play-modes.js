import { isNoiseCard } from "./noises.js";

export const MIXED = "mixed";
export const isMixed = settings => settings?.gameMode === MIXED;
export const PRESENTATIONS = [
  { id: "taboo", name: "Tabu", symbol: "💬", instruction: "Mit Worten erklären. Begriff, Wortteile und Tabuwörter sind verboten." },
  { id: "free", name: "Frei erklären", symbol: "🗣️", instruction: "Mit Worten erklären. Nur der Begriff und seine Wortteile sind verboten." },
  { id: "pantomime", name: "Pantomime", symbol: "🎭", instruction: "Mit Gesten vorspielen. Ohne Worte, Geräusche oder Gegenstände." },
  { id: "noises", name: "Geräusche", symbol: "🔊", instruction: "Nur Geräusche mit Stimme, Mund oder Händen. Keine Wörter, Gesten oder Gegenstände." },
];
export const wordKey = word => word.normalize("NFKC").toLocaleLowerCase("de").replace(/ß/g, "ss").replace(/[^\p{L}\p{N}]+/gu, " ").trim();
const mimeCard = card => card.categories?.some(id => id.startsWith("pm-"));

// Concrete pantomime/sound capabilities come ONLY from the curated pools.
// Difficulty or age never implies that an abstract word has a sound.
export function withMixedModes(cards) {
  const mimeWords = new Set(cards.filter(card => card.retired !== true && mimeCard(card)).map(card => wordKey(card.word)));
  const noiseWords = new Set(cards.filter(card => card.retired !== true && isNoiseCard(card)).map(card => wordKey(card.word)));
  const mimeLevels = new Map(cards.filter(card => card.retired !== true && mimeCard(card)).map(card => [wordKey(card.word), card.difficulty]));
  const noiseLevels = new Map(cards.filter(card => card.retired !== true && isNoiseCard(card)).map(card => [wordKey(card.word), card.difficulty]));
  return cards.map(card => {
    const modes = card.taboo?.length >= 3 ? ["taboo", "free"] : ["free"];
    const word = wordKey(card.word);
    if (mimeWords.has(word) || noiseWords.has(word)) modes.push("pantomime");
    if (noiseWords.has(word)) modes.push("noises");
    return { ...card, mixedModes: modes, mixedLevels: { taboo: card.difficulty, free: card.difficulty, pantomime: mimeLevels.get(word) ?? noiseLevels.get(word), noises: noiseLevels.get(word) } };
  });
}
export function cardModes(card, settings) {
  const modes = card.mixedModes ?? (isNoiseCard(card) ? ["free", "pantomime", "noises"] : mimeCard(card) ? ["free", "pantomime"] : card.taboo?.length >= 3 ? ["taboo", "free"] : ["free"]);
  const difficulty = settings?.difficulty ?? "all";
  return modes.filter(mode => {
    const level = card.mixedLevels?.[mode] ?? card.difficulty;
    return difficulty === "all" || level === "easy" || difficulty === "medium" && level === "medium";
  });
}
// A mixed deck combines namespaces. Show each word once, and honor an exposed
// representation from any pool, without rewriting another pool's history.
export function uniqueMixedCards(eligible, allCards, seen = {}) {
  const words = new Set(allCards.filter(card => Object.hasOwn(seen, card.id)).map(card => wordKey(card.word)));
  return eligible.filter(card => {
    const word = wordKey(card.word);
    if (words.has(word)) return false;
    words.add(word);
    return true;
  });
}
const randomItem = (items, random) => {
  const value = random();
  return items[Number.isFinite(value) ? Math.min(items.length - 1, Math.floor(Math.max(0, value) * items.length)) : 0];
};
export function pickMixedCard(cards, random = Math.random, settings) {
  if (!cards.length) return null;
  const modes = PRESENTATIONS.map(mode => ({ mode: mode.id, cards: cards.filter(card => cardModes(card, settings).includes(mode.id)) })).filter(option => option.cards.length);
  if (!modes.length) return null;
  const selected = randomItem(modes, random);
  return { mode: selected.mode, card: randomItem(selected.cards, random) };
}
export function presentationMode(session) {
  if (isMixed(session.settings)) return session.currentMode ?? "taboo";
  if ((session.settings.gameMode ?? "taboo") === "taboo" && session.settings.tabooMode === "none") return "free";
  return session.settings.gameMode ?? "taboo";
}
export function presentationSettings(session, mode = presentationMode(session)) {
  return { ...session.settings, gameMode: mode, tabooMode: mode === "free" || mode === "noises" || mode === "pantomime" ? "none" : isMixed(session.settings) && session.settings.tabooMode === "none" ? "classic" : session.settings.tabooMode };
}
