import { ctx } from "../app.js";
import { cards } from "../data.js";
import { groupId } from "../engine.js";
import { escape, icon, action } from "./html.js";

export function memory() {
  const { state } = ctx;
  const group = state.groups[groupId(state.settings.group)];
  const seen = Object.keys(group?.seen || {}).length;
  const remaining = cards.filter(
    (c) => !Object.hasOwn(group?.seen || {}, c.id),
  ).length;
  return `<div class="memory-heading"><span class="eyebrow">EUER LANGZEITGEDÄCHTNIS</span><h1>Schon gesehen?<br><span>Kommt nicht wieder.</span></h1><p>Heute, morgen oder nächste Woche: Neue Partien löschen keine Karten.</p></div><nav class="section-tabs" aria-label="Spielbereiche"><button class="tab" data-action="setup">${icon("play")} Spiel vorbereiten</button><button class="tab active" data-action="storage">${icon("lock")} Kartenspeicher</button></nav><section class="panel memory-panel"><div class="memory-group"><div><h2>${escape(state.settings.group)}</h2><p>Der Speicher gehört zu dieser Gruppe auf diesem Gerät.</p></div>${action("setup", "Gruppe wechseln")}</div><div class="memory-stats"><div class="purple"><strong>${seen}</strong><span>Karten bereits gesehen</span></div><div class="mint"><strong>${remaining}</strong><span>Karten noch ungespielt</span></div><div class="yellow"><strong>∞</strong><span>Kein automatischer Reset</span></div></div><div class="memory-progress"><span style="width:${Math.min(100, (seen / cards.length) * 100)}%"></span></div><div class="memory-actions">${action("export", `${icon("download")} Sicherung herunterladen`, "button primary")}${action("import", "Sicherung einlesen")}${action("persist", `${icon("lock")} Speicher schützen`)}</div><input type="file" id="backup-input" accept="application/json,.json" hidden><div class="memory-explanation"><h3>Damit die ganze Woche keine Karte doppelt kommt.</h3><p>Eine Karte wird gespeichert, sobald sie angezeigt wird – auch wenn ihr sie überspringt. Die Speicherung überlebt neue Partien, App-Updates und Browser-Neustarts. Gruppen mit unterschiedlichen Namen haben getrennte Speicher.</p><p>Der Browser kann Website-Daten entfernen, etwa bei knappem Speicher oder wenn du sie löschst. Im privaten Modus bleiben sie meist nur bis zum Schließen erhalten. Nutze möglichst denselben Browser oder die installierte App und sichere den Speicher vor eurer Freizeit. Eine Sicherung lässt sich auch auf einem anderen Gerät einlesen; bestehende Karten werden dabei ergänzt.</p></div><div class="reset-box"><div><strong>Einmal ganz von vorne?</strong><p>Nur du entscheidest, wann eure Karten wiederkommen.</p></div>${action("reset-confirm", "Kartenspeicher zurücksetzen", "button danger")}</div></section>`;
}
