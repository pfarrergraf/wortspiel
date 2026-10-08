// Presenter support beyond fixed keys (E3). Some remotes (e.g. Logitech
// Spotlight) handle their third button and long presses inside the vendor
// software and send no fixed key. Two device-local options solve this:
//   1. learn: the next key, extra mouse button or wheel step becomes "skip";
//   2. holdBack: holding "back" (PageUp/←) ≥ HOLD_MS skips, a short press
//      still scores taboo.
// The setting is per device (localStorage), never part of the game state.
import { ctx } from "./app.js";

const KEY = "wortspiel.presenter.v1";
export const HOLD_MS = 600;
const BACK = new Set(["PageUp", "ArrowLeft"]);
const RESERVED = new Set(["PageDown", "PageUp", "ArrowLeft", "ArrowRight", "Enter", " ", "Tab"]);
const MOUSE = { 1: "Mittlere Maustaste", 2: "Rechte Maustaste", 3: "Maustaste „Zurück“", 4: "Maustaste „Vor“" };

export function loadConfig() {
  try {
    return { skip: null, holdBack: false, ...JSON.parse(localStorage.getItem(KEY) || "{}") };
  } catch {
    return { skip: null, holdBack: false };
  }
}

export function saveConfig(config) {
  try {
    localStorage.setItem(KEY, JSON.stringify(config));
  } catch {
    /* Without storage the setting lasts until reload. */
  }
  current = config;
}

let current = loadConfig();

export function sameInput(a, b) {
  if (!a || !b || a.type !== b.type) return false;
  if (a.type === "key") return a.code && b.code ? a.code === b.code : a.key === b.key;
  if (a.type === "mouse") return a.button === b.button;
  if (a.type === "hid") return a.cid === b.cid;
  return a.dir === b.dir;
}

export function describeInput(input) {
  if (!input) return "–";
  if (input.type === "mouse") return MOUSE[input.button] || `Maustaste ${input.button}`;
  if (input.type === "hid")
    return `Presenter-Taste (direkt verbunden, ID 0x${input.cid.toString(16).toUpperCase().padStart(4, "0")})`;
  if (input.type === "wheel") return `Mausrad nach ${input.dir === "up" ? "oben" : "unten"}`;
  const name = input.key === " " ? "Leertaste" : input.key;
  return input.code && input.code !== input.key ? `Taste „${name}“ (${input.code})` : `Taste „${name}“`;
}

export const isReserved = (input) => input.type === "key" && RESERVED.has(input.key);

// Diagnostics for the setup dialog: every received signal is reported.
const watchers = new Set();
export function onInput(fn) {
  watchers.add(fn);
  return () => watchers.delete(fn);
}
const report = (input, detail = "") => watchers.forEach((fn) => fn(input, detail));

let learning = null;
let learnTimeout;
// Resolves with the learned input, or null after `ms` without a signal.
export function learnSkip(ms = 10000) {
  return new Promise((resolve) => {
    learning = (input) => {
      clearTimeout(learnTimeout);
      learning = null;
      if (!isReserved(input)) saveConfig({ ...current, skip: input });
      resolve(input);
    };
    learnTimeout = setTimeout(() => {
      learning = null;
      resolve(null);
    }, ms);
  });
}

const playing = () =>
  ctx.view === "game" &&
  ctx.state?.session?.phase === "playing" &&
  !document.querySelector("dialog[open]");
const typing = (target) =>
  /SELECT|TEXTAREA/.test(target?.tagName) ||
  (target?.tagName === "INPUT" && !/checkbox|radio/.test(target.type));
const click = (id) =>
  document.querySelector(`[data-action="${id}"]:not([disabled])`)?.click();

// Returns true when the event was consumed (learning or a learned skip).
function handle(input, event) {
  if (learning) {
    event.preventDefault();
    learning(input);
    return true;
  }
  if (playing() && sameInput(current.skip, input)) {
    event.preventDefault();
    if (!event.repeat) click("skip");
    return true;
  }
  return false;
}

// Signals from a directly connected presenter (presenter-hid.js).
export function externalInput(input) {
  report(input);
  handle(input, { preventDefault() {}, repeat: false });
}

const downAt = new Map();
let hold = null; // { timer, fired } while "back" is held during a turn

window.addEventListener(
  "keydown",
  (event) => {
    const input = { type: "key", key: event.key, code: event.code };
    if (!event.repeat) {
      downAt.set(event.code || event.key, performance.now());
      report(input);
    }
    if (typing(event.target) && !learning) return;
    if (handle(input, event)) return;
    if (current.holdBack && playing() && BACK.has(event.key) && !event.altKey && !event.ctrlKey && !event.metaKey) {
      // Decide on release: short = taboo, long = skip. Shortcuts see defaultPrevented.
      event.preventDefault();
      if (hold || event.repeat) return;
      hold = { fired: false, timer: setTimeout(() => {
        hold.fired = true;
        click("skip");
      }, HOLD_MS) };
    }
  },
  true,
);

window.addEventListener(
  "keyup",
  (event) => {
    const start = downAt.get(event.code || event.key);
    downAt.delete(event.code || event.key);
    if (start !== undefined)
      report({ type: "key", key: event.key, code: event.code }, `${Math.round(performance.now() - start)} ms gehalten`);
    if (hold && BACK.has(event.key)) {
      clearTimeout(hold.timer);
      if (!hold.fired) click("taboo");
      hold = null;
      event.preventDefault();
    }
  },
  true,
);

window.addEventListener("blur", () => {
  if (hold) clearTimeout(hold.timer);
  hold = null;
});

window.addEventListener(
  "mousedown",
  (event) => {
    if (event.button === 0) return;
    const input = { type: "mouse", button: event.button };
    report(input);
    handle(input, event);
  },
  true,
);
// Stop browser back/forward navigation and context menus for a learned button.
for (const type of ["mouseup", "auxclick", "contextmenu"])
  window.addEventListener(
    type,
    (event) => {
      if (event.button !== 0 && current.skip?.type === "mouse" && current.skip.button === event.button)
        event.preventDefault();
    },
    true,
  );

let lastWheel = 0;
window.addEventListener(
  "wheel",
  (event) => {
    if (!event.deltaY) return;
    const input = { type: "wheel", dir: event.deltaY < 0 ? "up" : "down" };
    if (!learning && !(playing() && sameInput(current.skip, input))) return;
    event.preventDefault();
    if (performance.now() - lastWheel < 700) return;
    lastWheel = performance.now();
    report(input);
    handle(input, event);
  },
  { capture: true, passive: false },
);
