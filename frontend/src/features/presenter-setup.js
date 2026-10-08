import { dialog, toast } from "../app.js";
import { registerAction } from "../actions.js";
import {
  describeInput,
  isReserved,
  learnSkip,
  loadConfig,
  onInput,
  saveConfig,
} from "../presenter.js";
import { action } from "../ui/html.js";

function open(message = "") {
  const config = loadConfig();
  dialog(
    "Presenter einrichten",
    `<p><strong>Weiter</strong> startet und zählt „Erraten“. <strong>Zurück</strong> zählt „Tabuwort“. Für <strong>Überspringen</strong> gibt es zwei Wege:</p>
    <h3>1. Eine dritte Taste anlernen</h3><p>Klicke auf „Dritte Taste anlernen“ und drücke innerhalb von 10 Sekunden die gewünschte Taste am Presenter. Erkannt werden Tasten, zusätzliche Maustasten und das Mausrad.</p>
    <p class="presenter-binding">Überspringen liegt auf: <strong id="presenter-binding">${config.skip ? describeInput(config.skip) : "noch nichts angelernt"}</strong></p>
    <h3>2. Zurück lange drücken</h3><label class="toggle-row"><span>Zurück gedrückt halten = Überspringen</span><input type="checkbox" role="switch" data-presenter-hold ${config.holdBack ? "checked" : ""}></label>
    <p class="fine-print">Kurz drücken bleibt „Tabuwort“, ab 0,6 Sekunden Halten wird übersprungen. Beim Logitech Spotlight in Logi Options+ bei „Zurück-Taste gedrückt halten“ <strong>Keiner</strong> einstellen, sonst fängt die Logitech-Software das Halten ab.</p>
    <div class="presenter-monitor" role="status" aria-live="polite"><span>Zuletzt empfangen</span><strong id="presenter-last">Drück eine Taste am Presenter …</strong></div>
    ${message ? `<p class="presenter-message">${message}</p>` : ""}`,
    `${action("presenter-learn", "Dritte Taste anlernen", "button primary")}${config.skip ? action("presenter-clear", "Angelernte Taste löschen") : ""}${action("close-dialog", "Fertig")}`,
  );
}

onInput((input, detail) => {
  const target = document.querySelector("#presenter-last");
  if (target) target.textContent = `${describeInput(input)}${detail ? ` · ${detail}` : ""}`;
});

registerAction("presenter-setup", () => open());

let waiting = false;
registerAction("presenter-learn", async (id, button) => {
  // Not disabled: Chrome drops mouse events over disabled buttons, and the
  // cursor usually rests on this button while a mouse button is learned.
  if (waiting) return;
  waiting = true;
  button.setAttribute("aria-busy", "true");
  button.textContent = "Jetzt die Taste am Presenter drücken …";
  const input = await learnSkip();
  waiting = false;
  if (!input)
    open("Es kam kein Signal an. Diese Taste sendet nichts an den Browser. Nutze stattdessen „Zurück gedrückt halten“.");
  else if (isReserved(input))
    open(`${describeInput(input)} ist schon mit Weiter, Zurück oder der Tastatur belegt. Bitte eine andere Taste wählen.`);
  else {
    open(`Angelernt: ${describeInput(input)} überspringt jetzt die Karte.`);
    toast("Presenter-Taste für „Überspringen“ gespeichert.");
  }
});

registerAction("presenter-clear", () => {
  saveConfig({ ...loadConfig(), skip: null });
  open("Die angelernte Taste wurde gelöscht.");
});

document.addEventListener("change", (event) => {
  if (!event.target.matches("[data-presenter-hold]")) return;
  saveConfig({ ...loadConfig(), holdBack: event.target.checked });
  toast(
    event.target.checked
      ? "Zurück lange drücken überspringt jetzt die Karte."
      : "Zurück zählt wieder immer als Tabuwort.",
  );
});
