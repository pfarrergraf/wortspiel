// Original, curated sound prompts. IDs are explicit in the source file and
// must survive changes to difficulty or category. No microphone is required.
export const NOISES = "noises";
export const NOISE_CATEGORY_PREFIX = "ns-";
const normalizeWord = word => word.normalize("NFKC").toLocaleLowerCase("de").replace(/ß/g, "ss").replace(/[^\p{L}\p{N}]+/gu, " ").trim();
export const noiseId = word => `de:noises:${normalizeWord(word)}`;
export const isNoises = settings => settings?.gameMode === NOISES;
export const isNoiseCard = card => card?.categories?.some(id => id.startsWith(NOISE_CATEGORY_PREFIX)) ?? false;
export const noiseCategories = pool => pool.categories.map(category => ({ ...category, id: `${NOISE_CATEGORY_PREFIX}${category.id}` }));
export const noiseCards = pool => pool.cards.map(card => ({ ...card, categories: [`${NOISE_CATEGORY_PREFIX}${card.category}`], taboo: [], source: "original" }));
export function inNoiseSelection(card, settings) {
  return isNoiseCard(card) && (settings.noisesSelected == null || card.categories.some(id => settings.noisesSelected.includes(id)));
}
export function validateNoiseSelection(settings) {
  const selected = settings.noisesSelected;
  if (selected != null && (!Array.isArray(selected) || selected.some(id => typeof id !== "string" || !id.startsWith(NOISE_CATEGORY_PREFIX)) || new Set(selected).size !== selected.length))
    throw new Error("Ungültige Geräusch-Kategorien.");
  if (isNoises(settings) && Array.isArray(selected) && !selected.length)
    throw new Error("Wähle mindestens eine Geräusch-Kategorie.");
}
export function validateNoisePool(pool) {
  const errors = [];
  if (!pool || !Array.isArray(pool.categories) || !pool.categories.length || !Array.isArray(pool.cards) || !pool.cards.length) return ["Ungültiger Geräuschpool."];
  const categories = new Set();
  for (const category of pool.categories) {
    if (!category || typeof category.id !== "string" || !/^[a-z-]+$/.test(category.id) || categories.has(category.id) || ["name", "emoji", "color"].some(key => typeof category[key] !== "string" || !category[key].trim())) errors.push("Ungültige oder doppelte Geräusch-Kategorie.");
    else categories.add(category.id);
  }
  const ids = new Set();
  for (const card of pool.cards) {
    if (!card || typeof card.word !== "string" || !card.word.trim() || card.word.length > 80 || card.id !== noiseId(card.word) || ids.has(card.id) || !categories.has(card.category) || !["easy", "medium", "hard"].includes(card.difficulty) || typeof card.emoji !== "string" || !card.emoji.trim()) errors.push(`Ungültige oder doppelte Geräuschkarte: ${card?.word ?? "?"}`);
    else ids.add(card.id);
  }
  return errors;
}
