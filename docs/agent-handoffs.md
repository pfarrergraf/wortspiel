# Agentenübergabe

Stand: 2026-10-09. ChatGPT/Codex ist Integrator. Der Nutzer hat eine externe Claude-Code-Sitzung gestartet und Cloudflare-Vorbereitung/Veröffentlichung nach Freigabe an Claude delegiert; Claude ist in dieser Codex-Umgebung weiterhin nicht direkt aufrufbar. Tatsächliche Claims: QA-DEVICES auf `v2/QA-DEVICES-matrix` (PR #22), DEPLOY-CF auf `v2/DEPLOY-CF-preview` (PR #23); Codex QA-STORAGE auf `v2/QA-STORAGE-safety` (#21). Vorbereitet ist nicht gleich gestartet; GitHub-Aufgaben: [NOISE-01](https://github.com/pfarrergraf/wortspiel/issues/17), [QA-A11Y](https://github.com/pfarrergraf/wortspiel/issues/18), [QA-DEVICES](https://github.com/pfarrergraf/wortspiel/issues/19), [A15-REVIEW](https://github.com/pfarrergraf/wortspiel/issues/20), [QA-STORAGE](https://github.com/pfarrergraf/wortspiel/issues/21). Nach einem Sitzungsneustart zuerst AGENTS, plan-v2 und integration-status lesen, dann aktuellen main-SHA prüfen. Backup `backup/main-2026-10-09` nicht verändern.

## Gemeinsamer Startvertrag

Jeder Auftrag von aktuellem main in einem eigenen Worktree: `git worktree add -b v2/<ID>-<slug> ../wortspiel-<ID> origin/main`. Zuerst `docs/claims/<ID>.md` mit Agent, Branch, Basis-SHA, Datum und exklusiven Dateien committen. Eine schon beanspruchte ID nicht doppelt verwenden. Npm-Lockfiles/Kernmodule/Setup/CI/Plan gehören dem Integrator. Tests erhalten eigene Dateinamen. Kein Zurücksetzen von Karten, kein Force-Push. `cd frontend && npm ci && npm test`; UI zusätzlich build und E2E auf eigenem PW_PORT. PR nach main mit Tests, SHAs, Risiken und Integrationsbedarf; keine Selbstintegration in main.

## NOISE-01 – Geräuscheraten, Claude Code, vorbereitet

Branch `v2/NOISE-01-pool`; exklusiv `frontend/data/noises-de.json`, `frontend/src/rules/noises.js`, `frontend/tests/NOISE-01.test.mjs`, `docs/reviews/NOISE-01.md`, Claim.

Prompt:

> Entwickle einen isolierten Geräuscheraten-Pool mit 160 sorgfältig ausgewählten deutschen Begriffen: Tiere, Fahrzeuge, Maschinen, Natur, Haushalt, Alltag und Geräuschsituationen. Ohne Wörter und ohne Gesten darstellbar; keine nur visuell identifizierbaren Marken/Personen. Pro Karte explizite stabile ID `de:noises:<normalisiert>`, Begriff, Kategorie, redaktionell begründete ageMin und Schwierigkeit. IDs nach Vergabe nicht ändern. Modul als reine Daten-/Validierungs-/Auswahlfunktionen, ohne app/engine/storage-Import und ohne DOM. Tests prüfen eindeutige IDs, Format, Kategorien, Alterswerte und Sperre gesehener IDs. Dokumentiere mindestens 20 spielerisch überprüfbare Beispiele, fragliche Begriffe und praktischen Erprobungsplan. Keine Einbindung in data.js, gameMode, Engine, UI oder Build; dies bleibt Integrationsbedarf. Öffne PR nach main; erst nach Review und praktischer Prüfung wird der Modus eingebunden.

Abnahme: 150–200 geeignete aktive Karten, Format/Tests grün, vorhandene Karten-IDs und Speicher völlig unverändert. Redaktionelle praktische Prüfung bleibt ausdrücklich offen, wenn kein Spieltest stattfand.

## QA-A11Y – Barrierefreiheit, Claude Code, vorbereitet

Branch `v2/QA-A11Y-review`; exklusiv `frontend/tests/browser/QA-A11Y.spec.js`, `docs/reviews/QA-A11Y.md`, Claim.

Prompt:

> Prüfe Schnellstart, Guided- und vollständiges Formular, Spielfläche und Dialoge mit Tastatur und Browser-Accessibility-Informationen. Ergänze gezielte Tests für sichtbaren Fokus, Labels, Reihenfolge, native ungültige Pflichtfelder, Hilfe/Pause, Dialog-Escape, reduced-motion und mindestens 44px Touch-Ziele. Dokumentiere messbare Kontrastbefunde, zwei Personen lesende klassische Karte und nicht automatisch prüfbare Grenzen. Keine bestehenden Tests deaktivieren und keine CSS-/UI-/Kernmodule ändern; notwendige Reparaturen mit Datei/Zeile/Repro und Akzeptanz im PR unter Integrationsbedarf melden. Keine neue Dependency. npm test, build und eigene Browserfälle auf isoliertem Port ausführen, Ergebnis ehrlich festhalten.

## QA-DEVICES – Geräte-/Offline-Abnahme, Claude Code, automatischer Teil integriert

Branch `v2/QA-DEVICES-matrix`; exklusiv `frontend/tests/browser/QA-DEVICES.spec.js`, `docs/reviews/QA-DEVICES.md`, Claim.

Prompt:

> Ergänze ohne zentrale Playwright-Config-Änderung gezielte Tests mit page.setViewportSize für Android-Tablet 800×1280 und 1280×800, 320×568, Querformat, iPad und Surface; bestehende elf Projekte bleiben erhalten. Teste klassische und freie Karte, Rotation mitten im Zug, Timer, Punkte/Historie, große Wertungstasten, Font-Lesen mit zwei Personen als gesonderte reale Aufgabe. Prüfe den Produktions-Service-Worker unter Unterpfad, Offline-Neustart, Manifest/Icon und blockierte Fremdrequests. Führe echte Gerätetests nur durch, wenn echte Geräte vorhanden sind; Simulation klar kennzeichnen. Änderungen an zentralem CSS/SW/Config als Integrationsbedarf dokumentieren. WebKit-Job erst vom Integrator hinzufügen lassen.

## A15-REVIEW – Sportpaket, Claude Code, vorbereitet

Branch `v2/A15-REVIEW-sports`; exklusiv `frontend/data/packs/sports-plus.json`, `frontend/tests/A15-REVIEW.test.mjs`, `docs/reviews/A15-REVIEW.md`, Claim.

Prompt:

> Prüfe die vorhandenen 120 Karten aus origin/v2/A15-sport, Commit 578761d, gegen aktuellen main. Übernimm nur die Paketquelle in deinen Worktree; gleiche alle normalisierten IDs mit jedem aktuellen Paket ab, erhalte vorhandene Metadaten und entferne keine IDs. Prüfe Inhalt/Alter/Tabuwort-Teilstrings; ähnliche Begriffsvarianten nur begründet retired. Berichte aktive/neue/Kategorie-Ergänzungs-IDs, Verteilungen und zehn Beispiele. npm run cards:check -- sports-plus und npm test ausführen. cards.json nur lokal regenerieren, niemals committen; Import und Pack-Reihenfolge sind Integrationsbedarf für ChatGPT. Keine anderen Pakete ändern.

## QA-STORAGE – Integrator, offen

Aktiv beim Integrator: `v2/QA-STORAGE-safety`, Claim `docs/claims/QA-STORAGE.md`, Basis `9c1d9d6`, eigener PW_PORT=4211. Exklusiv: storage.js, engine.js, main.js, Storage-Aktionen sowie `QA-STORAGE`-Tests/Fixtures. Konkurrenz mit anderen Agenten ausdrücklich ausgeschlossen.

Auftrag: ältere echte Struktur-Fixtures mit laufender Runde und mehreren Gruppen; Reservierung/Wertung bei konkurrierenden Tabs; localStorage-only mit und ohne Web Locks; verspätete Wertung muss die dargestellte Karten-/Session-ID prüfen. Kein Storage-Reset, keine schema-/ID-Änderung. Import invalid-after-valid muss Zustand komplett unverändert lassen (bereits Unit-geprüft). Export derzeit Gruppenhistorien; vollständige Partie-/Einstellungs-Sicherung additiv entwerfen und bestehende Backups weiter akzeptieren. Release erst nach diesen Nachweisen.

## MOBILE-02 / I18N-01 / DEPLOY-CF – Integrator, offen

- MOBILE-02: sinnvolle Themenbereiche, freiwillige Regeln-/Rollen-Einführung mit Beispiel und Proberunde; jederzeit Hilfe, erfahrene Nutzer nicht aufhalten.
- I18N-01: UI-Texte aus Regeln/Views lösen; uiLanguage und cardLanguage getrennt. Zunächst de unverändert, englische Karten nur eigenständig redaktionell geprüfte Quelle. IDs/Historien erhalten.
- DEPLOY-CF: Projektbestand prüfen, getestetes Preview und Origin-Migrationshinweis; Claude hat Workers-Zugriff, aber keine Pages-Tools; Pages-Projektbestand unbekannt. Produktion/Domain/Legal erst nach konkreter Freigabe. Details in cloudflare-deployment.md.
- Android folgt erst nach Web-Abnahme; keine Kosten, Accounts oder Paket-Upgrades vor Bedarf.

## Prüfprotokoll und Übergabe

Basis-Audit 9a7a938; Karten 19be010; Regeln/UI 18a9f2e. Scroll-/Matrix-Korrektur `8aad640`; PR/Merge-SHA in integration-status.md. Vor Fortsetzung `git fetch origin` und exakten aktuellen Head prüfen; Änderungen anderer Entwickler nicht überschreiben. Jede fertiggestellte Aufgabe ergänzt tatsächliche Tests, Commit, PR und verbleibenden Bedarf. Vorbereitete Aufträge ohne Agentensitzung bleiben „vorbereitet“.

## Aktive Übergabe 2026-10-09

- Claude hat Geräte-/Offline-/SW-Update-Tests als PR #22 und Cloudflare-Simulationsbefunde als PR #23 geliefert. PR #22 ist nach Review und grüner CI in main `35389e3` integriert; PR #23 wartet auf präzise Darstellung des unbekannten Pages-Bestands. Deren neue Test-/Review-/Cloudflare-Dateien werden während des Reviews nicht parallel verändert.
- Codex QA-STORAGE behebt stale Wertungen und tabübergreifendes Speichern, prüft historische Engine-Fixtures sowie unbekannte Speicherformate und Quota/Abbruch. Bekannte Grenzen: optionaler Vollbackup ist bislang Entwurf; ohne Web Locks kann ein abrupt abgestürzter Schreiber ein nicht ablaufendes Koordinationsticket hinterlassen (sicherer Abbruch statt Überschreiben).
- CF-1 aus PR #23: Redirect `/index.html` und nicht ausgelieferte `_headers` müssen im SW berücksichtigt werden. Codex übernimmt diesen Kern-/Build-Integrationsbedarf als separates Paket; Cloudflare-Konto/Preview verbleibt bei Claude. Kein neues Hosting ohne Freigabe.
- QA-A11Y/NOISE/A15 laufen nur, wenn ihr neuer Claim/PR dies belegt. Die Prompts oben bleiben für unabhängige Arbeit verfügbar.

- QA-STORAGE PR #24: Nach zunächst 107 Unit/170 Browser grün belegten Spiegelungsfehler behoben. Persistente Pending-Markierung verhindert stale localStorage-Forks; fehlende Koordinationsberechtigung bedeutet sicheren Abbruch. Export liest schreibfreien frischen Snapshot. Pending-Markierung niemals manuell löschen. Vollbackup und geführte Absturz-Reparatur bleiben Folgepakete; finale Tests/CI im PR.

- Abschlussbelege: QA-STORAGE PR #24, Head 1e162fb: 107 Unit/190 Browser lokal und CI grün. CF-1 PR #25: 109 Unit/196 Browser lokal grün, zusätzlicher Wrangler-Pages-Simulator bestanden; keine Cloud-API benutzt. Merge-SHAs/exakte finale CI im jeweiligen PR-Abschlusskommentar. Claudes PR #23 wartet weiterhin auf präzise Unbekannt-Markierung des Pages-Projektbestands.

## Aktuelle Übergabe 2026-10-10

- Claude DEPLOY-CF PR #23 ad7b895 nach Review und CI integriert, main 2eedbea; Pages-Projekt wortspiel-app/öffentliche Previews nach separater Nutzerfreigabe, Produktion weiterhin nicht veröffentlicht. Konto-/Hostingdateien bleiben Claude vorbehalten.
- Codex PR #24/25 enthalten die belegten Ende-Dialog- und Reset-Korrekturen; 69 gezielte Desktopfälle grün. Finale Sollsuiten 107 Unit/220 Browser bzw. 109 Unit/226 Browser, CI/Merge-Nachweis im jeweiligen Abschlusskommentar. Alle roten Review-Zwischenstände blieben außerhalb von main.
- **Direkter Folgeauftrag für Claude:** Nach Merge #24/#25 main-SHA und grüne CI aus den Abschlusskommentaren verwenden, unverändert bauen, als preview-<sha> zu wortspiel-app hochladen, tatsächlichen commit-hash protokollieren. Online-Abnahme aus cloudflare-deployment.md wiederholen, besonders Offline Root/index/Query, SW-Update vom alten Preview, Legacy-Gruppenimport, drei Modi, CSP/HTTP-Header; keine abgespeckte Testfassung/kein uncommitteter Patch als Releasebeleg. Produktion/DNS/neue Rechte/Rechtliches bleiben freigabepflichtig. Kein eigenes SW-/Storage-/Info-Modul editieren.

- Aktueller Core-Nachtrag 178b2d2: vollständige Spielstand-Konsistenz/Abstammung, unveränderte Difficulty-Migration, keine lokale Pending-Löschung nach Zähler. Finale Sollsuiten #24 107 Unit/252 Browser, #25 109 Unit/258 Browser. Vor Release-Wiederaufnahme ältere App-Tabs beenden; unklare Kopien nicht automatisch überschreiben. Verbindliches Ergebnis und main-SHA im Abschlusskommentar.
