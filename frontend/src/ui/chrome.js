import { ctx } from "../app.js";
import { icon, action } from "./html.js";

export function chrome() {
  const { offlineReady } = ctx;
  return `<header class="site-header"><a href="#" data-action="home" class="brand" aria-label="Wortspiel Startseite"><span class="brand-icon" aria-hidden="true"><i></i><b>•••</b></span><span>wortspiel<span class="brand-dot">.</span></span></a>
    <div class="header-actions"><span class="connection ${offlineReady ? "cached" : ""}" id="connection"><i></i>${offlineReady ? "Offline bereit" : navigator.onLine ? "Online" : "Offline"}</span>${action("install", `${icon("download")}<span>App installieren</span>`, "small-button install-button")}${action("help", icon("help"), "icon-button", 'aria-label="Spielregeln öffnen"')}</div></header>`;
}

export function footer() {
  return `<footer class="site-footer"><span>Weniger Bildschirm. Mehr Miteinander.</span><div><a href="https://github.com/pfarrergraf/wortspiel" target="_blank" rel="noopener">Quellcode</a><button type="button" data-action="about">Karten & Datenschutz</button><span>Made for gute Runden ✦</span></div></footer>`;
}
