// Validates v2 card packs without needing the upstream sources.
// Usage: npm run cards:check            (all packs)
//        npm run cards:check -- gaming  (only data/packs/gaming.json)
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import {
  AGES,
  DIFFICULTIES,
  cardId,
  readBlocklist,
  readPacks,
  validatePack,
} from "./cards-lib.mjs";

const frontend = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataset = JSON.parse(
  await readFile(path.join(frontend, "src/data/cards.json"), "utf8"),
);
const existing = new Map(dataset.cards.map((card) => [card.id, card]));
const blocklist = await readBlocklist(path.join(frontend, "data/blocklist.txt"));
const only = process.argv.slice(2).map((name) => name.replace(/\.json$/, ""));
const packs = await readPacks(path.join(frontend, "data/packs"));

const known = new Set(dataset.categories.map((c) => c.id));
for (const { pack } of packs) if (pack?.category?.id) known.add(pack.category.id);
// A pack that defines a category must not count it as already known.
const definedBy = new Map();
for (const { file, pack } of packs)
  if (pack?.category?.name) {
    if (definedBy.has(pack.category.id))
      console.error(`FEHLER ${file}: Kategorie "${pack.category.id}" ist schon in ${definedBy.get(pack.category.id)} definiert.`);
    definedBy.set(pack.category.id, file);
  }

const owner = new Map();
let errors = 0;
for (const { file, pack } of packs) {
  const name = file.replace(/\.json$/, "");
  const selfKnown = new Set(known);
  if (definedBy.get(pack?.category?.id) === file && !dataset.categories.some((c) => c.id === pack.category.id))
    selfKnown.delete(pack.category.id);
  const problems = validatePack(file, pack, selfKnown, blocklist);
  const extensions = [];
  const crossDuplicates = [];
  for (const card of pack?.cards || []) {
    if (typeof card?.word !== "string") continue;
    const id = cardId(card.word);
    if (existing.has(id)) extensions.push(card.word);
    else if (owner.has(id)) crossDuplicates.push(`${card.word} (auch in ${owner.get(id)})`);
    else owner.set(id, file);
  }
  if (only.length && !only.includes(name)) continue;
  errors += problems.length;
  console.log(`\n${file}: ${pack?.cards?.length ?? 0} Karten, Kategorie ${pack?.category?.id}`);
  for (const problem of problems) console.log(`  FEHLER ${problem}`);
  if (crossDuplicates.length)
    console.log(`  HINWEIS doppelt mit anderem Paket (nur Kategorie-Ergänzung): ${crossDuplicates.join(", ")}`);
  if (extensions.length)
    console.log(`  HINWEIS schon im Bestand (nur Kategorie-Ergänzung, Tabuwörter bleiben alt): ${extensions.join(", ")}`);
  const count = (key, values) =>
    values
      .map((v) => `${v}: ${(pack?.cards || []).filter((c) => c[key] === v).length}`)
      .join(", ");
  console.log(`  Schwierigkeit – ${count("difficulty", DIFFICULTIES)}`);
  console.log(`  Alter ab – ${count("ageMin", AGES)}`);
}
if (!packs.length) console.log("Keine Pakete in data/packs/.");
console.log(errors ? `\n${errors} Fehler.` : "\nKeine Fehler.");
process.exitCode = errors ? 1 : 0;
