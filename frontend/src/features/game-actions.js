import { ctx, change, dialog, go } from "../app.js";
import { registerAction } from "../actions.js";
import { emit } from "../events.js";
import { cards, categories } from "../data.js";
import {
  createSession,
  finishTurn,
  nextTurn,
  pause,
  recordResult,
  resume,
  startTurn,
  undoResult,
} from "../engine.js";
import { persistentStorage } from "../storage.js";
import { action } from "../ui/html.js";

let lastAction = 0;
const scroll = () => window.scrollTo(0, 0);

for (const result of ["correct", "skip", "taboo"])
  registerAction(result, async () => {
    if (Date.now() - lastAction < 300) return;
    lastAction = Date.now();
    const done = await change((s) => recordResult(s, cards, result));
    if (!done) return;
    emit("result", { result });
    if (ctx.state.session?.phase === "summary")
      emit("turn-end", {
        reason: ctx.state.session.exhausted ? "exhausted" : "timer",
      });
  });

registerAction("start-turn", async () => {
  const done = await change((s) => startTurn(s, cards));
  if (!done) return;
  scroll();
  persistentStorage().catch(() => {});
  if (ctx.state.session?.phase === "playing") emit("turn-start");
});

registerAction("pause", async () => {
  if (await change((s) => pause(s))) emit("pause");
});
registerAction("resume", async () => {
  if (await change((s) => resume(s))) emit("resume");
});
registerAction("undo", () => change((s) => undoResult(s)));
registerAction("next-turn", () => change((s) => nextTurn(s)));

registerAction("new-game", () =>
  change(
    (s) => {
      s.session = null;
    },
    () => {
      ctx.view = "setup";
      scroll();
    },
  ),
);
registerAction("replace-game", () =>
  change(
    (s) => {
      if (ctx.pendingGameSettings) s.settings = structuredClone(ctx.pendingGameSettings);
      createSession(s, cards, categories);
    },
    () => {
      ctx.pendingGameSettings = null;
      ctx.view = "game";
      scroll();
    },
  ),
);

for (const id of ["setup", "home", "storage", "continue"])
  registerAction(id, async () => {
    if (ctx.state.session?.phase === "playing" && !await change((s) => pause(s))) return;
    go(id === "storage" ? "storage" : id === "continue" ? "game" : "setup");
  });

registerAction("close-dialog", () => {
  ctx.pendingGameSettings = null;
  document.querySelector("#modal").close();
});

registerAction("end-turn-confirm", async () => {
  await change((s) => pause(s));
  dialog(
    "Diese Runde beenden?",
    "<p>Eure bisherigen Punkte bleiben erhalten. Die angezeigte Karte bleibt im Kartenspeicher.</p>",
    `${action("end-turn", "Runde beenden", "button primary")}${action("close-dialog", "Zurück zur Pause")}`,
  );
});
registerAction("end-turn", async () => {
  if (await change((s) => finishTurn(s))) emit("turn-end", { reason: "manual" });
});

document.addEventListener("visibilitychange", () => {
  if (document.hidden && ctx.state?.session?.phase === "playing")
    change((s) => pause(s)).then((done) => done && emit("pause"));
});
