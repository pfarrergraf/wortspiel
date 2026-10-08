import { ctx } from "../app.js";
import { cards } from "../data.js";
import {
  availableCards,
  cycle,
  groupId,
  roundPoints,
  teamIndex,
  DIFFICULTIES,
} from "../engine.js";
import { escape, icon, action, colors, teamSymbols } from "./html.js";
import { renderCard } from "./card.js";
import { renderPlayActions } from "./play-actions.js";
import { setup } from "./setup.js";
import { turnSummary, finalResult } from "./summary.js";

// Rendered into the play screen while the microphone helper is active.
export const speechView = { status: "" };

function scoreStrip(session) {
  return `<div class="score-strip">${session.settings.teams.map((team, index) => `<div class="team-score ${colors[index]} ${teamIndex(session) === index && session.phase !== "finished" ? "current" : ""}"><span class="team-symbol">${teamSymbols[index]}</span><span>${escape(team)}</span><strong>${session.scores[index]}</strong></div>`).join("")}</div>`;
}

function handover(session, team, remaining) {
  return `<section class="handover panel"><span class="round-pill">RUNDE ${cycle(session)} VON ${session.settings.cycles}</span><span class="handover-symbol ${colors[teamIndex(session)]}">${teamSymbols[teamIndex(session)]}</span><p>Gebt das Gerät an die erklärende Person von</p><h1>${escape(team)}</h1><p class="handover-sub">Nur sie und die Person, die kontrolliert, sehen die Karte.<br>Der Rest eures Teams rät laut mit.</p><div class="ready-facts"><span>${icon("clock")} ${session.settings.seconds} Sekunden</span><span>${remaining} Karten übrig</span></div>${action("start-turn", `Wir sind bereit ${icon("play")}`, "button primary")}<small>Die erste Karte erscheint, sobald ihr startet.</small></section>`;
}

function play(session, team, remaining) {
  const card = cards.find((c) => c.id === session.current);
  const paused = session.phase === "paused";
  return `<div class="play-layout"><div class="play-main"><div class="play-top"><div><span class="eyebrow">${escape(team)}</span><span>Runde ${cycle(session)} / ${session.settings.cycles}</span></div><div class="timer ${session.remaining <= 10000 ? "urgent" : ""}" id="timer" role="timer" aria-label="Verbleibende Sekunden">${icon("clock")}<strong id="timer-number">${Math.ceil((session.deadline ? session.deadline - Date.now() : session.remaining) / 1000)}</strong><span>s</span></div>${action(paused ? "resume" : "pause", icon(paused ? "play" : "pause"), "icon-button", `aria-label="${paused ? "Runde fortsetzen" : "Runde pausieren"}"`)}</div><div class="time-track"><div id="time-progress" style="width:${Math.max(0, session.remaining / (session.settings.seconds * 10))}%"></div></div>
      ${paused ? `<div class="game-card paused-card"><span class="pause-art">Ⅱ</span><h1>Kurz durchatmen.</h1><p>Die Karte ist verdeckt. Eure Zeit bleibt stehen.</p>${action("resume", `Weiter geht’s ${icon("play")}`, "button primary")}</div>` : renderCard(card, session)}
      ${renderPlayActions(session)}<div class="play-bottom">${action("undo", `${icon("undo")} Letzte Wertung zurück`, "text-button", session.log.length ? "" : "disabled")}<span>${remaining} Karten übrig</span></div><div class="speech-feedback" id="speech-feedback" role="status" aria-live="polite">${session.settings.speech ? escape(speechView.status || "Lokales Mikrofon wird vorbereitet …") : ""}</div></div><aside class="round-sidebar panel"><span class="eyebrow">DIESE RUNDE</span><strong class="round-points">${roundPoints(session) > 0 ? "+" : ""}${roundPoints(session)}</strong><span>Punkte bisher</span><div class="round-counts"><div><b>${session.log.filter((l) => l.result === "correct").length}</b> erraten</div><div><b>${session.log.filter((l) => l.result === "taboo").length}</b> Tabuwörter</div><div><b>${session.log.filter((l) => l.result === "skip").length}</b> übersprungen</div></div><div class="round-toolbar">${action("toggle-sound", icon(session.settings.sound ? "volume" : "muted"), "icon-button", `aria-label="${session.settings.sound ? "Sounds ausschalten" : "Sounds einschalten"}"`)}${action("toggle-speech", icon("mic"), `icon-button ${session.settings.speech ? "enabled" : ""}`, 'aria-label="Mikrofon umschalten"')}</div>${action("end-turn-confirm", "Runde beenden", "text-button")}</aside></div>`;
}

export function game() {
  const { state } = ctx;
  const session = state.session;
  if (!session) {
    ctx.view = "setup";
    return setup();
  }
  const team = session.settings.teams[teamIndex(session)];
  const group = state.groups[groupId(session.settings.group)];
  const remaining = availableCards(cards, session.settings, group?.seen).length;
  const content =
    session.phase === "ready"
      ? handover(session, team, remaining)
      : ["playing", "paused"].includes(session.phase)
        ? play(session, team, remaining)
        : session.phase === "summary"
          ? turnSummary(session, team)
          : finalResult(session, remaining);
  return `<div class="game-heading"><button data-action="setup" class="text-button">← Spielübersicht</button><span>${escape(session.settings.group)} · ${DIFFICULTIES.find((d) => d.id === session.settings.difficulty)?.name || "Alles / knifflig"}</span></div>${scoreStrip(session)}${content}`;
}
