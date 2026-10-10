# Release-Abnahme

Ein Integrationscommit mit grüner CI ist noch kein vollständiger Release. Stabile Versionsnummer/Release-Tag erst nach allen Pflichtprüfungen. Testergebnisse und URLs werden in integration-status.md festgehalten.

## Automatisch geprüft in diesem Paket

- [x] Regeln, Wertung, Strafen, Zeitgrenze, Kartenauswahl, Undo, unveränderliche Historie.
- [x] Bestehende Migrationen, v1/v2-ID-Fixtures, alte Erklärung und Pantomime kompatibel.
- [x] Vollständige Importvalidierung vor Mutation, merge statt Reset, Gruppenexport.
- [x] Neues Spiel und Replay mit Session-Snapshot; Ersatz einer laufenden Partie nur nach Bestätigung.
- [x] Moduswechsel, free/none-Konsistenz, Altersfilter, Presets, Pantomime-Punkte.
- [x] Formularpflichtfelder, Assistent vor/zurück, Browser-Zurück, Suchfilter und fortbestehende Kategorien.
- [x] Vorhandene Offline-/Service-Worker-/PWA-/Browser-Neustart-Tests.
- [x] Sound/Wake-Lock-Tests, Tastatur/Presenter, simuliertes WebHID inklusive Lern-Race.
- [x] Bestehende elf Bildschirmgrößen einschließlich 320×568, 375×667, 393×852, Querformat, iPad, Surface, Notebook, Monitor; freie Erklärung zusätzlich pro Projekt.
- [x] Explizites Android-Tablet hoch/quer, Rotation, Browser-Neustart und SW-Update (Claude PR #22; Simulation).
- [ ] WebKit/Safari-Engine.
- [x] Historische schema-1-Fixtures mit laufender/pausierter Runde, Punkten, drei Teams/Gruppen, retired IDs und Pantomime geprüft (synthetisch mit damaligen Engines erzeugt; QA-STORAGE).
- [x] Konkurrierende Tabs und IndexedDB/localStorage mit/ohne Web Locks gegen doppelte Reservierung/stale Wertung geprüft; fehlgeschlagene Mutationen/Quota/Formate erhalten Daten (QA-STORAGE).
- [x] Persistente Schreibmarkierung schützt veralteten Rückfall bei fehlgeschlagener DB-Spiegelung; koordinationsloser Zugriff scheitert vor Commit, alter Fork bleibt erhalten; frischer schreibfreier Export (PR #24).
- [x] Pages-308/Hostdateien/CSP lokal und im Wrangler-Simulator geprüft; Offline Root/index/Query erhält Runde/Historie (PR #25).
- [ ] Geführte explizite Wiederherstellung nach abruptem Absturz im Browser ohne Web Locks; nie automatische fremde Ticket-Löschung.
- [ ] Unterstützte lokale Spracherkennung end-to-end mit Browser-Mock und tatsächlich unterstütztem Browser geprüft. Bis dahin experimentell/off by default.

## Reale Geräte und redaktionelle Abnahme

- [ ] Zwei nebeneinandersitzende Personen lesen klassische Karte gleichzeitig auf kleinem Smartphone; echte Lesbarkeit aller Tabuwörter und sichere Wertung.
- [ ] iPhone Safari/Home-Bildschirm, Android-Handy, iPad hoch/quer, Android-Tablet, Surface mit/ohne Tastatur, Notebook, Monitor.
- [ ] Drehung im Zug, Touch-Ziele, große Schrift, Safe Areas, Bildschirmtastatur, Zoom, Fokus und Screenreader.
- [ ] Echter Logitech-Presenter/Spotlight; Pause/Undo/Hilfe und Umleitung beim Trennen.
- [ ] Karteninhalt, Altersangaben und Geräuscheraten praktisch geprüft; unfertige Varianten außerhalb des Releases.

## Veröffentlichung

- [ ] Grüner exakter Release-Commit in Node-22-CI, sämtliche Pflichtprüfungen ohne ungeklärte skips/failures.
- [ ] GitHub Pages erfolgreich online/offline; Rückfall-SHA und Wiederherstellung dokumentiert.
- [ ] Cloudflare-Projektbestand verifiziert, Preview erstellt, online Geräte-/Origin-Migrations-/Offline-Abnahme.
- [ ] HTTPS, Sicherheits-Header, SW-Update und PWA-Installation auf Preview geprüft.
- [ ] Verständlicher Export-/Import-Hinweis beim Originwechsel; laufende Spiele nicht als exportierbar bewerben.
- [ ] Impressum, Datenschutz, GPL-/Drittanbieterhinweise final geprüft; rechtliche Freigabe durch Verantwortlichen.
- [ ] Einmalige Freigabe für neue Kontoberechtigung/erstmalige Cloudflare-Produktion; keine DNS-/Domainänderung ohne Freigabe.
- [ ] Stabiler Release-Tag am geprüften SHA, Version und Release-Notizen; danach Android-Planung.

Offene Häkchen sind bewusst offene Arbeit, keine stillschweigend erfolgreiche Abnahme.


## Verbindlicher Core-Stand 2026-10-10 – 4782a1e

QA-STORAGE #24 und CF-1 #25 bleiben bis vollständiger Abnahme außerhalb von main. 107 Unit/Karten/Build und 98 gezielte Desktopfälle bestanden. Neue Fälle sichern unbekannte Pending-Versionen/Zusatzfelder, ausschließlich dokumentierte Difficulty-Defaults und den realen storage-Eventpfad: fremde rohe Snapshots werden erst gegen die bekannte Basis validiert. Drei echte UI-Repros vor Fix rot, nach Fix grün. Das neue künstliche Pending-Testfixture wartet nun auf den abgeschlossenen Bedienvorgang; keine Assertions abgeschwächt. Zwischenstand #24 178b2d2 bestand lokal 252 Browser, aber CI nur 250/252 wegen dieses Testablaufs; #25 fff08d2 bestand lokal und in CI 38044459172 alle 258 Browser. Diese Belege sind keine Freigabe der neueren Version.

Aktuelle Sollsuiten: #24 107 Unit/278 Browser, #25 109 Unit/284 Browser. Vollständige lokale Ergebnisse, exakte CI und Merge-SHAs im Abschlusskommentar der jeweiligen PR. main ist weiterhin 2eedbea; Rückfall backup/main-2026-10-10-pre-core. Claude-Dokumente/Tests bleiben unverändert; nach tatsächlicher Core-Integration übernimmt Claude das unveränderte finale main-Build ins Preview und dokumentiert dessen Online-Abnahme. Keine öffentliche Produktion/DNS/neuen Berechtigungen/Release-Tag ohne erforderliche Abnahme und Freigabe.
