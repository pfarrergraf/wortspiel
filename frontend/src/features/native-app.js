import { App } from "@capacitor/app";
import { isNativeApp, Documents } from "../native.js";
import { ctx, change, dialog, toast } from "../app.js";
import { pause } from "../engine.js";
import { on, emit } from "../events.js";
import { action } from "../ui/html.js";
import { registerAction } from "../actions.js";

async function pauseNativeGame() {
  if (ctx.state?.session?.phase !== "playing") return true;
  if (!await change((s) => pause(s))) return false;
  emit("pause");
  return true;
}

if (isNativeApp()) {
  App.addListener("appStateChange", ({ isActive }) => {
    if (!isActive) void pauseNativeGame();
  }).catch(() => toast("Bitte pausiert die Runde vor dem App-Wechsel manuell."));
  App.addListener("backButton", async ({ canGoBack }) => {
    const modal = document.querySelector("#modal");
    if (modal?.open) { modal.close(); return; }
    if (!await pauseNativeGame()) return;
    if (canGoBack) { history.back(); return; }
    dialog("App schließen?", "<p>Eure Partie bleibt gespeichert. Beim nächsten Start könnt ihr weiterspielen.</p>",
      `${action("native-exit", "App schließen")}${action("close-dialog", "Hier bleiben", "button primary")}`);
  }).catch(() => toast("Die Zurück-Taste ist derzeit nicht verfügbar."));
  on("render", () => {
    Documents.keepAwake({ enabled: ctx.view === "game" && ctx.state?.session?.phase === "playing" })
      .catch(() => {});
  });
}
registerAction("native-exit", async () => {
  if (isNativeApp() && await pauseNativeGame()) await App.exitApp();
});
