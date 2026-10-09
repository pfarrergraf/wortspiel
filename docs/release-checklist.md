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
- [ ] Explizites Android-Tablet und WebKit/Safari-Engine.
- [ ] Gezielte ältere Spielstand-Fixtures mit laufender Runde, Punkten und mehreren Gruppen vollständig abgenommen.
- [ ] Konkurrierende Tabs und localStorage-Rückfall gegen doppelte Reservierung/stale Wertung geprüft und abgesichert.
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
