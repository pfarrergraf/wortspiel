// Shared rules for card packs (frontend/data/packs/*.json). Used by
// import-cards.mjs (build the dataset) and check-cards.mjs (validate packs).
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

export const COLORS = ["mint", "blue", "yellow", "purple", "coral", "pink"];
export const DIFFICULTIES = ["easy", "medium", "hard"];
export const AGES = [6, 8, 10, 12, 14, 16];
const ID = /^[a-z][a-z0-9-]{1,30}$/;

export const normalize = (word) =>
  word
    .normalize("NFKC")
    .toLocaleLowerCase("de")
    .replace(/ß/g, "ss")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
export const cardId = (word) => `de:${normalize(word)}`;

export async function readPacks(dir) {
  let files = [];
  try {
    files = (await readdir(dir)).filter((f) => f.endsWith(".json")).sort();
  } catch {
    return [];
  }
  return Promise.all(
    files.map(async (file) => ({
      file,
      pack: JSON.parse(await readFile(path.join(dir, file), "utf8")),
    })),
  );
}

export async function readBlocklist(file) {
  try {
    return (await readFile(file, "utf8"))
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#"))
      .map(normalize);
  } catch {
    return [];
  }
}

// Validates one pack. `knownCategories` are category ids that already exist
// (upstream dataset or other packs). Returns a list of human readable errors.
export function validatePack(file, pack, knownCategories, blocklist = []) {
  const errors = [];
  const fail = (message) => errors.push(`${file}: ${message}`);
  const category = pack?.category;
  if (!category || !ID.test(category.id ?? "")) {
    fail('"category.id" fehlt oder ist ungültig (a-z, 0-9, -).');
    return errors;
  }
  const isNew = !knownCategories.has(category.id);
  if (isNew) {
    if (typeof category.name !== "string" || !category.name.trim())
      fail(`Neue Kategorie "${category.id}" braucht einen "name".`);
    if (typeof category.emoji !== "string" || !category.emoji)
      fail(`Neue Kategorie "${category.id}" braucht ein "emoji".`);
    if (!COLORS.includes(category.color))
      fail(`"color" muss eine von ${COLORS.join(", ")} sein.`);
  }
  if (!Array.isArray(pack.cards) || !pack.cards.length) {
    fail('"cards" muss eine nicht leere Liste sein.');
    return errors;
  }
  const seen = new Set();
  for (const [index, card] of pack.cards.entries()) {
    const where = `Karte ${index + 1} (${card?.word ?? "?"})`;
    if (typeof card?.word !== "string" || !card.word.trim()) {
      fail(`${where}: "word" fehlt.`);
      continue;
    }
    const id = cardId(card.word);
    if (seen.has(id)) fail(`${where}: doppelt in diesem Paket.`);
    seen.add(id);
    if (card.word.length > 40) fail(`${where}: Begriff ist zu lang.`);
    const taboo = card.taboo;
    if (
      !Array.isArray(taboo) ||
      taboo.length < 5 ||
      taboo.length > 6 ||
      taboo.some((t) => typeof t !== "string" || !t.trim())
    )
      fail(`${where}: braucht 5 bis 6 Tabuwörter.`);
    else {
      const word = normalize(card.word);
      const unique = new Set(taboo.map(normalize));
      if (unique.size !== taboo.length)
        fail(`${where}: doppelte Tabuwörter.`);
      for (const t of unique)
        if (t === word || (t.length >= 4 && word.includes(t)) || (word.length >= 4 && t.includes(word)))
          fail(`${where}: Tabuwort "${t}" steckt im Begriff oder umgekehrt.`);
    }
    if (!DIFFICULTIES.includes(card.difficulty))
      fail(`${where}: "difficulty" muss ${DIFFICULTIES.join(" | ")} sein.`);
    if (!AGES.includes(card.ageMin))
      fail(`${where}: "ageMin" muss ${AGES.join(" | ")} sein.`);
    if (card.emoji !== undefined && (typeof card.emoji !== "string" || card.emoji.length > 16))
      fail(`${where}: "emoji" ist ungültig.`);
    for (const flag of ["topical", "retired"])
      if (card[flag] !== undefined && typeof card[flag] !== "boolean")
        fail(`${where}: "${flag}" muss true oder false sein.`);
    const text = [card.word, ...(Array.isArray(taboo) ? taboo : [])]
      .map((t) => ` ${normalize(String(t))} `)
      .join(" ");
    for (const blocked of blocklist)
      if (text.includes(` ${blocked} `))
        fail(`${where}: enthält gesperrtes Wort "${blocked}".`);
  }
  return errors;
}
