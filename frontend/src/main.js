import dataset from "./data/cards.json";
import "./styles.css";
import {
  initialState,
  ensureGroup,
  availableCards,
  createSession,
  startTurn,
  recordResult,
  finishTurn,
  nextTurn,
  undoResult,
  pause,
  resume,
  restoreSession,
  teamIndex,
  cycle,
  roundPoints,
  groupId,
  resetGroup,
  exportBackup,
  importBackup,
} from "./engine.js";
import { Storage, persistentStorage } from "./storage.js";
import { LocalSpeech, findSpeechMatches } from "./speech.js";

const { cards, categories } = dataset;
const app = document.querySelector("#app");
const store = new Storage();
let state,
  view = "setup",
  busy = false,
  offlineReady = false,
  installPrompt = null,
  toastTimeout,
  timer,
  speechStatus = "",
  lastAction = 0;
let mutationQueue = Promise.resolve();
const colors = ["purple", "coral", "mint", "blue", "yellow", "pink"];
const escape = (value) =>
  String(value).replace(
    /[&<>"']/g,
    (x) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        x
      ],
  );
const icons = {
  arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  close: '<path d="m6 6 12 12M18 6 6 18"/>',
  skip: '<path d="m5 5 10 7-10 7V5Zm14 0v14"/>',
  pause: '<path d="M8 5v14M16 5v14"/>',
  play: '<path d="m7 4 13 8-13 8V4Z"/>',
  undo: '<path d="M9 5 4 10l5 5M4 10h10a6 6 0 1 1 0 12"/>',
  volume:
    '<path d="m11 4-6 5H2v6h3l6 5V4Zm5 4a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>',
  muted: '<path d="m11 4-6 5H2v6h3l6 5V4Zm6 5 5 6m0-6-5 6"/>',
  mic: '<rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3m-4 0h8"/>',
  download: '<path d="M12 3v12m-5-5 5 5 5-5M4 17v4h16v-4"/>',
  lock: '<rect x="4" y="10" width="16" height="11" rx="3"/><path d="M8 10V6a4 4 0 0 1 8 0v4m-4 4v3"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9 8a3 3 0 0 1 6 1c0 2-3 2-3 4m0 3h.01"/>',
  sparkle: '<path d="m12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3 3-7Z"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
};
const icon = (name, cls = "") =>
  `<svg class="icon ${cls}" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name] || icons.sparkle}</svg>`;
const action = (id, text, cls = "button secondary", extra = "") =>
  `<button type="button" data-action="${id}" class="${cls}" ${extra}>${text}</button>`;

function toast(message) {
  const target = document.querySelector("#toast");
  target.textContent = message;
  target.classList.add("show");
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => target.classList.remove("show"), 5500);
}

function chrome() {
  return `<header class="site-header"><a href="#" data-action="home" class="brand" aria-label="Wortspiel Startseite"><span class="brand-icon" aria-hidden="true"><i></i><b>•••</b></span><span>wortspiel<span class="brand-dot">.</span></span></a>
    <div class="header-actions"><span class="connection ${offlineReady ? "cached" : ""}" id="connection"><i></i>${offlineReady ? "Offline bereit" : navigator.onLine ? "Online" : "Offline"}</span>${action("install", `${icon("download")}<span>App installieren</span>`, "small-button install-button")}${action("help", icon("help"), "icon-button", 'aria-label="Spielregeln öffnen"')}</div></header>`;
}

function footer() {
  return `<footer class="site-footer"><span>Weniger Bildschirm. Mehr Miteinander.</span><div><a href="https://github.com/pfarrergraf/wortspiel" target="_blank" rel="noopener">Quellcode</a><button type="button" data-action="about">Karten & Datenschutz</button><span>Made for gute Runden ✦</span></div></footer>`;
}

