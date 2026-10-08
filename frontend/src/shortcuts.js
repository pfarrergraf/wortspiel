import { ctx, dialog } from "./app.js";
import { findAction, registerAction } from "./actions.js";
import { action } from "./ui/html.js";

const keys = {
  arrowright: "correct",
  arrowdown: "skip",
  arrowleft: "taboo",
  enter: "correct",
  s: "skip",
  t: "taboo",
};
let openingHelp = false;

async function showHelp() {
  if (openingHelp || document.querySelector("dialog[open]")) return;
  openingHelp = true;
  try {
    // Keep the card covered and the timer stopped while someone reads the help.
    if (ctx.state?.session?.phase === "playing") await findAction("pause")?.();
    dialog(
      "Tastenkürzel",
      `<p>Mit Tastatur spielt ihr genauso wie mit den Spieltasten.</p><ul class="rules"><li><strong>Enter oder →</strong>: Erraten</li><li><strong>S oder ↓</strong>: Überspringen</li><li><strong>T oder ←</strong>: Tabuwort / Wort gesagt</li><li><strong>P oder Leertaste</strong>: Pause / Weiter</li><li><strong>Strg+Z oder Cmd+Z</strong>: Letzte Wertung zurück</li><li><strong>?</strong>: Diese Hilfe öffnen</li></ul><p>Kürzel gelten während eures Zuges, auch Pause / Weiter und Rückgängig in der Pause. In Eingabefeldern und offenen Dialogen bleiben sie aus. Die Hilfe pausiert eine laufende Runde; danach setzt ihr sie selbst fort.</p>`,
      action("close-dialog", "Verstanden", "button primary"),
    );
  } finally {
    openingHelp = false;
  }
}

registerAction("shortcut-help", showHelp);

window.addEventListener("keydown", (event) => {
  if (
    event.defaultPrevented ||
    event.isComposing ||
    event.keyCode === 229 ||
    !ctx.state ||
    ctx.busy ||
    openingHelp ||
    event.composedPath().some((target) =>
      target instanceof HTMLElement &&
      (target.matches("input, select, textarea") || target.isContentEditable),
    ) ||
    document.querySelector("dialog[open]")
  )
    return;

  const key = event.key.toLowerCase();
  if (key === "?" && !event.ctrlKey && !event.metaKey && !event.altKey) {
    event.preventDefault();
    if (!event.repeat) showHelp();
    return;
  }

  const phase = ctx.state?.session?.phase;
  if (ctx.view !== "game" || !["playing", "paused"].includes(phase)) return;

  let id;
  if ((event.ctrlKey || event.metaKey) && key === "z") {
    if (event.altKey || event.shiftKey || (event.ctrlKey && event.metaKey)) return;
    id = "undo";
  } else {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    if (key === "p" || key === " ") id = phase === "paused" ? "resume" : "pause";
    else if (phase === "playing") id = keys[key];
  }
  if (!id) return;

  const button = document.querySelector(`button[data-action="${id}"]:not(:disabled)`);
  if (!button) return;
  event.preventDefault();
  // The existing button handler owns debounce, persistence, scoring and history.
  if (!event.repeat) button.click();
});
