import { icon } from "./html.js";
import { tabooLabel } from "../rules/taboo.js";
import { cards } from "../data.js";
import { cardPoints } from "../rules/pantomime.js";

// The three scoring buttons during a turn.
export function renderPlayActions(session) {
  const disabled = session.phase === "paused" ? "disabled" : "";
  const points = cardPoints(cards.find((c) => c.id === session.current), session.settings);
  return `<div class="play-actions"><button data-action="correct" class="game-action correct" ${disabled}>${icon("check")}<strong>Erraten</strong><span>+${points} ${points === 1 ? "Punkt" : "Punkte"}</span></button><button data-action="skip" class="game-action skip" ${disabled}>${icon("skip")}<strong>Überspringen</strong><span>${session.settings.skipPenalty ? "−1 Punkt" : "Kein Abzug"}</span></button><button data-action="taboo" class="game-action taboo" ${disabled}>${icon("close")}<strong>${tabooLabel(session.settings)}</strong><span>${session.settings.tabooPenalty ? "−1 Punkt" : "Kein Abzug"}</span></button></div>`;
}