function setup() {
  const settings = state.settings;
  const group = state.groups[groupId(settings.group)];
  const available = availableCards(cards, settings, group?.seen);
  return `<section class="hero"><div class="hero-copy"><span class="eyebrow"><span class="tiny-star">✦</span> DEINE RUNDE. EURE WÖRTER.</span><h1>Alles sagen.<br><span>Fast alles.</span><svg viewBox="0 0 300 22" aria-hidden="true"><path d="M5 14Q140-4 291 12M16 20Q160 5 280 18" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round"/></svg></h1><p>Erklärt den Begriff. Umgeht die verbotenen Wörter.<br>Und findet heraus, wer um die Ecke denken kann.</p><div class="hero-facts"><span>${icon("clock")} 30–180 Sekunden</span><span>${icon("sparkle")} 2–6 Teams</span><span>${icon("lock")} Ohne Anmeldung</span></div></div>
    <div class="hero-art" aria-hidden="true"><span class="art-star">✦</span><span class="art-circle"></span><div class="back-card"></div><div class="sample-card"><span class="sample-label">ERKLÄR MAL …</span><strong>Gute Laune</strong><span class="sample-rule">Diese Wörter sind tabu</span><ul><li>Lachen</li><li>Glück</li><li>Freude</li><li>Spaß</li><li>Grinsen</li></ul><span class="sample-bottom">Psst. Das geht auch anders.</span></div><span class="art-badge">Kopf an.<br>Handy weiter.</span></div></section>
    <nav class="section-tabs" aria-label="Spielbereiche"><button class="tab active" data-action="setup">${icon("play")} Spiel vorbereiten</button><button class="tab" data-action="storage">${icon("lock")} Kartenspeicher <span class="count-badge">${Object.keys(group?.seen || {}).length}</span></button></nav>
    ${state.session ? `<div class="resume-banner"><div><strong>Eure Partie ist gespeichert.</strong><span>${escape(state.session.settings.group)} · Runde ${Math.min(cycle(state.session), state.session.settings.cycles)}</span></div>${action("continue", `Partie fortsetzen ${icon("arrow")}`)}</div>` : ""}
    <form id="setup-form" class="setup-grid"><section class="panel category-panel"><div class="section-heading"><span class="step">01</span><div><h2>Was kommt auf die Karten?</h2><p>Wählt eure Themen. Mischt, was euch gefällt.</p></div><span class="small-tag">${cards.length.toLocaleString("de-DE")} Karten</span></div><div class="category-tools"><span id="selection-count">${settings.selected.length} von ${categories.length} ausgewählt</span><button type="button" data-action="all-categories">Alle auswählen</button><button type="button" data-action="no-categories">Alle abwählen</button></div>
      <div class="category-grid">${categories
        .map((category) => {
          const total = cards.filter((c) =>
            c.categories.includes(category.id),
          ).length;
          const fresh = cards.filter(
            (c) =>
              c.categories.includes(category.id) &&
              !Object.hasOwn(group?.seen || {}, c.id),
          ).length;
          return `<label class="category ${category.color} ${settings.selected.includes(category.id) ? "selected" : ""}"><input type="checkbox" name="category" value="${category.id}" ${settings.selected.includes(category.id) ? "checked" : ""}><span class="category-check">${icon("check")}</span><span class="category-emoji">${category.emoji}</span><strong>${escape(category.name)}</strong><span>${fresh} von ${total} ungespielt</span></label>`;
        })
        .join(
          "",
        )}</div><div class="memory-note">${icon("lock")}<p><strong>Eine Karte. Einmal gesehen.</strong> Euer Kartenspeicher bleibt auch nach einer neuen Partie erhalten.</p></div></section>
    <section class="panel settings-panel"><div class="section-heading"><span class="step coral">02</span><div><h2>Eure Spielrunde</h2><p>Ein Gerät. Alle zusammen.</p></div></div>
      <label class="field-label" for="group-name">Gruppe <span>für euren Kartenspeicher</span></label><input class="text-input" id="group-name" name="group" maxlength="60" value="${escape(settings.group)}" list="groups" required autocomplete="off"><datalist id="groups">${Object.values(
        state.groups,
      )
        .map((g) => `<option value="${escape(g.name)}"></option>`)
        .join("")}</datalist>
      <div class="field-heading"><span>Teams</span><span>2 bis 6</span></div><div class="team-inputs">${settings.teams.map((team, index) => `<div class="team-input"><span class="team-marker ${colors[index]}">${index + 1}</span><input aria-label="Name Team ${index + 1}" name="team" value="${escape(team)}" maxlength="30" required>${settings.teams.length > 2 ? action(`remove-team:${index}`, icon("close"), "remove-team", `aria-label="Team ${index + 1} entfernen"`) : ""}</div>`).join("")}</div>${settings.teams.length < 6 ? action("add-team", `${icon("plus")} Team hinzufügen`, "text-button add-team") : ""}
      <div class="settings-row"><label>Rundenzeit<select name="seconds" aria-label="Rundenzeit">${[30, 45, 60, 90, 120, 180].map((n) => `<option value="${n}" ${settings.seconds === n ? "selected" : ""}>${n} Sekunden</option>`).join("")}</select></label><label>Runden pro Team<select name="cycles" aria-label="Runden pro Team">${[1, 2, 3, 5, 7, 10, 20].map((n) => `<option value="${n}" ${settings.cycles === n ? "selected" : ""}>${n} ${n === 1 ? "Runde" : "Runden"}</option>`).join("")}</select></label></div>
      <div class="settings-row rule-settings"><label>Überspringen<select name="skipPenalty"><option value="0" ${settings.skipPenalty === 0 ? "selected" : ""}>Kein Abzug</option><option value="1" ${settings.skipPenalty === 1 ? "selected" : ""}>−1 Punkt</option></select></label><label>Verbotenes Wort<select name="tabooPenalty"><option value="1" ${settings.tabooPenalty === 1 ? "selected" : ""}>−1 Punkt</option><option value="0" ${settings.tabooPenalty === 0 ? "selected" : ""}>Kein Abzug</option></select></label></div>
      <label class="toggle-row"><span>${icon("volume")} Sounds & Signale</span><input type="checkbox" name="sound" role="switch" ${settings.sound ? "checked" : ""}></label>
      <div class="speech-setting"><div><span>${icon("mic")} Lokal zuhören</span><small>Experimentell · optional · ohne Cloud</small></div>${action("speech-settings", settings.speech ? "An" : "Prüfen", `small-button ${settings.speech ? "enabled" : ""}`, 'aria-label="Lokale Spracherkennung einstellen"')}</div>
      <div class="start-area"><span><strong id="available-count">${available.length.toLocaleString("de-DE")}</strong> ungespielte Karten für euch</span><button type="submit" class="button primary start-button">Los geht’s ${icon("arrow")}</button><small>Erraten +1 · ${settings.cycles} Runden für jedes Team</small></div></section></form>`;
}

