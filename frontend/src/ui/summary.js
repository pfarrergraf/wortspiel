import { ctx } from "../app.js";
import { cycle } from "../engine.js";
import { escape, icon, action, colors } from "./html.js";
import { tabooLabel } from "../rules/taboo.js";
import { cardPoints } from "../rules/pantomime.js";
import { cards } from "../data.js";

export const resultLabel = (result, settings) =>
  result === "correct" ? "Erraten" : result === "taboo" ? tabooLabel(settings) : "Übersprungen";

// With a turn number every entry gets a button to correct it afterwards.
export function logList(log, settings, turnNumber = null) {
  if (!log.length)
    return '<p class="empty-log">Diesmal wurde noch keine Karte gewertet.</p>';
  return `<ul class="results-list">${log.map((entry, position) => `<li><span class="result-icon ${entry.result}">${icon(entry.result === "correct" ? "check" : entry.result === "taboo" ? "close" : "skip")}</span><strong>${escape(entry.word)}</strong><span class="result-label">${resultLabel(entry.result, settings)}${entry.amended ? " · korrigiert" : ""}</span><b>${entry.delta > 0 ? "+" : entry.delta < 0 ? "−" : ""}${Math.abs(entry.delta)}</b>${turnNumber === null ? "" : action(`amend:${turnNumber}:${position}`, icon("edit"), "icon-button amend-button", `aria-label="Wertung für ${escape(entry.word)} ändern"`)}</li>`).join("")}</ul>`;
}

// The card that was still showing when the turn ended, e.g. guessed in the
// last second. The moderator can still count it.
function openCard(turn, turnNumber, settings) {
  const card = turn.open && cards.find((c) => c.id === turn.open);
  if (!card) return "";
  const points = cardPoints(card, settings);
  return `<div class="open-card"><span>Zuletzt offen: <strong>${escape(card.word)}</strong></span>${action(`amend:${turnNumber}:open:correct`, `${icon("check")} Doch erraten (+${points})`, "button secondary")}</div>`;
}

const editableLog = (session, turnNumber) => {
  const turn = session.turns[turnNumber];
  return `${logList(turn.log, session.settings, turnNumber)}${openCard(turn, turnNumber, session.settings)}`;
};

export function turnSummary(session, team) {
  const turn = session.turns.at(-1);
  return `<section class="summary panel"><span class="round-pill">RUNDE ${cycle(session)} · ${escape(team)}</span><span class="summary-art">✦</span><h1>${session.exhausted ? "Alle Karten gespielt!" : "Das war eure Runde!"}</h1><p><strong class="summary-points">${turn.points > 0 ? "+" : ""}${turn.points}</strong> Punkte für ${escape(team)}</p>${editableLog(session, session.turns.length - 1)}<p class="fine-print">Vertippt oder in letzter Sekunde erraten? Ihr könnt jede Wertung hier noch ändern.</p><div class="summary-actions">${action("next-turn", `${session.exhausted || session.turnIndex + 1 >= session.settings.teams.length * session.settings.cycles ? "Zum Ergebnis" : "Nächstes Team"} ${icon("arrow")}`, "button primary")}</div></section>`;
}

export function finalResult(session, remaining) {
  const best = Math.max(...session.scores);
  const winners = session.settings.teams.filter(
    (_, i) => session.scores[i] === best,
  );
  return `<section class="summary finish panel"><div class="confetti" aria-hidden="true">✦ &nbsp; ● &nbsp; ↗ &nbsp; ◆ &nbsp; ✦</div><span class="round-pill">EURE PARTIE IST GESPIELT</span><h1>${winners.length > 1 ? "Gleichstand!" : `${escape(winners[0])} gewinnt!`}</h1><p>Gute Wörter. Gute Runde. Noch eine?</p><div class="leaderboard">${session.settings.teams
    .map((name, index) => ({ name, index, score: session.scores[index] }))
    .sort((a, b) => b.score - a.score)
    .map(
      (entry, place) =>
        `<div class="leaderboard-row ${colors[entry.index]}"><span>${entry.score === best ? "★" : place + 1}</span><strong>${escape(entry.name)}</strong><b>${entry.score} <small>Punkte</small></b></div>`,
    )
    .join(
      "",
    )}</div><div class="summary-actions">${action("new-game", `Neue Partie ${icon("arrow")}`, "button primary")}${action("storage", "Kartenspeicher ansehen")}</div><p class="fine-print">Der Kartenspeicher bleibt erhalten. ${remaining} ungespielte Karten in euren Themen.</p><details class="turn-history"><summary>Alle Runden ansehen</summary>${session.turns.map((turn, turnNumber) => `<div class="history-turn"><h3>Runde ${turn.cycle} · ${escape(session.settings.teams[turn.team])} <span>${turn.points} Punkte</span></h3>${editableLog(session, turnNumber)}</div>`).join("")}</details></section>`;
}
