import { ctx } from "../app.js";
import { registerAction } from "../actions.js";
import { icon } from "../ui/html.js";

// Presentation preference only; never changes the stored game or its history.
registerAction("toggle-start-motion", (id, button) => {
  ctx.startMotionPaused = !ctx.startMotionPaused;
  document.querySelector(".mode-landing")?.classList.toggle("motion-paused", ctx.startMotionPaused);
  button.setAttribute("aria-pressed", String(ctx.startMotionPaused));
  button.setAttribute("aria-label", ctx.startMotionPaused ? "Animation fortsetzen" : "Animation anhalten");
  button.innerHTML = icon(ctx.startMotionPaused ? "play" : "pause");
});