function scoreStrip(session) {
  return `<div class="score-strip">${session.settings.teams.map((team, index) => `<div class="team-score ${colors[index]} ${teamIndex(session) === index && session.phase !== "finished" ? "current" : ""}"><span class="team-symbol">${["✦", "↗", "◈", "●", "☀", "♥"][index]}</span><span>${escape(team)}</span><strong>${session.scores[index]}</strong></div>`).join("")}</div>`;
}

function game() {
  const session = state.session;
  if (!session) {
    view = "setup";
    return setup();
  }
  const team = session.settings.teams[teamIndex(session)];
  const group = state.groups[groupId(session.settings.group)];
  const remaining = availableCards(cards, session.settings, group?.seen).length;
  let content;
  if (session.phase === "ready")
    content = `<section class="handover panel"><span class="round-pill">RUNDE ${cycle(session)} VON ${session.settings.cycles}</span><span class="handover-symbol ${colors[teamIndex(session)]}">${["✦", "↗", "◈", "●", "☀", "♥"][teamIndex(session)]}</span><p>Gebt das Gerät an die erklärende Person von</p><h1>${escape(team)}</h1><p class="handover-sub">Nur sie und die Person, die kontrolliert, sehen die Karte.<br>Der Rest eures Teams rät laut mit.</p><div class="ready-facts"><span>${icon("clock")} ${session.settings.seconds} Sekunden</span><span>${remaining} Karten übrig</span></div>${action("start-turn", `Wir sind bereit ${icon("play")}`, "button primary")}<small>Die erste Karte erscheint, sobald ihr startet.</small></section>`;
  else if (["playing", "paused"].includes(session.phase)) {
    const card = cards.find((c) => c.id === session.current);
    const category = categories.find(
      (c) =>
        card?.categories.includes(c.id) &&
        session.settings.selected.includes(c.id),
    );
    content = `<div class="play-layout"><div class="play-main"><div class="play-top"><div><span class="eyebrow">${escape(team)}</span><span>Runde ${cycle(session)} / ${session.settings.cycles}</span></div><div class="timer ${session.remaining <= 10000 ? "urgent" : ""}" id="timer" role="timer" aria-label="Verbleibende Sekunden">${icon("clock")}<strong id="timer-number">${Math.ceil((session.deadline ? session.deadline - Date.now() : session.remaining) / 1000)}</strong><span>s</span></div>${action(session.phase === "paused" ? "resume" : "pause", icon(session.phase === "paused" ? "play" : "pause"), "icon-button", `aria-label="${session.phase === "paused" ? "Runde fortsetzen" : "Runde pausieren"}"`)}</div><div class="time-track"><div id="time-progress" style="width:${Math.max(0, session.remaining / (session.settings.seconds * 10))}%"></div></div>
      ${session.phase === "paused" ? `<div class="game-card paused-card"><span class="pause-art">Ⅱ</span><h1>Kurz durchatmen.</h1><p>Die Karte ist verdeckt. Eure Zeit bleibt stehen.</p>${action("resume", `Weiter geht’s ${icon("play")}`, "button primary")}</div>` : `<article class="game-card" aria-label="Aktuelle Spielkarte"><div class="card-category"><span>${category?.emoji || "✨"} ${escape(category?.name || "Wortspiel")}</span><span>ERKLÄR MAL …</span></div><h1 id="current-word">${escape(card?.word || "")}</h1><div class="forbidden-label"><span></span>DIESE WÖRTER SIND TABU<span></span></div><ul class="forbidden-words">${card?.taboo.map((word) => `<li>${escape(word)}</li>`).join("") || ""}</ul><span class="card-detail">Wortbestandteile und Übersetzungen sind ebenfalls tabu.</span></article>`}
      <div class="play-actions"><button data-action="correct" class="game-action correct" ${session.phase === "paused" ? "disabled" : ""}>${icon("check")}<strong>Erraten</strong><span>+1 Punkt</span></button><button data-action="skip" class="game-action skip" ${session.phase === "paused" ? "disabled" : ""}>${icon("skip")}<strong>Überspringen</strong><span>${session.settings.skipPenalty ? "−1 Punkt" : "Kein Abzug"}</span></button><button data-action="taboo" class="game-action taboo" ${session.phase === "paused" ? "disabled" : ""}>${icon("close")}<strong>Tabuwort</strong><span>${session.settings.tabooPenalty ? "−1 Punkt" : "Kein Abzug"}</span></button></div><div class="play-bottom">${action("undo", `${icon("undo")} Letzte Wertung zurück`, "text-button", session.log.length ? "" : "disabled")}<span>${remaining} Karten übrig</span></div><div class="speech-feedback" id="speech-feedback" role="status" aria-live="polite">${session.settings.speech ? escape(speechStatus || "Lokales Mikrofon wird vorbereitet …") : ""}</div></div><aside class="round-sidebar panel"><span class="eyebrow">DIESE RUNDE</span><strong class="round-points">${roundPoints(session) > 0 ? "+" : ""}${roundPoints(session)}</strong><span>Punkte bisher</span><div class="round-counts"><div><b>${session.log.filter((l) => l.result === "correct").length}</b> erraten</div><div><b>${session.log.filter((l) => l.result === "taboo").length}</b> Tabuwörter</div><div><b>${session.log.filter((l) => l.result === "skip").length}</b> übersprungen</div></div><div class="round-toolbar">${action("toggle-sound", icon(session.settings.sound ? "volume" : "muted"), "icon-button", `aria-label="${session.settings.sound ? "Sounds ausschalten" : "Sounds einschalten"}"`)}${action("toggle-speech", icon("mic"), `icon-button ${session.settings.speech ? "enabled" : ""}`, 'aria-label="Mikrofon umschalten"')}</div>${action("end-turn-confirm", "Runde beenden", "text-button")}</aside></div>`;
  } else if (session.phase === "summary") {
    const turn = session.turns.at(-1);
    content = `<section class="summary panel"><span class="round-pill">RUNDE ${cycle(session)} · ${escape(team)}</span><span class="summary-art">✦</span><h1>${session.exhausted ? "Alle Karten gespielt!" : "Das war eure Runde!"}</h1><p><strong class="summary-points">${turn.points > 0 ? "+" : ""}${turn.points}</strong> Punkte für ${escape(team)}</p>${logList(turn.log)}<div class="summary-actions">${action("next-turn", `${session.exhausted || session.turnIndex + 1 >= session.settings.teams.length * session.settings.cycles ? "Zum Ergebnis" : "Nächstes Team"} ${icon("arrow")}`, "button primary")}</div></section>`;
  } else {
    const best = Math.max(...session.scores);
    const winners = session.settings.teams.filter(
      (_, i) => session.scores[i] === best,
    );
    content = `<section class="summary finish panel"><div class="confetti" aria-hidden="true">✦ &nbsp; ● &nbsp; ↗ &nbsp; ◆ &nbsp; ✦</div><span class="round-pill">EURE PARTIE IST GESPIELT</span><h1>${winners.length > 1 ? "Gleichstand!" : `${escape(winners[0])} gewinnt!`}</h1><p>Gute Wörter. Gute Runde. Noch eine?</p><div class="leaderboard">${session.settings.teams
      .map((name, index) => ({ name, index, score: session.scores[index] }))
      .sort((a, b) => b.score - a.score)
      .map(
        (entry, place) =>
          `<div class="leaderboard-row ${colors[entry.index]}"><span>${entry.score === best ? "★" : place + 1}</span><strong>${escape(entry.name)}</strong><b>${entry.score} <small>Punkte</small></b></div>`,
      )
      .join(
        "",
      )}</div><div class="summary-actions">${action("new-game", `Neue Partie ${icon("arrow")}`, "button primary")}${action("storage", "Kartenspeicher ansehen")}</div><p class="fine-print">Der Kartenspeicher bleibt erhalten. ${remaining} ungespielte Karten in euren Themen.</p><details class="turn-history"><summary>Alle Runden ansehen</summary>${session.turns.map((turn) => `<div class="history-turn"><h3>Runde ${turn.cycle} · ${escape(session.settings.teams[turn.team])} <span>${turn.points} Punkte</span></h3>${logList(turn.log)}</div>`).join("")}</details></section>`;
  }
  return `<div class="game-heading"><button data-action="setup" class="text-button">← Spielübersicht</button><span>${escape(session.settings.group)}</span></div>${scoreStrip(session)}${content}`;
}

