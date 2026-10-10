import { ctx } from "../app.js";
import { icon, action } from "./html.js";
import { isNativeApp } from "../native.js";

export function chrome() {
  const { offlineReady } = ctx;
  return `<header class="site-header"><a href="#" data-action="home" class="brand" aria-label="ludeverbis Startseite"><span class="brand-icon" aria-hidden="true"><i></i><b>•••</b></span><span>ludeverbis<span class="brand-dot">.</span></span></a>
    <div class="header-actions"><span class="connection ${offlineReady ? "cached" : ""}" id="connection"><i></i>${offlineReady ? "Offline bereit" : navigator.onLine ? "Online" : "Offline"}</span>${isNativeApp() ? "" : action("install", `${icon("download")}<span>App installieren</span>`, "small-button install-button")}${action("help", icon("help"), "icon-button", 'aria-label="Spielregeln öffnen"')}</div></header>`;
}

export function footer() {
  return `<footer class="site-footer"><span>Weniger Bildschirm. Mehr Miteinander.</span><div><a href="./projekt.html" data-action="project-page:projekt.html">Über das Projekt</a><a href="./unterstuetzen.html" data-action="project-page:unterstuetzen.html">Unterstützen</a><a href="./impressum.html" data-action="project-page:impressum.html">Impressum</a><a href="./datenschutz.html" data-action="project-page:datenschutz.html">Datenschutz</a><a href="https://github.com/pfarrergraf/wortspiel" target="_blank" rel="noopener">Quellcode</a><button type="button" data-action="about">Karten & Datenschutz</button></div></footer>`;
}
