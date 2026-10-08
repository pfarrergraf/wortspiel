import { categories } from "../data.js";
import { visibleTaboo } from "../rules/taboo.js";
import { escape } from "./html.js";

// The visible game card. Taboo level (B2/E4), mode badges (E5) and kid emoji
// (E6) plug in here.
export function renderCard(card, session) {
  const category = categories.find(
    (c) =>
      card?.categories.includes(c.id) &&
      session.settings.selected.includes(c.id),
  );
  const taboo = card ? visibleTaboo(card, session.settings) : [];
  return `<article class="game-card" aria-label="Aktuelle Spielkarte"><div class="card-category"><span>${category?.emoji || "✨"} ${escape(category?.name || "Wortspiel")}</span><span>ERKLÄR MAL …</span></div><h1 id="current-word">${escape(card?.word || "")}</h1><div class="forbidden-label"><span></span>DIESE WÖRTER SIND TABU<span></span></div><ul class="forbidden-words">${taboo.map((word) => `<li>${escape(word)}</li>`).join("")}</ul><span class="card-detail">Wortbestandteile und Übersetzungen sind ebenfalls tabu.</span></article>`;
}