function logList(log) {
  if (!log.length)
    return '<p class="empty-log">Diesmal wurde noch keine Karte gewertet.</p>';
  return `<ul class="results-list">${log.map((entry) => `<li><span class="result-icon ${entry.result}">${icon(entry.result === "correct" ? "check" : entry.result === "taboo" ? "close" : "skip")}</span><strong>${escape(entry.word)}</strong><span>${entry.result === "correct" ? "Erraten" : entry.result === "taboo" ? "Tabuwort" : "Übersprungen"}</span><b>${entry.delta > 0 ? "+" : entry.delta < 0 ? "−" : ""}${Math.abs(entry.delta)}</b></li>`).join("")}</ul>`;
}

function memory() {
  const group = state.groups[groupId(state.settings.group)];
  const seen = Object.keys(group?.seen || {}).length;
  const remaining = cards.filter(
    (c) => !Object.hasOwn(group?.seen || {}, c.id),
  ).length;
  return `<div class="memory-heading"><span class="eyebrow">EUER LANGZEITGEDÄCHTNIS</span><h1>Schon gesehen?<br><span>Kommt nicht wieder.</span></h1><p>Heute, morgen oder nächste Woche: Neue Partien löschen keine Karten.</p></div><nav class="section-tabs" aria-label="Spielbereiche"><button class="tab" data-action="setup">${icon("play")} Spiel vorbereiten</button><button class="tab active" data-action="storage">${icon("lock")} Kartenspeicher</button></nav><section class="panel memory-panel"><div class="memory-group"><div><h2>${escape(state.settings.group)}</h2><p>Der Speicher gehört zu dieser Gruppe auf diesem Gerät.</p></div>${action("setup", "Gruppe wechseln")}</div><div class="memory-stats"><div class="purple"><strong>${seen}</strong><span>Karten bereits gesehen</span></div><div class="mint"><strong>${remaining}</strong><span>Karten noch ungespielt</span></div><div class="yellow"><strong>∞</strong><span>Kein automatischer Reset</span></div></div><div class="memory-progress"><span style="width:${Math.min(100, (seen / cards.length) * 100)}%"></span></div><div class="memory-actions">${action("export", `${icon("download")} Sicherung herunterladen`, "button primary")}${action("import", "Sicherung einlesen")}${action("persist", `${icon("lock")} Speicher schützen`)}</div><input type="file" id="backup-input" accept="application/json,.json" hidden><div class="memory-explanation"><h3>Damit die ganze Woche keine Karte doppelt kommt.</h3><p>Eine Karte wird gespeichert, sobald sie angezeigt wird – auch wenn ihr sie überspringt. Die Speicherung überlebt neue Partien, App-Updates und Browser-Neustarts. Gruppen mit unterschiedlichen Namen haben getrennte Speicher.</p><p>Der Browser kann Website-Daten entfernen, etwa bei knappem Speicher oder wenn du sie löschst. Im privaten Modus bleiben sie meist nur bis zum Schließen erhalten. Nutze möglichst denselben Browser oder die installierte App und sichere den Speicher vor eurer Freizeit. Eine Sicherung lässt sich auch auf einem anderen Gerät einlesen; bestehende Karten werden dabei ergänzt.</p></div><div class="reset-box"><div><strong>Einmal ganz von vorne?</strong><p>Nur du entscheidest, wann eure Karten wiederkommen.</p></div>${action("reset-confirm", "Kartenspeicher zurücksetzen", "button danger")}</div></section>`;
}

