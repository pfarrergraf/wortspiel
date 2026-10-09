import { ctx } from "../app.js";
import { cycle } from "../engine.js";
import { escape, icon, action, colors } from "./html.js";
import { tabooLabel } from "../rules/taboo.js";

export function logList(log, settings) {
  if (!log.length)
    return '<p class="empty-log">Diesmal wurde noch keine Karte gewertet.</p>';
  return `<ul class="results-list">${log.map((entry) => `<li><span class="result-icon ${entry.result}">${icon(entry.result === "correct" ? "check" : entry.result === "taboo" ? "close" : "skip")}</span><strong>${escape(entry.word)}</strong><span>${entry.result === "correct" ? "Erraten" : entry.result === "taboo" ? tabooLabel(settings) : "Übersprungen"}</span><b>${entry.delta > 0 ? "+" : entry.delta < 0 ? "−" : ""}${Math.abs(entry.delta)}</b></li>`).join("")}</ul>`;
}

export function turnSummary(session, team) {
  const turn = session.turns.at(-1);
  return `<section class="summary panel"><span class="round-pill">RUNDE ${cycle(session)} · ${escape(team)}</span><span class="summary-art">✦</span><h1>${session.exhausted ? "Alle Karten gespielt!" : "Das war eure Runde!"}</h1><p><strong class="summary-points">${turn.points > 0 ? "+" : ""}${turn.points}</strong> Punkte für ${escape(team)}</p>${logList(turn.log, session.settings)}<div class="summary-actions">${action("next-turn", `${session.exhausted || session.turnIndex + 1 >= session.settings.teams.length * session.settings.cycles ? "Zum Ergebnis" : "Nächstes Team"} ${icon("arrow")}`, "button primary")}</div></section>`;
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
    )}</div><div class="summary-actions">${action("replay", "Nochmal spielen", "button primary")}${action("new-game", `Neue Partie ${icon("arrow")}`, "button primary")}${action("storage", "Kartenspeicher ansehen")}</div><p class="fine-print">Der Kartenspeicher bleibt erhalten. ${remaining} ungespielte Karten in euren Themen.</p><details class="turn-history"><summary>Alle Runden ansehen</summary>${session.turns.map((turn) => `<div class="history-turn"><h3>Runde ${turn.cycle} · ${escape(session.settings.teams[turn.team])} <span>${turn.points} Punkte</span></h3>${logList(turn.log, session.settings)}</div>`).join("")}</details></section>`;
}
