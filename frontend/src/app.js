import { finishTurn } from "./engine.js";
import { Storage } from "./storage.js";
import { emit } from "./events.js";
import { icon, action } from "./ui/html.js";
import { chrome, footer } from "./ui/chrome.js";
import { setup } from "./ui/setup.js";
import { game } from "./ui/game.js";
import { memory } from "./ui/memory.js";

export const store = new Storage();
// Shared mutable app state. Modules read and write ctx.* instead of exporting
// their own `let` bindings.
export const ctx = {
  state: null,
  view: "setup",
  busy: false,
  offlineReady: false,
  installPrompt: null,
};
let toastTimeout,
  timer,
  mutationQueue = Promise.resolve();

export function toast(message) {
  const target = document.querySelector("#toast");
  target.textContent = message;
  target.classList.add("show");
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => target.classList.remove("show"), 5500);
}

export function render() {
  stopTimer();
  const content =
    ctx.view === "storage" ? memory() : ctx.view === "game" ? game() : setup();
  document.querySelector("#app").innerHTML =
    `${chrome()}<main>${content}</main>${footer()}<dialog id="modal" aria-labelledby="dialog-title"></dialog>`;
  if (ctx.view === "game" && ctx.state.session?.phase === "playing")
    startTimer();
  emit("render", { view: ctx.view });
}

export function go(view) {
  ctx.view = view;
  render();
  window.scrollTo(0, 0);
}

export function dialog(title, body, buttons = "") {
  const modal = document.querySelector("#modal");
  modal.innerHTML = `<div class="dialog-heading"><h2 id="dialog-title">${title}</h2>${action("close-dialog", icon("close"), "icon-button", 'aria-label="Dialog schließen"')}</div><div class="dialog-body">${body}</div>${buttons ? `<div class="dialog-actions">${buttons}</div>` : ""}`;
  modal.showModal();
}

// Serialises all state changes through the transactional store.
export function change(fn, after, repaint = true) {
  const operation = mutationQueue.then(async () => {
    ctx.busy = true;
    if (repaint)
      document.querySelectorAll(".game-action").forEach((button) => {
        button.disabled = true;
      });
    try {
      ctx.state = await store.update(fn);
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
      ctx.busy = false;
    }
  });
  mutationQueue = operation;
  return operation;
}

export function stopTimer() {
  clearInterval(timer);
}

function startTimer() {
  timer = setInterval(() => {
    const session = ctx.state.session;
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
    emit("tick", { remaining });
    if (remaining <= 0 && !ctx.busy)
      change((s) => finishTurn(s)).then((done) => {
        if (done) emit("turn-end", { reason: "timer" });
      });
  }, 150);
}