function render() {
  stopTimer();
  app.innerHTML = `${chrome()}<main>${view === "storage" ? memory() : view === "game" ? game() : setup()}</main>${footer()}<dialog id="modal" aria-labelledby="dialog-title"></dialog>`;
  if (view === "game" && state.session?.phase === "playing") startTimer();
  syncSpeech();
}

function dialog(title, body, buttons = "") {
  const modal = document.querySelector("#modal");
  modal.innerHTML = `<div class="dialog-heading"><h2 id="dialog-title">${title}</h2>${action("close-dialog", icon("close"), "icon-button", 'aria-label="Dialog schließen"')}</div><div class="dialog-body">${body}</div>${buttons ? `<div class="dialog-actions">${buttons}</div>` : ""}`;
  modal.showModal();
}

function change(fn, after, repaint = true) {
  const operation = mutationQueue.then(async () => {
    busy = true;
    if (repaint)
      document.querySelectorAll(".game-action").forEach((button) => {
        button.disabled = true;
      });
    try {
      state = await store.update(fn);
      if (after) after();
      if (repaint) render();
      return true;
    } catch (error) {
      toast(
        error.message ||
          "Speichern fehlgeschlagen. Bitte versuche es noch einmal.",
      );
      if (repaint) render();
      return false;
    } finally {
      busy = false;
    }
  });
  mutationQueue = operation;
  return operation;
}

function readSettings() {
  const form = document.querySelector("#setup-form");
  if (!form) return state.settings;
  const data = new FormData(form);
  return {
    ...state.settings,
    group: String(data.get("group")).trim(),
    teams: data.getAll("team").map((team) => String(team).trim()),
    selected: data.getAll("category"),
    seconds: Number(data.get("seconds")),
    cycles: Number(data.get("cycles")),
    skipPenalty: Number(data.get("skipPenalty")),
    tabooPenalty: Number(data.get("tabooPenalty")),
    sound: data.get("sound") === "on",
  };
}

function stopTimer() {
  clearInterval(timer);
}
function startTimer() {
  timer = setInterval(() => {
    const session = state.session;
    if (!session || session.phase !== "playing") return stopTimer();
    const remaining = Math.max(0, session.deadline - Date.now());
    const seconds = Math.ceil(remaining / 1000);
    const number = document.querySelector("#timer-number");
    if (number) number.textContent = seconds;
    document
      .querySelector("#timer")
      ?.classList.toggle("urgent", remaining <= 10000);
    const progress = document.querySelector("#time-progress");
    if (progress)
      progress.style.width = `${remaining / (session.settings.seconds * 10)}%`;
    if (remaining <= 0 && !busy)
      change((s) => finishTurn(s)).then((done) => {
        if (done) beep("end");
      });
  }, 150);
}

let audio;
function beep(kind) {
  if (!(state.session?.settings.sound ?? state.settings.sound)) return;
  try {
    audio ||= new (window.AudioContext || window.webkitAudioContext)();
    audio.resume();
    const oscillator = audio.createOscillator(),
      gain = audio.createGain();
    oscillator.connect(gain);
    gain.connect(audio.destination);
    oscillator.frequency.setValueAtTime(
      kind === "correct"
        ? 660
        : kind === "taboo"
          ? 180
          : kind === "end"
            ? 440
            : 340,
      audio.currentTime,
    );
    if (kind === "correct")
      oscillator.frequency.exponentialRampToValueAtTime(
        990,
        audio.currentTime + 0.12,
      );
    gain.gain.setValueAtTime(0.08, audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.22);
    oscillator.start();
    oscillator.stop(audio.currentTime + 0.24);
  } catch {
    /* Sounds never block play. */
  }
}

const speech = new LocalSpeech(
  (text) => {
    if (state.session?.phase !== "playing") return;
    const card = cards.find((c) => c.id === state.session.current);
    if (!card) return;
    const matches = findSpeechMatches(text, card);
    const target = document.querySelector("#speech-feedback");
    if (target)
      target.textContent = matches.taboo.length
        ? `Gehört: „${matches.taboo.join(", ")}“. Prüft selbst, wer das gesagt hat; wertet mit den Spieltasten.`
        : matches.guessed
          ? "Lösungswort gehört! Bestätigt den Treffer mit „Erraten“."
          : `Gehört: „${text.slice(0, 120)}“`;
  },
  (status) => {
    speechStatus = status;
    const target = document.querySelector("#speech-feedback");
    if (target) target.textContent = status;
  },
);

