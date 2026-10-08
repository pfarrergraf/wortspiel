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
// Features register their actions and event listeners on import.
import "./features/game-actions.js";
import "./features/setup-actions.js";
import "./features/storage-actions.js";
import "./features/speech-actions.js";
import "./features/info.js";
import "./ui/install-hint.js";
import "./sound.js";
import "./haptics.js";
import "./shortcuts.js";
import "./device.js";
import "./wakelock.js";

installActions();

window.addEventListener("storage", (event) => {
  if (event.key === "wortspiel.state.v1" && !ctx.busy) {
    try {
      const fresh = JSON.parse(event.newValue);
      if (fresh?.schema === 1 && fresh.revision > ctx.state.revision) {
        ctx.state = fresh;
        store.state = fresh;
        render();
      }
    } catch {
      /* Ignore unrelated or malformed writes. */
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
    render();
  } catch (error) {
    document.querySelector("#app").innerHTML =
      `<main class="startup-error"><h1>Der Kartenspeicher braucht Platz.</h1><p>${escape(error.message)}</p><p>Bitte erlaube Website-Speicher und lade die Seite erneut.</p><button onclick="location.reload()" class="button primary">Erneut versuchen</button></main>`;
    return;
  }
  if ("serviceWorker" in navigator && import.meta.env.PROD) {
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
