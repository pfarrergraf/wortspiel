import { categories, pantomimeCategories, noisesCategories } from "../data.js";
import { visibleTaboo } from "../rules/taboo.js";
import { escape } from "./html.js";
import { cardPoints, isPantomime } from "../rules/pantomime.js";
import { presentationMode, presentationSettings, PRESENTATIONS } from "../rules/play-modes.js";

export function modeIndicator(mode) {
  const presentation = PRESENTATIONS.find(item => item.id === mode);
  if (!presentation) return "";
  return `<div class="mode-indicator mode-${mode}" role="note" aria-label="Aufgabe: ${escape(presentation.name)}"><span aria-hidden="true">${presentation.symbol}</span><strong>${escape(presentation.name)}</strong></div>`;
}

// The visible game card. Taboo level (B2/E4), mode badges (E5) and kid emoji
// (E6) plug in here.
export function renderCard(card, session) {
  const mode = presentationMode(session);
  const settings = presentationSettings(session);
  const indicator = modeIndicator(mode);
  const instruction = PRESENTATIONS.find(item => item.id === mode)?.instruction;
  if (isPantomime(session.settings)) {
    const group = pantomimeCategories.find((c) => card?.categories.includes(c.id));
    const points = cardPoints(card, session.settings);
    return `<article class="game-card pantomime-card mode-pantomime" aria-label="Aktuelle Spielkarte"><div class="card-category"><span>${group?.emoji || "🎭"} ${escape(group?.name || "Pantomime")}</span>${indicator}</div><span class="card-points points-${points}" aria-label="${points} ${points === 1 ? "Punkt" : "Punkte"}">${"★".repeat(points)} ${points} ${points === 1 ? "Punkt" : "Punkte"}</span><span class="pantomime-emoji" aria-hidden="true">${escape(card?.emoji || "🎭")}</span><h1 id="current-word">${escape(card?.word || "")}</h1><p class="free-explain">Ohne Worte, ohne Geräusche, ohne Gegenstände. Zeigen und Gesten sind erlaubt.</p></article>`;
  }
  const category = [...categories, ...pantomimeCategories, ...noisesCategories].find(
    (c) =>
      card?.categories.includes(c.id) &&
      (c.id.startsWith("pm-") || c.id.startsWith("ns-") || session.settings.selected.includes(c.id)),
  );
  const taboo = card ? visibleTaboo(card, settings) : [];
  return `<article class="game-card mode-${escape(mode)}" aria-label="Aktuelle Spielkarte"><div class="card-category"><span>${category?.emoji || "✨"} ${escape(category?.name || "ludeverbis")}</span>${indicator}</div><h1 id="current-word">${escape(card?.word || "")}</h1>${taboo.length ? `<div class="forbidden-label"><span></span>DIESE WÖRTER SIND TABU<span></span></div><ul class="forbidden-words">${taboo.map((word) => `<li>${escape(word)}</li>`).join("")}</ul><span class="card-detail">Wortbestandteile und Übersetzungen sind ebenfalls tabu.</span>` : `<p class="free-explain">${mode === "noises" || mode === "pantomime" ? escape(instruction) : "Frei erklären! Nur das Wort selbst und seine Wortteile sind verboten."}</p>`}</article>`;
}
