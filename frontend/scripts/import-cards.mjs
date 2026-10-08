import { readFile, writeFile, mkdir, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { readPacks, validatePack, readBlocklist, normalize } from "./cards-lib.mjs";

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const dataRoot = path.join(root, ".sources/Taboo-Data/src/data");
const categoryInfo = JSON.parse(
  await readFile(path.join(dataRoot, "categories.json"), "utf8"),
).de;
const visual = {
  animals: ["🐾", "mint"],
  cars: ["🚗", "blue"],
  "city-country": ["🌍", "blue"],
  food: ["🍋", "yellow"],
  literature: ["📚", "purple"],
  people: ["🌟", "yellow"],
  sports: ["⚽", "mint"],
  things: ["💡", "yellow"],
  tv: ["🎬", "coral"],
  web: ["💻", "purple"],
};
const cards = new Map();
const categories = [];
function add(word, taboo, category, source) {
  word = word.trim();
  const id = `de:${normalize(word)}`;
  const cleaned = [
    ...new Set(
      taboo
        .filter((x) => typeof x === "string")
        .map((x) => x.trim())
        .filter(Boolean),
    ),
  ];
  if (!word || cleaned.length < 3) return;
  if (cards.has(id)) {
    const existing = cards.get(id);
    if (!existing.categories.includes(category))
      existing.categories.push(category);
    return;
  }
  cards.set(id, { id, word, taboo: cleaned, categories: [category], source });
}
for (const file of (await readdir(path.join(dataRoot, "de")))
  .filter((f) => f.endsWith(".json"))
  .sort()) {
  const category = file.slice(0, -5);
  const [emoji, color] = visual[category];
  categories.push({
    id: category,
    name: categoryInfo[category].text,
    emoji,
    color,
  });
  const data = JSON.parse(
    await readFile(path.join(dataRoot, "de", file), "utf8"),
  );
  for (const [word, taboo] of Object.entries(data))
    add(word, taboo, category, "kovah");
}
categories.push({
  id: "everyday",
  name: "Alltag & Jugend",
  emoji: "✨",
  color: "coral",
});
categories.push({
  id: "faith",
  name: "Glaube & Kirche",
  emoji: "🕊️",
  color: "purple",
});
const custom = JSON.parse(
  await readFile(path.join(root, "tabu_cards.json"), "utf8"),
);
const faith = new Set([
  "Weihnachten",
  "Taufe",
  "Gebet",
  "Kirche",
  "Bibel",
  "Ostern",
  "Pfingsten",
]);
for (const card of custom)
  add(
    card.word,
    card.taboo,
    faith.has(card.word) ? "faith" : "everyday",
    "local",
  );
const extraFaith = [
  ["Advent", "Weihnachten", "Kerze", "Warten", "Kranz", "Dezember"],
  ["Abendmahl", "Brot", "Wein", "Jesus", "Kelch", "Gottesdienst"],
  ["Konfirmation", "Jugendliche", "Segen", "Taufe", "Glaube", "Kirche"],
  ["Reformation", "Luther", "Thesen", "Protestant", "1517", "Wittenberg"],
  ["Nächstenliebe", "Helfen", "Mitmensch", "Liebe", "Jesus", "Gebot"],
  ["Psalm", "Bibel", "Lied", "David", "Gebet", "Testament"],
  ["Arche Noah", "Schiff", "Tiere", "Flut", "Regenbogen", "Bibel"],
  ["Moses", "Gebote", "Ägypten", "Meer", "Wüste", "Bibel"],
  ["David", "Goliath", "König", "Schleuder", "Psalm", "Israel"],
  ["Maria", "Jesus", "Mutter", "Engel", "Weihnachten", "Josef"],
  ["Josef", "Maria", "Jesus", "Zimmermann", "Bethlehem", "Vater"],
  ["Bethlehem", "Jesus", "Geburt", "Stall", "Weihnachten", "Stadt"],
  ["Engel", "Flügel", "Himmel", "Bote", "Gott", "Schutz"],
  ["Jünger", "Jesus", "Zwölf", "Petrus", "Folgen", "Schüler"],
  ["Petrus", "Jünger", "Fischer", "Hahn", "Jesus", "Fels"],
  ["Paulus", "Brief", "Apostel", "Saulus", "Bekehrung", "Mission"],
  [
    "Barmherziger Samariter",
    "Helfen",
    "Verletzt",
    "Straße",
    "Gleichnis",
    "Nächstenliebe",
  ],
  ["Verlorener Sohn", "Vater", "Erbe", "Heimkehr", "Gleichnis", "Vergebung"],
  ["Schöpfung", "Gott", "Welt", "Sieben", "Genesis", "Anfang"],
  ["Segen", "Gott", "Schutz", "Hand", "Gutes", "Pfarrer"],
  ["Vergebung", "Schuld", "Entschuldigung", "Fehler", "Versöhnung", "Sünde"],
  ["Hoffnung", "Zukunft", "Vertrauen", "Wunsch", "Zuversicht", "Erwarten"],
  ["Frieden", "Krieg", "Taube", "Streit", "Versöhnung", "Ruhe"],
  ["Diakonie", "Helfen", "Sozial", "Kirche", "Pflege", "Dienst"],
  ["Kirchenchor", "Singen", "Musik", "Gottesdienst", "Stimme", "Lied"],
  ["Orgel", "Kirche", "Musik", "Pfeifen", "Tasten", "Instrument"],
  ["Altar", "Kirche", "Tisch", "Kerzen", "Abendmahl", "Vorne"],
  ["Kanzel", "Predigt", "Kirche", "Pfarrer", "Sprechen", "Hoch"],
  ["Predigt", "Pfarrer", "Sprechen", "Bibel", "Kanzel", "Gottesdienst"],
  ["Gottesdienst", "Kirche", "Sonntag", "Predigt", "Gebet", "Singen"],
  ["Kirchenglocke", "Turm", "Läuten", "Kirche", "Klang", "Bronze"],
  ["Taufbecken", "Wasser", "Taufe", "Kirche", "Kind", "Schale"],
  ["Vaterunser", "Gebet", "Himmel", "Brot", "Jesus", "Amen"],
  ["Glaubensbekenntnis", "Glaube", "Gott", "Jesus", "Sprechen", "Kirche"],
  ["Evangelium", "Gute Nachricht", "Jesus", "Bibel", "Matthäus", "Markus"],
  ["Gleichnis", "Geschichte", "Jesus", "Vergleich", "Bibel", "Erklären"],
  ["Erntedank", "Herbst", "Früchte", "Gott", "Dank", "Fest"],
  ["Karfreitag", "Kreuz", "Jesus", "Tod", "Ostern", "Freitag"],
  ["Auferstehung", "Ostern", "Jesus", "Tod", "Leben", "Grab"],
  ["Himmelfahrt", "Jesus", "Himmel", "Wolke", "Vatertag", "Donnerstag"],
  ["Krippenspiel", "Weihnachten", "Theater", "Jesus", "Stall", "Kinder"],
  ["Sternsinger", "Könige", "Stern", "Segen", "Spenden", "Januar"],
  ["Pilgern", "Wandern", "Glaube", "Jakobsweg", "Reise", "Weg"],
  ["Kloster", "Mönch", "Nonne", "Gebet", "Gemeinschaft", "Abgeschieden"],
  ["Kirchenjahr", "Advent", "Ostern", "Feste", "Kalender", "Pfingsten"],
  [
    "Konfi-Freizeit",
    "Jugendliche",
    "Reise",
    "Gruppe",
    "Kirche",
    "Übernachtung",
  ],
  ["Kollekte", "Geld", "Spenden", "Gottesdienst", "Korb", "Sammeln"],
  ["Ehrenamt", "Freiwillig", "Helfen", "Unbezahlt", "Engagement", "Zeit"],
];
for (const [word, ...taboo] of extraFaith)
  add(word, taboo, "faith", "original");
const supplements = JSON.parse(
  await readFile(path.join(root, "frontend/data/supplements.json"), "utf8"),
);
for (const [category, entries] of Object.entries(supplements)) {
  for (const [word, ...taboo] of entries)
    add(word, taboo, category, "original");
}
const easyCards = JSON.parse(
  await readFile(path.join(root, "frontend/data/easy-cards.json"), "utf8"),
);
for (const [category, entries] of Object.entries(easyCards))
  for (const [word, ...taboo] of entries) add(word, taboo, category, "original");
// Explicit, reviewed allowlists: new upstream cards stay in the hardest pool.
const difficultyLists = JSON.parse(
  await readFile(path.join(root, "frontend/data/difficulty.json"), "utf8"),
);
for (const card of cards.values()) card.difficulty = "hard";
const reviewed = new Set();
for (const [difficulty, lists] of Object.entries(difficultyLists)) {
  if (!["easy", "medium"].includes(difficulty))
    throw new Error(`Unknown difficulty: ${difficulty}`);
  for (const [category, words] of Object.entries(lists)) {
    for (const word of words.split(" | ")) {
      const id = `de:${normalize(word)}`;
      const card = cards.get(id);
      if (!card || !card.categories.includes(category) || reviewed.has(id))
        throw new Error(`Invalid or duplicate difficulty entry: ${word}`);
      reviewed.add(id);
      card.difficulty = difficulty;
    }
  }
}
for (const entries of Object.values(easyCards))
  for (const [word] of entries) {
    const id = `de:${normalize(word)}`;
    if (reviewed.has(id))
      throw new Error(`Duplicate easy card: ${word}`);
    reviewed.add(id);
    cards.get(id).difficulty = "easy";
  }
// v2 card packs (docs/plan-v2.md). A word that already exists only gains the
// pack category; its id, taboo words and difficulty stay unchanged.
const packs = await readPacks(path.join(root, "frontend/data/packs"));
const blocklist = await readBlocklist(path.join(root, "frontend/data/blocklist.txt"));
const packErrors = [];
for (const { file, pack } of packs) {
  const known = new Set(categories.map((c) => c.id));
  packErrors.push(...validatePack(file, pack, known, blocklist));
  if (!known.has(pack.category?.id)) {
    const { id, name, emoji, color } = pack.category;
    categories.push({ id, name, emoji, color });
  }
  for (const card of pack.cards) {
    const id = `de:${normalize(card.word)}`;
    const existing = cards.get(id);
    if (existing) {
      if (!existing.categories.includes(pack.category.id))
        existing.categories.push(pack.category.id);
      continue;
    }
    cards.set(id, {
      id,
      word: card.word.trim(),
      taboo: card.taboo.map((t) => t.trim()),
      categories: [pack.category.id],
      source: "original",
      difficulty: card.difficulty,
      ageMin: card.ageMin,
      ...(card.emoji ? { emoji: card.emoji } : {}),
      ...(card.topical ? { topical: true } : {}),
      ...(card.retired ? { retired: true } : {}),
    });
  }
}
if (packErrors.length)
  throw new Error(`Ungültige Kartenpakete:\n${packErrors.join("\n")}`);
// Optional reviewed age tags for existing cards: { "8": "Hund | Katze", ... }.
let ageTags = {};
try {
  ageTags = JSON.parse(
    await readFile(path.join(root, "frontend/data/age-tags.json"), "utf8"),
  );
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}
for (const [age, words] of Object.entries(ageTags))
  for (const word of words.split(" | ")) {
    const card = cards.get(`de:${normalize(word)}`);
    if (!card || card.ageMin !== undefined)
      throw new Error(`Invalid or duplicate age tag: ${word}`);
    card.ageMin = Number(age);
  }
await mkdir(path.join(root, "frontend/src/data"), { recursive: true });
const output = {
  version: 1,
  sourceCommit: "02001345db07d7f440103c35ad9ef1ccf83f8065",
  categories,
  cards: [...cards.values()],
};
await writeFile(
  path.join(root, "frontend/src/data/cards.json"),
  JSON.stringify(output),
);
console.log(`${cards.size} eindeutige Karten, ${categories.length} Kategorien`);
for (const category of categories)
  console.log(
    `${category.name}: ${output.cards.filter((c) => c.categories.includes(category.id)).length}`,
  );