let speechStarting = false;
async function syncSpeech() {
  const wanted =
    view === "game" &&
    state.session?.phase === "playing" &&
    state.session.settings.speech &&
    !document.hidden;
  if (!wanted) {
    speech.stop();
    return;
  }
  if (speech.running || speechStarting) return;
  speechStarting = true;
  try {
    await speech.start();
    if (
      !(
        view === "game" &&
        state.session?.phase === "playing" &&
        state.session.settings.speech
      )
    )
      speech.stop();
  } catch (error) {
    speechStatus = error.message;
    const target = document.querySelector("#speech-feedback");
    if (target) target.textContent = speechStatus;
  } finally {
    speechStarting = false;
  }
}

async function speechSettings() {
  if (state.session?.phase === "playing") await change((s) => pause(s));
  const status = await LocalSpeech.availability();
  const active = state.session?.settings.speech ?? state.settings.speech;
  dialog(
    "Zuhören, wenn ihr möchtet.",
    `<p>Die lokale Spracherkennung verarbeitet Sprache auf eurem Gerät. Sie ist experimentell und braucht einen passenden Browser mit deutschem Sprachpaket. Es gibt keinen automatischen Wechsel zu einem Cloud-Dienst.</p><p>Sie gibt Hinweise auf gehörte Wörter. Wer gesprochen hat, kann sie nicht unterscheiden. Die Wertung bleibt deshalb bei euch und den Spieltasten.</p><div class="speech-availability"><strong>${status === "available" ? "Auf diesem Gerät verfügbar." : status === "downloadable" || status === "downloading" ? "Ein deutsches Sprachpaket wird benötigt." : "Auf diesem Gerät derzeit nicht verfügbar."}</strong><p>${status === "available" ? "Du kannst das Mikrofon für eure Runden aktivieren." : status === "downloadable" || status === "downloading" ? "Das einmalige Laden benötigt eine Internetverbindung und Speicherplatz." : "Ihr könnt mit allen Spieltasten weiterspielen."}</p></div><p class="fine-print">Cloud-Transkription mit Passwort und Kostenbegrenzung folgt als separate Erweiterung. In dieser Version entstehen keine Cloud-Transkriptionskosten.</p>`,
    `${active ? action("speech-off", "Zuhören ausschalten") : status === "available" ? action("speech-on", "Lokal zuhören aktivieren", "button primary") : ["downloadable", "downloading"].includes(status) ? action("speech-install", "Sprachpaket laden", "button primary") : ""}${action("close-dialog", "Schließen")}`,
  );
}

document.addEventListener("submit", async (event) => {
  if (event.target.id !== "setup-form") return;
  event.preventDefault();
  const settings = readSettings();
  if (state.session && state.session.phase !== "finished") {
    await change((s) => {
      s.settings = settings;
    });
    dialog(
      "Neue Partie beginnen?",
      "<p>Die laufende Partie wird beendet. Bereits gesehene Karten bleiben im Kartenspeicher.</p>",
      `${action("replace-game", "Neue Partie starten", "button primary")}${action("close-dialog", "Abbrechen")}`,
    );
  } else
    await change(
      (s) => {
        s.settings = settings;
        createSession(s, cards, categories);
      },
      () => {
        view = "game";
        window.scrollTo(0, 0);
      },
    );
});

document.addEventListener("change", async (event) => {
  if (event.target.closest("#setup-form")) {
    const settings = readSettings();
    const textInput = event.target.matches(
      'input[name="team"], input[name="group"]',
    );
    await change(
      (s) => {
        s.settings = settings;
      },
      () => {
        if (textInput && document.querySelector("#available-count")) {
          const group = state.groups[groupId(settings.group)];
          document.querySelector("#available-count").textContent =
            availableCards(cards, settings, group?.seen).length.toLocaleString(
              "de-DE",
            );
          document.querySelectorAll(".category").forEach((label) => {
            const id = label.querySelector("input").value;
            const total = cards.filter((c) => c.categories.includes(id));
            label.lastElementChild.textContent = `${total.filter((c) => !Object.hasOwn(group?.seen || {}, c.id)).length} von ${total.length} ungespielt`;
          });
        }
      },
      !textInput,
    );
  }
  if (event.target.id === "backup-input") {
    const file = event.target.files[0];
    if (!file) return;
    try {
      if (file.size > 5 * 1024 * 1024)
        throw new Error("Die Sicherung ist zu groß (maximal 5 MB).");
      const backup = JSON.parse(await file.text());
      let added = 0;
      const done = await change((s) => {
        added = importBackup(s, backup);
      });
      if (done)
        toast(`${added} zusätzliche Karten in den Speicher übernommen.`);
    } catch (error) {
      toast(error.message);
    }
  }
});

