# CF-1 – Pages-Redirect, Offlinecache und CSP

Codex-Integrationsbedarf aus Claude PR #23; getrennt von dessen Konto-/Hostingauftrag. Branch `v2/CF-1-offline`, Claim `docs/claims/CF-1.md`. Kein Cloudflare-Konto aufgerufen, kein Projekt/Deployment angelegt, keine DNS-/Domainänderung.

## Belegte Fehler und Korrektur

Drei neue Desktopfälle reproduzierten vor der Änderung Fehler: Cloudflare normalisiert `/index.html` mit 308 auf `/`; ein so umgeleiteter Cacheeintrag scheitert bei Offline-Navigation. `_headers` und `_redirects` werden auf Pages nicht ausgeliefert und dürfen die Installation via `cache.addAll` nicht verhindern. `script-src 'self'` verhindert den bisherigen Inline-onclick des Startup-Neuladen-Buttons.

Der Generator hasht weiterhin sämtliche Produktionsdateien einschließlich HTML und Hostkonfiguration. Nur die Netzwerk-Precache-Liste lässt index.html und Hostkonfiguration aus. Nach dem Precache wird ein gleichlautender, nicht umgeleiteter index.html-Cachealias aus der kanonischen Rootantwort erstellt. Root und Unterpfad bleiben unterstützt; Offline-Navigationsfallback verwendet den Scope-Root. Keine Spielstände/Kartenhistorien werden vom Worker verändert.

Der Retry-Button erhält einen Eventlistener statt Inline-JavaScript. `_headers` enthält CSP mit lokalen Scripts/Fonts/Requests, nosniff, no-referrer, Frame-Sperre, restriktive Permissions-Policy mit ausdrücklich weiterhin erlaubtem lokalen Mikrofon und HID; SW no-cache, gehashte Assets immutable. Dynamische bestehende Styles benötigen weiterhin style-src unsafe-inline. GitHub Pages ignoriert diese Pages-Konfiguration. Keine pauschale robots/noindex-Entscheidung und keine erfundenen Rechtstexte.

## Ausgeführte Prüfungen

- Neue Generator-Unitfälle: Hostdateien nicht gefetcht, kanonische Rootliste, HTML- und Header-Änderung wechseln jeweils Cacheversion.
- Zwischenstand: 109 Unit grün, Produktionsbuild grün; 10 gezielte Desktopfälle grün (3 CF-1 plus Claudes 7 Geräte-/Offline-/SW-Update-Fälle).
- Zusätzlicher echter **lokaler Wrangler-Pages-Simulator 4.149.0**, ohne Cloud-API: 320×568 Chromium; tatsächliche Header/CSP, SW no-cache, 308 index.html, nicht umgeleiteter Cachealias, keine Hostkonfig-Cacheeinträge. Korrekte Wertung und Pause; offline Root, index.html und Homescreen-Query bewahren Punkte, aktuelle Karte und Historien. Startup-Retry unter tatsächlicher CSP bewahrt absichtlich beschädigte Originaldaten. Ergebnis PASS. Wrangler wurde außerhalb des Repos installiert, keine Lockfile-/Dependencyänderung.
- Gesamtsuite nach Integration des aktualisierten QA-STORAGE-Pakets: **109 Unit und 196 Browser bestanden, keine skips**, cards:check und Build erfolgreich. Exakte CI: verbindliches Ergebnis im Abschlusskommentar des CF-1-PR. Erst grüne Gesamtprüfung erlaubt main-Integration.

## Grenzen / Übergabe an Claude

Lokaler Simulator ist kein echtes Cloudflare-Preview, kein HTTPS-/Kontozugriffsbeleg und kein Zwei-Personen-Lesbarkeitstest. Claude besitzt weiterhin Cloudflare-Deployment-Dokument, Account-/Projektinventar und Preview-Auftrag. Ein verbundener Workers-Connector belegt keinen Pages-Zugriff oder fehlendes Pages-Projekt. Reale Geräte/Mikrofon/WebKit, Origin-Export/Import im tatsächlichen Preview sowie Freigabe für neue Rechte/erstmalige Produktion/Legal bleiben offen.

HTML und Header müssen im Hash bleiben; index.html-Alias bleibt für installierte Startadressen verwendbar. GitHub-Pages-Rückfall und Sourcebranches werden erhalten. Im Fehlerfall normalen Revert des Integrationscommits bauen und veröffentlichen; keinerlei Browser-Speicher zurücksetzen.

Der erneute QA-STORAGE-Review führte vor main-Merge zu weiteren Schutzprüfungen in d7a4858: beide Revisionsrichtungen, gültige Nullrevision und Zählergrenzen. Das Paket wurde anschließend nachgezogen; die 109/196-Abnahme ist damit ein Zwischenstand. Finale 109/214-Abnahme und exakte CI werden im PR-Abschlusskommentar dokumentiert. Keine Integration der erkannten fehlerhaften Zwischenstände.

## Fortsetzung 2026-10-10

Claude hat mit separater Nutzerfreigabe das Direct-Upload-Pages-Projekt wortspiel-app und öffentliche Previews erstellt; PR #23 ad7b895 ist nach Review/grüner CI als main 2eedbea integriert. Codex prüfte den öffentlichen Patch-Preview unabhängig per HTTPS/200 und Sicherheitsheadern; Produktion lieferte 404. Kein eigener Konto-/Tokenzugriff. Für die vollständige Konto-/Onlineprüfung gelten Claudes dokumentierte Belege; dessen uncommitteter Patch-Preview ist kein finaler Release.

Die letzten Storage-Review-Repros (stale Ende-Dialog und Reset-Abstammung) waren sechsfach rot und nach Fix 69 gezielte Desktopfälle grün. CF-1 zieht QA-STORAGE 0ff6c6c nach; finale Sollsuite jetzt 109 Unit/226 Browser. Lokale unterbrochene Langläufe werden nicht als bestanden ausgegeben. Der Hostinghinweis nennt nun den jeweiligen Website-Hoster, ohne Rechtstexte zu erfinden. Finaler CI-/Merge-Nachweis im PR-Abschlusskommentar. Nach Integration übernimmt Claude das Preview des exakten main-SHA und wiederholt die Online-Abnahme; keine Produktion ohne Freigabe.

## Vollständige Abstammungsprüfung – 2026-10-10

QA-STORAGE 178b2d2 nachgezogen: vollständige Spielstand-Konsistenz statt reiner Seen-Mengen/Revisionsauswahl; additive kompakte Storage-Provenienz, keine Nutzdaten-Duplizierung. Alte Zähler-/Session-/Undo-Forks bleiben erhalten; lokaler Rückfall hebt Pending niemals allein nach Zähler auf. Zehn neue Repros waren vor Fix rot; 83 gezielte Desktopfälle danach grün, plus DB-only-Legacy- und Zukunftsmarker-Prüfung. Bestehende Difficulty-Migration bleibt unverändert geprüft. Finale Sollsuiten 107 Unit/252 Browser bzw. CF-1 109 Unit/258 Browser; tatsächliche Ergebnisse/CI/Review/Merge im PR-Abschlusskommentar. Ein unveränderter alter App-Tab besitzt nicht die neue Schreibkoordination: vor Release-Wiederaufnahme alte App-Tabs beenden, keine unklaren Kopien automatisch überschreiben. Der letzte stabile main bleibt bis Abnahme unverändert geschützt.
