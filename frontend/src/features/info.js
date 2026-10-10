import { ctx, dialog, change } from "../app.js";
import { pause } from "../engine.js";
import { registerAction } from "../actions.js";
import { cards, tabooCardCount, pantomimeCategories } from "../data.js";
import { action } from "../ui/html.js";
import { iosInstallSteps } from "../ui/install-hint.js";

registerAction("project-page:", async (id) => {
  const page = id.split(":")[1];
  if (!["projekt.html", "unterstuetzen.html", "impressum.html", "datenschutz.html"].includes(page)) return;
  if (ctx.state.session?.phase === "playing" && !await change((state) => pause(state))) return;
  location.assign(new URL(`./${page}`, document.baseURI));
});

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  ctx.installPrompt = event;
});

registerAction("install", async () => {
  if (ctx.installPrompt) {
    await ctx.installPrompt.prompt();
    ctx.installPrompt = null;
  } else
    dialog(
      "Wortspiel auf den Startbildschirm",
      `${iosInstallSteps}<p><strong>Android:</strong> Öffne diese Adresse in Chrome und wähle im Menü „App installieren“ oder „Zum Startbildschirm hinzufügen“.</p><p>Warte einmal auf „Offline bereit“. Danach kannst du auch ohne Internet spielen. Nutze für euren Kartenspeicher möglichst immer denselben Browser oder dieselbe installierte App.</p>`,
      action("close-dialog", "Alles klar", "button primary"),
    );
});

registerAction("help", async () => {
  if (ctx.state.session?.phase === "playing") {
    if (!await change((state) => pause(state))) return;
  }
  dialog(
    "So spielt ihr Wortspiel.",
    '<ol class="rules"><li><strong>Teams bilden.</strong> Wählt Themen, Zeit und die Anzahl der Runden. Gebt eurer Gruppe einen Namen für ihren Kartenspeicher.</li><li><strong>Gerät weitergeben.</strong> Eine Person erklärt den großen Begriff. Eine Person aus einem anderen Team kontrolliert die Karte. Die Ratenden dürfen sie nicht sehen.</li><li><strong>Um die Ecke denken.</strong> Die verbotenen Wörter, ihre Wortbestandteile und Übersetzungen sind tabu. Keine Gesten, Anfangsbuchstaben oder „reimt sich auf“.</li><li><strong>Mit den Tasten werten.</strong> Erraten gibt +1. Tabuwort und Überspringen zählen so, wie ihr es eingestellt habt. Bei einem Vertipper hilft „Letzte Wertung zurück“.</li><li><strong>Pantomime-Modus.</strong> Die Person spielt das Wort stumm vor: keine Wörter, keine Geräusche, keine Gegenstände. Erraten gibt die Punkte auf der Karte: 1 für eine klare Geste, 2 für mehrere Gesten, 3 für ganze Geschichten. „Gesprochen“ wertet einen Regelverstoß so wie ein Tabuwort.</li><li><strong>Alle kommen dran.</strong> Nach dem Timer wechselt das Team. Nach allen Runden gewinnt das Team mit den meisten Punkten.</li></ol><p><strong>Mit Presenter oder Tastatur:</strong> „Weiter“ (Bild ↓ oder →) startet und zählt „Erraten“ (+1). „Zurück“ (Bild ↑ oder ←) zählt „Tabuwort“. Die dritte Taste (Bildschirm schwarz bzw. Präsentation, also Punkt, B, F5 oder Esc) oder ↓ überspringt. Die Leertaste pausiert.</p><p><strong>Weitere Tastenkürzel:</strong> Enter oder →: Erraten; S oder ↓: Überspringen; T oder ←: Tabuwort / Wort gesagt; P oder Leertaste: Pause / Weiter; Strg+Z oder Cmd+Z: Letzte Wertung zurück; ?: Hilfe. Die Hilfe pausiert eure Runde.</p><p><strong>Frei erklären:</strong> Keine zusätzlichen Tabuwörter. Der Begriff selbst und seine Wortbestandteile bleiben verboten.</p><p>Euer Kartenspeicher bleibt erhalten, bis ihr ihn ausdrücklich zurücksetzt.</p>',
    action("close-dialog", "Verstanden", "button primary"),
  );
});

registerAction("about", () =>
  dialog(
    "Karten & Datenschutz",
    `<p>Wortspiel ist ein eigenständiges, kostenloses Spiel zum Begriffe-Erklären. Keine Anmeldung, keine Werbung, kein Tracking.</p><p>${tabooCardCount} vollständige Karten und ${cards.length - tabooCardCount} eigene Pantomime-Wörter in ${pantomimeCategories.length} Kategorien: deutsche Daten aus <a href="https://github.com/Kovah/Taboo-Data" target="_blank" rel="noopener">Kovah/Taboo-Data</a>, eure vorhandenen Karten und eigene Ergänzungen. Der offene Quellcode und die Kartendaten stehen unter GPL-3.0-or-later. Quellen und Änderungen sind im <a href="https://github.com/pfarrergraf/wortspiel" target="_blank" rel="noopener">Repository</a> dokumentiert.</p><p>Gruppennamen, Punkte und gesehene Karten bleiben im Website-Speicher auf deinem Gerät. Die Sicherung wird erst durch deinen Klick heruntergeladen. Lokale Spracherkennung ist optional, verarbeitet auf dem Gerät und speichert keine Aufnahmen oder Transkripte. Sie wird niemals automatisch durch einen Cloud-Dienst ersetzt.</p><p>Beim ersten Laden und bei App-Updates können beim jeweiligen Website-Hoster technische Zugriffsprotokolle entstehen.</p>`,
    action("close-dialog", "Schließen"),
  ),
);
