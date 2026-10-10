import { on } from "../events.js";
import { registerAction } from "../actions.js";
import { icon } from "./html.js";

// iOS and iPadOS have no `beforeinstallprompt`, so Safari users only learn
// about "Zum Home-Bildschirm" from us. Detection uses features, never the
// user agent: iPadOS reports itself as a Mac, so a Mac platform only counts
// when it also has a touch screen.
export const HINT_KEY = "wortspiel.iosHint.v1";

export function isIosLike(nav = globalThis.navigator, doc = globalThis.document) {
  if (!nav) return false;
  // Touch is required in every case, so desktop Safari on a Mac never matches.
  const touch = Boolean(doc && "ontouchend" in doc) || nav.maxTouchPoints > 1;
  const apple =
    nav.standalone !== undefined || /Mac|iPhone|iPad|iPod/.test(nav.platform || "");
  return touch && apple;
}

export function isStandalone(nav = globalThis.navigator, win = globalThis.window) {
  if (nav?.standalone === true) return true;
  try {
    return Boolean(win?.matchMedia?.("(display-mode: standalone)").matches);
  } catch {
    return false;
  }
}

// Shared text so the "install" dialog can reuse the same iOS steps.
export const iosInstallSteps =
  "<p><strong>iPhone / iPad:</strong> Öffne diese Adresse in Safari, tippe auf „Teilen“ und dann auf „Zum Home-Bildschirm“. Danach startest du ludeverbis über das neue Symbol – wie eine App, offline und mit sicherem Kartenspeicher.</p><p>Wichtig: Safari kann Website-Daten nach 7 Tagen ohne Nutzung löschen, wenn ludeverbis nicht auf dem Home-Bildschirm liegt. Als App bleibt euer Kartenspeicher erhalten.</p>";

function dismissed() {
  try {
    return localStorage.getItem(HINT_KEY) === "dismissed";
  } catch {
    return false;
  }
}

export function shouldShowHint() {
  return isIosLike() && !isStandalone() && !dismissed();
}

function hintHtml() {
  return `<aside class="ios-install-hint" role="note" aria-label="Tipp: ludeverbis installieren"><p><strong>Tipp fürs iPhone/iPad:</strong> Teilen → „Zum Home-Bildschirm“. Dann läuft ludeverbis wie eine App, offline und mit sicherem Kartenspeicher. <span>Ohne Installation kann Safari Website-Daten nach 7 Tagen ohne Nutzung löschen.</span></p><button type="button" data-action="dismiss-ios-hint" class="icon-button" aria-label="Hinweis ausblenden">${icon("close")}</button></aside>`;
}

registerAction("dismiss-ios-hint", (_id, button) => {
  try {
    localStorage.setItem(HINT_KEY, "dismissed");
  } catch {
    /* Private mode: hide for this page view only. */
  }
  button.closest(".ios-install-hint")?.remove();
});

on("render", ({ view }) => {
  if (view !== "setup" || !shouldShowHint()) return;
  const tabs = document.querySelector(".section-tabs");
  if (!tabs || document.querySelector(".ios-install-hint")) return;
  tabs.insertAdjacentHTML("afterend", hintHtml());
});
