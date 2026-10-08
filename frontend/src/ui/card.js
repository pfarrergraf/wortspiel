import { categories } from "../data.js";
import { visibleTaboo } from "../rules/taboo.js";
import { escape } from "./html.js";
import { cardPoints, isPantomime } from "../rules/pantomime.js";
import { pantomimeCategories } from "../data.js";

// The visible game card. Taboo level (B2/E4), mode badges (E5) and kid emoji
// (E6) plug in here.
export function renderCard(card, session) {
  if (isPantomime(session.settings)) {
    const group = pantomimeCategories.find((c) => card?.categories.includes(c.id));
    const points = cardPoints(card, session.settings);
    return `<article class="game-card pantomime-card" aria-label="Aktuelle Spielkarte"><div class="card-category"><span>${group?.emoji || "🎭"} ${escape(group?.name || "Pantomime")}</span><span>SPIEL MAL VOR …</span></div><span class="card-points points-${points}" aria-label="${points} ${points === 1 ? "Punkt" : "Punkte"}">${"★".repeat(points)} ${points} ${points === 1 ? "Punkt" : "Punkte"}</span><span class="pantomime-emoji" aria-hidden="true">${escape(card?.emoji || "🎭")}</span><h1 id="current-word">${escape(card?.word || "")}</h1><p class="free-explain">Ohne Worte, ohne Geräusche, ohne Gegenstände. Zeigen und Gesten sind erlaubt.</p></article>`;
  }
  const category = categories.find(
    (c) =>
      card?.categories.includes(c.id) &&
      session.settings.selected.includes(c.id),
  );
  const taboo = card ? visibleTaboo(card, session.settings) : [];
  return `<article class="game-card" aria-label="Aktuelle Spielkarte"><div class="card-category"><span>${category?.emoji || "✨"} ${escape(category?.name || "Wortspiel")}</span><span>ERKLÄR MAL …</span></div><h1 id="current-word">${escape(card?.word || "")}</h1>${taboo.length ? `<div class="forbidden-label"><span></span>DIESE WÖRTER SIND TABU<span></span></div><ul class="forbidden-words">${taboo.map((word) => `<li>${escape(word)}</li>`).join("")}</ul><span class="card-detail">Wortbestandteile und Übersetzungen sind ebenfalls tabu.</span>` : `<p class="free-explain">Frei erklären! Nur das Wort selbst und seine Wortteile sind verboten.</p>`}</article>`;
}
