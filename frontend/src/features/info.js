import { ctx, dialog } from "../app.js";
import { registerAction } from "../actions.js";
import { cards } from "../data.js";
import { action } from "../ui/html.js";

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
      "<p><strong>iPhone / iPad:</strong> Öffne diese Adresse in Safari, tippe auf „Teilen“ und dann „Zum Home-Bildschirm“.</p><p><strong>Android:</strong> Öffne diese Adresse in Chrome und wähle im Menü „App installieren“ oder „Zum Startbildschirm hinzufügen“.</p><p>Warte einmal auf „Offline bereit“. Danach kannst du auch ohne Internet spielen. Nutze für euren Kartenspeicher möglichst immer denselben Browser oder dieselbe installierte App.</p>",
      action("close-dialog", "Alles klar", "button primary"),
    );
});

registerAction("help", () =>
  dialog(
    "So spielt ihr Wortspiel.",
    '<ol class="rules"><li><strong>Teams bilden.</strong> Wählt Themen, Zeit und die Anzahl der Runden. Gebt eurer Gruppe einen Namen für ihren Kartenspeicher.</li><li><strong>Gerät weitergeben.</strong> Eine Person erklärt den großen Begriff. Eine Person aus einem anderen Team kontrolliert die Karte. Die Ratenden dürfen sie nicht sehen.</li><li><strong>Um die Ecke denken.</strong> Die verbotenen Wörter, ihre Wortbestandteile und Übersetzungen sind tabu. Keine Gesten, Anfangsbuchstaben oder „reimt sich auf“.</li><li><strong>Mit den Tasten werten.</strong> Erraten gibt +1. Tabuwort und Überspringen zählen so, wie ihr es eingestellt habt. Bei einem Vertipper hilft „Letzte Wertung zurück“.</li><li><strong>Alle kommen dran.</strong> Nach dem Timer wechselt das Team. Nach allen Runden gewinnt das Team mit den meisten Punkten.</li></ol><p>Euer Kartenspeicher bleibt erhalten, bis ihr ihn ausdrücklich zurücksetzt.</p>',
    action("close-dialog", "Verstanden", "button primary"),
  ),
);

registerAction("about", () =>
  dialog(
    "Karten & Datenschutz",
    `<p>Wortspiel ist ein eigenständiges, kostenloses Spiel zum Begriffe-Erklären. Keine Anmeldung, keine Werbung, kein Tracking.</p><p>${cards.length} vollständige Karten: deutsche Daten aus <a href="https://github.com/Kovah/Taboo-Data" target="_blank" rel="noopener">Kovah/Taboo-Data</a>, eure vorhandenen Karten und eigene Ergänzungen. Der offene Quellcode und die Kartendaten stehen unter GPL-3.0-or-later. Quellen und Änderungen sind im <a href="https://github.com/pfarrergraf/wortspiel" target="_blank" rel="noopener">Repository</a> dokumentiert.</p><p>Gruppennamen, Punkte und gesehene Karten bleiben im Website-Speicher auf deinem Gerät. Die Sicherung wird erst durch deinen Klick heruntergeladen. Lokale Spracherkennung ist optional, verarbeitet auf dem Gerät und speichert keine Aufnahmen oder Transkripte. Sie wird niemals automatisch durch einen Cloud-Dienst ersetzt.</p><p>Beim ersten Laden und bei App-Updates gelten die technischen Zugriffsprotokolle des Hosters GitHub Pages.</p>`,
    action("close-dialog", "Schließen"),
  ),
);
