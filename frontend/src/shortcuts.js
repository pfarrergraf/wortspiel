// Keyboard and presenter control (E3). Presenters such as Logitech R400/R500/
// Spotlight send keys: "next" = PageDown/ArrowRight, "back" = PageUp/ArrowLeft,
// the third button "." / "b" (blank screen) or F5/Escape (slideshow).
//
//   next: setup → start game (PageDown only), handover → start turn, turn → correct (+1),
//         pause → resume, summary → next team
//   back: turn → taboo (penalty)
//   third button / ArrowDown: turn → skip
//   Learned third button and "hold back = skip": see presenter.js.
//   Space / P: pause during a turn, S: skip, T: taboo, Ctrl/Cmd+Z: undo, ?: help
import { ctx } from "./app.js";

const NEXT = new Set(["PageDown", "ArrowRight", "Enter"]);
const BACK = new Set(["PageUp", "ArrowLeft"]);
const SKIP = new Set([".", "b", "B", "F5", "Escape", "ArrowDown", "s", "S"]);

// Returns the data-action (or "submit") a key triggers right now, if any.
export function presenterAction(key, view, phase) {
  // Only the presenter key starts a game from setup; arrows stay for the form.
  if (view === "setup" && key === "PageDown") return "submit";
  if (view !== "game") return null;
  if (phase === "ready" && NEXT.has(key)) return "start-turn";
  if (phase === "summary" && NEXT.has(key)) return "next-turn";
  if (phase === "paused" && (NEXT.has(key) || key === " " || key === "p" || key === "P"))
    return "resume";
  if (phase !== "playing") return null;
  if (NEXT.has(key)) return "correct";
  if (BACK.has(key) || key === "t" || key === "T") return "taboo";
  if (SKIP.has(key)) return "skip";
  if (key === " " || key === "p" || key === "P") return "pause";
  return null;
}

const typing = (target) =>
  /SELECT|TEXTAREA/.test(target.tagName) ||
  (target.tagName === "INPUT" && !/checkbox|radio/.test(target.type));

function click(id) {
  document.querySelector(`[data-action="${id}"]:not([disabled])`)?.click();
}

window.addEventListener("keydown", (event) => {
  const target = event.target;
  // presenter.js already handled it (learned skip key or "hold back").
  if (event.defaultPrevented) return;
  if (!ctx.state || document.querySelector("dialog[open]") || typing(target)) return;
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") {
    if (ctx.state.session?.phase !== "playing") return;
    event.preventDefault();
    if (!event.repeat) click("undo");
    return;
  }
  if (event.key === "?") {
    event.preventDefault();
    click("help");
    return;
  }
  if (event.altKey || event.ctrlKey || event.metaKey) return;
  // Enter on a focused button already clicks it; don't trigger a second action.
  if (event.key === "Enter" && target.tagName === "BUTTON") return;
  const id = presenterAction(
    event.key,
    ctx.view,
    ctx.state.session?.phase,
  );
  if (!id) return;
  event.preventDefault();
  if (event.repeat) return;
  if (id === "submit") {
    document.querySelector("#setup-form")?.requestSubmit();
    return;
  }
  click(id);
});