document.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-action]");
  if (!button || button.disabled) return;
  event.preventDefault();
  const id = button.dataset.action;
  if (["correct", "skip", "taboo"].includes(id)) {
    if (Date.now() - lastAction < 300) return;
    lastAction = Date.now();
    const done = await change((s) => recordResult(s, cards, id));
    if (done) {
      beep(id);
      if (id === "taboo") navigator.vibrate?.(100);
    }
  } else if (id === "start-turn") {
    const done = await change((s) => startTurn(s, cards));
    if (done) persistentStorage().catch(() => {});
  } else if (id === "pause") await change((s) => pause(s));
  else if (id === "resume") await change((s) => resume(s));
  else if (id === "undo") await change((s) => undoResult(s));
  else if (id === "next-turn") await change((s) => nextTurn(s));
  else if (id === "new-game")
    await change(
      (s) => {
        s.session = null;
      },
      () => {
        view = "setup";
        window.scrollTo(0, 0);
      },
    );
  else if (id === "replace-game")
    await change(
      (s) => createSession(s, cards, categories),
      () => {
        view = "game";
        window.scrollTo(0, 0);
      },
    );
  else if (["setup", "home", "storage", "continue"].includes(id)) {
    if (state.session?.phase === "playing") await change((s) => pause(s));
    view = id === "storage" ? "storage" : id === "continue" ? "game" : "setup";
    render();
    window.scrollTo(0, 0);
  } else if (id === "all-categories" || id === "no-categories") {
    const settings = readSettings();
    await change((s) => {
      s.settings = {
        ...settings,
        selected: id === "all-categories" ? categories.map((c) => c.id) : [],
      };
    });
  } else if (id === "add-team" || id.startsWith("remove-team:")) {
    const settings = readSettings();
    await change((s) => {
      s.settings = settings;
      if (id === "add-team" && settings.teams.length < 6)
        settings.teams.push(`Team ${settings.teams.length + 1}`);
      else if (settings.teams.length > 2)
        settings.teams.splice(Number(id.split(":")[1]), 1);
    });
  } else if (id === "toggle-sound")
    await change((s) => {
      s.session.settings.sound = !s.session.settings.sound;
      s.settings.sound = s.session.settings.sound;
    });
  else if (["speech-settings", "toggle-speech"].includes(id))
    await speechSettings();
  else if (id === "speech-on" || id === "speech-off") {
    await change((s) => {
      s.settings.speech = id === "speech-on";
      if (s.session) s.session.settings.speech = id === "speech-on";
    });
    toast(
      id === "speech-on"
        ? "Lokales Mikrofon ist aktiviert und hört während der Runde zu."
        : "Mikrofon ausgeschaltet.",
    );
  } else if (id === "speech-install") {
    button.disabled = true;
    button.textContent = "Sprachpaket wird geladen …";
    try {
      toast(
        (await LocalSpeech.install())
          ? "Sprachpaket bereit."
          : "Das Sprachpaket konnte nicht geladen werden.",
      );
    } catch {
      toast("Das Sprachpaket konnte nicht geladen werden.");
    }
    await speechSettings();
  } else if (id === "close-dialog") document.querySelector("#modal").close();
  else if (id === "end-turn-confirm") {
    await change((s) => pause(s));
    dialog(
      "Diese Runde beenden?",
      "<p>Eure bisherigen Punkte bleiben erhalten. Die angezeigte Karte bleibt im Kartenspeicher.</p>",
      `${action("end-turn", "Runde beenden", "button primary")}${action("close-dialog", "Zurück zur Pause")}`,
    );
  } else if (id === "end-turn") await change((s) => finishTurn(s));
  else if (id === "reset-confirm")
    dialog(
      "Kartenspeicher zurücksetzen?",
      `<p>Alle bereits gesehenen Karten von <strong>${escape(state.settings.group)}</strong> können danach wieder auftauchen. Eine laufende Partie dieser Gruppe wird beendet.</p><p>Andere Gruppen bleiben erhalten. Lade vorher eine Sicherung herunter, wenn du den Speicher behalten möchtest.</p>`,
      `${action("reset-group", "Ja, Speicher zurücksetzen", "button danger")}${action("close-dialog", "Abbrechen")}`,
    );
  else if (id === "reset-group") {
    const done = await change((s) => resetGroup(s, s.settings.group));
    if (done) toast("Kartenspeicher dieser Gruppe zurückgesetzt.");
  } else if (id === "export") {
    const blob = new Blob([JSON.stringify(exportBackup(state), null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob),
      link = document.createElement("a");
    link.href = url;
    link.download = `wortspiel-speicher-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast("Sicherung für alle Gruppen heruntergeladen.");
  } else if (id === "import") document.querySelector("#backup-input").click();
  else if (id === "persist") {
    try {
      toast(
        (await persistentStorage())
          ? "Der Browser schützt euren Speicher vor automatischem Entfernen. Eine Sicherung bleibt sinnvoll."
          : "Der Browser hat den Speicherschutz nicht zugesagt. Bitte nutze eine Sicherungsdatei.",
      );
    } catch {
      toast(
        "Speicherschutz ist hier nicht verfügbar. Bitte sichere den Kartenspeicher als Datei.",
      );
    }
  } else if (id === "install") {
    if (installPrompt) {
      await installPrompt.prompt();
      installPrompt = null;
    } else
      dialog(
        "Wortspiel auf den Startbildschirm",
        "<p><strong>iPhone / iPad:</strong> Öffne diese Adresse in Safari, tippe auf „Teilen“ und dann „Zum Home-Bildschirm“.</p><p><strong>Android:</strong> Öffne diese Adresse in Chrome und wähle im Menü „App installieren“ oder „Zum Startbildschirm hinzufügen“.</p><p>Warte einmal auf „Offline bereit“. Danach kannst du auch ohne Internet spielen. Nutze für euren Kartenspeicher möglichst immer denselben Browser oder dieselbe installierte App.</p>",
        action("close-dialog", "Alles klar", "button primary"),
      );
  } else if (id === "help")
    dialog(
      "So spielt ihr Wortspiel.",
      '<ol class="rules"><li><strong>Teams bilden.</strong> Wählt Themen, Zeit und die Anzahl der Runden. Gebt eurer Gruppe einen Namen für ihren Kartenspeicher.</li><li><strong>Gerät weitergeben.</strong> Eine Person erklärt den großen Begriff. Eine Person aus einem anderen Team kontrolliert die Karte. Die Ratenden dürfen sie nicht sehen.</li><li><strong>Um die Ecke denken.</strong> Die verbotenen Wörter, ihre Wortbestandteile und Übersetzungen sind tabu. Keine Gesten, Anfangsbuchstaben oder „reimt sich auf“.</li><li><strong>Mit den Tasten werten.</strong> Erraten gibt +1. Tabuwort und Überspringen zählen so, wie ihr es eingestellt habt. Bei einem Vertipper hilft „Letzte Wertung zurück“.</li><li><strong>Alle kommen dran.</strong> Nach dem Timer wechselt das Team. Nach allen Runden gewinnt das Team mit den meisten Punkten.</li></ol><p>Euer Kartenspeicher bleibt erhalten, bis ihr ihn ausdrücklich zurücksetzt.</p>',
      action("close-dialog", "Verstanden", "button primary"),
    );
  else if (id === "about")
    dialog(
      "Karten & Datenschutz",
      `<p>Wortspiel ist ein eigenständiges, kostenloses Spiel zum Begriffe-Erklären. Keine Anmeldung, keine Werbung, kein Tracking.</p><p>${cards.length} vollständige Karten: deutsche Daten aus <a href="https://github.com/Kovah/Taboo-Data" target="_blank" rel="noopener">Kovah/Taboo-Data</a>, eure vorhandenen Karten und eigene Ergänzungen. Der offene Quellcode und die Kartendaten stehen unter GPL-3.0-or-later. Quellen und Änderungen sind im <a href="https://github.com/pfarrergraf/wortspiel" target="_blank" rel="noopener">Repository</a> dokumentiert.</p><p>Gruppennamen, Punkte und gesehene Karten bleiben im Website-Speicher auf deinem Gerät. Die Sicherung wird erst durch deinen Klick heruntergeladen. Lokale Spracherkennung ist optional, verarbeitet auf dem Gerät und speichert keine Aufnahmen oder Transkripte. Sie wird niemals automatisch durch einen Cloud-Dienst ersetzt.</p><p>Beim ersten Laden und bei App-Updates gelten die technischen Zugriffsprotokolle des Hosters GitHub Pages.</p>`,
      action("close-dialog", "Schließen"),
    );
});

document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    speech.stop();
    if (state?.session?.phase === "playing") change((s) => pause(s));
  }
});
window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  installPrompt = event;
});
window.addEventListener("storage", (event) => {
  if (event.key === "wortspiel.state.v1" && !busy) {
    try {
      const fresh = JSON.parse(event.newValue);
      if (fresh?.schema === 1 && fresh.revision > state.revision) {
        state = fresh;
        store.state = fresh;
        render();
      }
    } catch {
      /* Ignore unrelated or malformed writes. */
    }
  }
});
window.addEventListener("keydown", (event) => {
  if (
    view !== "game" ||
    state?.session?.phase !== "playing" ||
    /INPUT|SELECT|TEXTAREA/.test(event.target.tagName) ||
    document.querySelector("dialog[open]")
  )
    return;
  const button = document.querySelector(
    `[data-action="${{ ArrowRight: "correct", ArrowDown: "skip", ArrowLeft: "taboo", " ": "pause" }[event.key]}"]`,
  );
  if (button) {
    event.preventDefault();
    if (!event.repeat) button.click();
  }
});

async function boot() {
  try {
    state = await store.open(initialState(categories));
    state = await store.update((s) => {
      restoreSession(s);
      ensureGroup(s);
    });
    if (state.session) view = "game";
    render();
  } catch (error) {
    app.innerHTML = `<main class="startup-error"><h1>Der Kartenspeicher braucht Platz.</h1><p>${escape(error.message)}</p><p>Bitte erlaube Website-Speicher und lade die Seite erneut.</p><button onclick="location.reload()" class="button primary">Erneut versuchen</button></main>`;
    return;
  }
  if ("serviceWorker" in navigator && import.meta.env.PROD) {
    try {
      await navigator.serviceWorker.register(
        new URL("./sw.js", document.baseURI),
        { scope: "./" },
      );
      await navigator.serviceWorker.ready;
      offlineReady = true;
      const badge = document.querySelector("#connection");
      if (badge) {
        badge.innerHTML = "<i></i>Offline bereit";
        badge.classList.add("cached");
      }
    } catch {
      toast(
        "Offline-Speicherung konnte noch nicht vorbereitet werden. Bitte später online erneut öffnen.",
      );
    }
  }
}

boot();
