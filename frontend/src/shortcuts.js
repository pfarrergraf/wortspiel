// Keyboard shortcuts during a turn. E3 extends this (letters, help overlay).
import { ctx } from "./app.js";

const keys = {
  ArrowRight: "correct",
  ArrowDown: "skip",
  ArrowLeft: "taboo",
  " ": "pause",
};

window.addEventListener("keydown", (event) => {
  if (
    ctx.view !== "game" ||
    ctx.state?.session?.phase !== "playing" ||
    /INPUT|SELECT|TEXTAREA/.test(event.target.tagName) ||
    document.querySelector("dialog[open]")
  )
    return;
  const button = document.querySelector(`[data-action="${keys[event.key]}"]`);
  if (button) {
    event.preventDefault();
    if (!event.repeat) button.click();
  }
});
