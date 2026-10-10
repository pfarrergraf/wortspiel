import "./styles/index.css";
import { ctx, store, render, toast } from "./app.js";
import { installActions } from "./actions.js";
import { categories } from "./data.js";
import {
  initialState,
  ensureGroup,
  migrateSettings,
  restoreSession,
} from "./engine.js";
import { escape } from "./ui/html.js";
import { isNativeApp } from "./native.js";
// Features register their actions and event listeners on import.
import "./features/game-actions.js";
import "./features/setup-actions.js";
import "./features/mobile-wizard.js";
import "./features/start-motion.js";
import "./features/native-app.js";
import "./features/storage-actions.js";
import "./features/speech-actions.js";
import "./features/info.js";
import "./features/amend-actions.js";
import "./ui/install-hint.js";
import "./sound.js";
import "./haptics.js";
import "./presenter.js";
import "./shortcuts.js";
import "./features/presenter-setup.js";
import "./device.js";
import "./wakelock.js";

installActions();

window.addEventListener("storage", async (event) => {
  if (event.key === "wortspiel.state.v1" && ctx.state && !ctx.busy) {
    const revision = ctx.state.revision;
    try {
      // Keep the known baseline until Storage validates durable ancestry.
      // A raw event from an older client must never become its own proof.
      const fresh = await store.snapshot();
      if (ctx.busy || ctx.state.revision !== revision) return;
      if (fresh.revision > revision) {
        ctx.state = fresh;
        store.state = fresh;
        render();
      }
    } catch (error) {
      if (ctx.busy || ctx.state.revision !== revision) return;
      // Stop displaying/scoring an uncertain card without changing either copy.
      ctx.view = "setup";
      ctx.pendingGameSettings = null;
      render();
      toast(error.message || "Die gespeicherten Kopien konnten nicht geprüft werden. Sie bleiben erhalten.");
    }
  }
});

async function boot() {
  try {
    ctx.state = await store.open(initialState(categories));
    ctx.state = await store.update((s) => {
      migrateSettings(s);
      restoreSession(s);
      ensureGroup(s);
    });
    if (ctx.state.session) ctx.view = "game";
    ctx.offlineReady = isNativeApp();
    render();
  } catch (error) {
    document.querySelector("#app").innerHTML =
      `<main class="startup-error"><h1>Der Kartenspeicher braucht Platz.</h1><p>${escape(error.message)}</p><p>Bitte erlaube Website-Speicher und lade die Seite erneut.</p><button class="button primary">Erneut versuchen</button></main>`;
    document.querySelector(".startup-error button").addEventListener("click", () => location.reload());
    return;
  }
  if (!isNativeApp() && "serviceWorker" in navigator && import.meta.env.PROD) {
    try {
      await navigator.serviceWorker.register(
        new URL("./sw.js", document.baseURI),
        { scope: "./" },
      );
      await navigator.serviceWorker.ready;
      ctx.offlineReady = true;
      const badge = document.querySelector("#connection");
      if (badge) {
        badge.innerHTML = "<i></i>Offline bereit";
        badge.classList.add("cached");
      }
    } catch {
      toast(
        "Offline-Speicherung konnte noch nicht vorbereitet werden. Bitte später online erneut öffnen.",
      );
    }
  }
}

boot();
