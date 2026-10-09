import { dialog, toast } from "../app.js";
import { registerAction } from "../actions.js";
import {
  describeInput,
  externalInput,
  hidCids,
  isReserved,
  learnSkip,
  loadConfig,
  onInput,
  saveConfig,
} from "../presenter.js";
import { connectHid, currentHid, hidState, hidSupported } from "../presenter-hid.js";
import { action, escape } from "../ui/html.js";

const handlers = {
  onPress: (cid) => externalInput({ type: "hid", cid }),
  onLog: (text) => {
    // Keep the last few reports so a quick click (press + release) stays visible.
    const target = document.querySelector("#presenter-raw");
    if (!target) return;
    const previous = target.textContent.split("\n").filter((l) => l && l !== "–");
    target.textContent = [text, ...previous].slice(0, 5).join("\n");
  },
};
const learnedCids = () => {
  const skip = loadConfig().skip;
  return skip?.type === "hid" ? hidCids(skip) : [];
};

function hidSection() {
  if (!hidSupported()) return "";
  const hid = hidState();
  return `<h3>3. Logitech Spotlight direkt verbinden <small>(Chrome/Edge, experimentell)</small></h3><p>Für Tasten, die gar nichts an den Browser senden, etwa die Zeigertaste des Spotlight. Danach „Dritte Taste anlernen“ wählen.</p><p class="presenter-binding">Status: <strong id="presenter-hid">${hid.connected ? `verbunden mit ${escape(hid.name)}` : escape(hid.status)}</strong></p><p class="fine-print">Reagiert eine Taste nur beim Halten oder nur beim Klicken? Einfach noch einmal „Dritte Taste anlernen“ wählen und die Taste auf die andere Art drücken. Das ergänzt die bisherige Belegung.</p>${hid.connected ? '<p class="fine-print presenter-raw">Vom Gerät: <code id="presenter-raw">–</code></p>' : ""}`;
}

function open(message = "") {
  const config = loadConfig();
  dialog(
    "Presenter einrichten",
    `<p><strong>Weiter</strong> startet und zählt „Erraten“. <strong>Zurück</strong> zählt „Tabuwort“. Für <strong>Überspringen</strong> gibt es mehrere Wege:</p>
    <h3>1. Eine dritte Taste anlernen</h3><p>Klicke auf „Dritte Taste anlernen“ und drücke innerhalb von 10 Sekunden die gewünschte Taste am Presenter. Erkannt werden Tasten, zusätzliche Maustasten und das Mausrad.</p>
    <p class="presenter-binding">Überspringen liegt auf: <strong id="presenter-binding">${config.skip ? describeInput(config.skip) : "noch nichts angelernt"}</strong></p>
    <h3>2. Zurück lange drücken</h3><label class="toggle-row"><span>Zurück gedrückt halten = Überspringen</span><input type="checkbox" role="switch" data-presenter-hold ${config.holdBack ? "checked" : ""}></label>
    <p class="fine-print">Kurz drücken bleibt „Tabuwort“, ab 0,6 Sekunden Halten wird übersprungen. Beim Logitech Spotlight in Logi Options+ bei „Zurück-Taste gedrückt halten“ <strong>Keiner</strong> einstellen, sonst fängt die Logitech-Software das Halten ab.</p>
    ${hidSection()}
    <div class="presenter-monitor" role="status" aria-live="polite"><span>Zuletzt empfangen</span><strong id="presenter-last">Drück eine Taste am Presenter …</strong></div>
    ${message ? `<p class="presenter-message">${message}</p>` : ""}`,
    `${action("presenter-learn", "Dritte Taste anlernen", "button primary")}${hidSupported() && !currentHid() ? action("presenter-hid", "Spotlight verbinden") : ""}${config.skip || currentHid() ? action("presenter-clear", "Angelernte Taste löschen") : ""}${currentHid() ? action("presenter-diagnose", "Diagnose kopieren") : ""}${action("close-dialog", "Fertig")}`,
  );
}

onInput((input, detail) => {
  const target = document.querySelector("#presenter-last");
  if (target) target.textContent = `${describeInput(input)}${detail ? ` · ${detail}` : ""}`;
});

registerAction("presenter-setup", () => open());

registerAction("presenter-hid", async () => {
  try {
    const hid = await connectHid(handlers);
    await hid.divertOnly(learnedCids());
    open(`Verbunden mit ${escape(hidState().name)}. Jetzt „Dritte Taste anlernen“ und die Zeigertaste drücken.`);
  } catch (error) {
    // Closing the browser's device picker is not an error worth showing.
    if (error?.name === "NotFoundError") return open();
    open(`Verbinden hat nicht geklappt: ${escape(error.message)}`);
  }
});

let waiting = false;
registerAction("presenter-learn", async (id, button) => {
  // Not disabled: Chrome drops mouse events over disabled buttons, and the
  // cursor usually rests on this button while a mouse button is learned.
  if (waiting) return;
  waiting = true;
  button.setAttribute("aria-busy", "true");
  button.textContent = "Jetzt die Taste am Presenter drücken …";
  // While learning, every divertable control of a connected presenter reports to us.
  const hid = currentHid();
  // Listen before diverting: a real device (or a fast click) can report as soon
  // as its diversion takes effect, before the final HID acknowledgement.
  const pendingInput = learnSkip();
  try {
    await hid?.divertOnly(hid.divertable());
  } catch {
    /* Learning still works for keys and mouse buttons. */
  }
  const input = await pendingInput;
  waiting = false;
  try {
    await hid?.divertOnly(learnedCids());
  } catch {
    /* Re-diverting is retried on the next connect. */
  }
  if (!input)
    open(
      hidSupported() && !hid
        ? "Es kam kein Signal an. Diese Taste sendet nichts an den Browser. Versuche „Spotlight verbinden“ oder „Zurück gedrückt halten“."
        : "Es kam kein Signal an. Nutze „Zurück gedrückt halten“.",
    );
  else if (isReserved(input))
    open(`${describeInput(input)} ist schon mit Weiter, Zurück oder der Tastatur belegt. Bitte eine andere Taste wählen.`);
  else {
    open(`Angelernt: ${describeInput(input)} überspringt jetzt die Karte.`);
    toast("Presenter-Taste für „Überspringen“ gespeichert.");
  }
});

registerAction("presenter-diagnose", async () => {
  const text = [
    `Belegung: ${JSON.stringify(loadConfig())}`,
    currentHid()?.diagnostics() ?? "Kein Presenter direkt verbunden.",
  ].join("\n");
  let copied = false;
  try {
    await navigator.clipboard.writeText(text);
    copied = true;
  } catch {
    /* Shown in the dialog to copy by hand. */
  }
  open(`${copied ? "Diagnose in die Zwischenablage kopiert. Bitte in den Chat einfügen." : "Bitte diesen Text markieren und kopieren:"}<pre class="presenter-diagnose">${escape(text)}</pre>`);
});

registerAction("presenter-clear", async () => {
  saveConfig({ ...loadConfig(), skip: null });
  await currentHid()?.releaseAll();
  open("Die angelernte Taste wurde gelöscht und alle Presenter-Tasten arbeiten wieder normal.");
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

// Reconnect a previously allowed presenter without asking again.
async function reconnect() {
  if (!learnedCids().length || currentHid()) return;
  try {
    const hid = await connectHid(handlers, { ask: false });
    await hid.divertOnly(learnedCids());
  } catch {
    /* Not plugged in or not allowed yet; the setup dialog offers to connect. */
  }
}
if (hidSupported()) {
  reconnect();
  navigator.hid.addEventListener("connect", () => setTimeout(reconnect, 500));
}
