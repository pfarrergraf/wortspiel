import { icon } from "./html.js";
import { tabooLabel } from "../rules/taboo.js";

// The three scoring buttons during a turn.
export function renderPlayActions(session) {
  const disabled = session.phase === "paused" ? "disabled" : "";
  return `<div class="play-actions"><button data-action="correct" class="game-action correct" ${disabled}>${icon("check")}<strong>Erraten</strong><span>+1 Punkt</span></button><button data-action="skip" class="game-action skip" ${disabled}>${icon("skip")}<strong>Überspringen</strong><span>${session.settings.skipPenalty ? "−1 Punkt" : "Kein Abzug"}</span></button><button data-action="taboo" class="game-action taboo" ${disabled}>${icon("close")}<strong>${tabooLabel(session.settings)}</strong><span>${session.settings.tabooPenalty ? "−1 Punkt" : "Kein Abzug"}</span></button></div>`;
}
