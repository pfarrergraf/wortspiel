# Agentenübergabe

Stand: 2026-10-09. ChatGPT/Codex ist Integrator. Claude Code ist in dieser Umgebung **nicht aufrufbar und nicht gestartet**. Diese Prompts sind sofort verwendbare Aufträge; GitHub-Aufgaben: [NOISE-01](https://github.com/pfarrergraf/wortspiel/issues/17), [QA-A11Y](https://github.com/pfarrergraf/wortspiel/issues/18), [QA-DEVICES](https://github.com/pfarrergraf/wortspiel/issues/19), [A15-REVIEW](https://github.com/pfarrergraf/wortspiel/issues/20), [QA-STORAGE](https://github.com/pfarrergraf/wortspiel/issues/21). Nach einem Sitzungsneustart zuerst AGENTS, plan-v2 und integration-status lesen, dann aktuellen main-SHA prüfen. Backup `backup/main-2026-10-09` nicht verändern.

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

## QA-DEVICES – Geräte-/Offline-Abnahme, Claude Code, vorbereitet

Branch `v2/QA-DEVICES-matrix`; exklusiv `frontend/tests/browser/QA-DEVICES.spec.js`, `docs/reviews/QA-DEVICES.md`, Claim.

Prompt:

> Ergänze ohne zentrale Playwright-Config-Änderung gezielte Tests mit page.setViewportSize für Android-Tablet 800×1280 und 1280×800, 320×568, Querformat, iPad und Surface; bestehende elf Projekte bleiben erhalten. Teste klassische und freie Karte, Rotation mitten im Zug, Timer, Punkte/Historie, große Wertungstasten, Font-Lesen mit zwei Personen als gesonderte reale Aufgabe. Prüfe den Produktions-Service-Worker unter Unterpfad, Offline-Neustart, Manifest/Icon und blockierte Fremdrequests. Führe echte Gerätetests nur durch, wenn echte Geräte vorhanden sind; Simulation klar kennzeichnen. Änderungen an zentralem CSS/SW/Config als Integrationsbedarf dokumentieren. WebKit-Job erst vom Integrator hinzufügen lassen.

## A15-REVIEW – Sportpaket, Claude Code, vorbereitet

Branch `v2/A15-REVIEW-sports`; exklusiv `frontend/data/packs/sports-plus.json`, `frontend/tests/A15-REVIEW.test.mjs`, `docs/reviews/A15-REVIEW.md`, Claim.

Prompt:

> Prüfe die vorhandenen 120 Karten aus origin/v2/A15-sport, Commit 578761d, gegen aktuellen main. Übernimm nur die Paketquelle in deinen Worktree; gleiche alle normalisierten IDs mit jedem aktuellen Paket ab, erhalte vorhandene Metadaten und entferne keine IDs. Prüfe Inhalt/Alter/Tabuwort-Teilstrings; ähnliche Begriffsvarianten nur begründet retired. Berichte aktive/neue/Kategorie-Ergänzungs-IDs, Verteilungen und zehn Beispiele. npm run cards:check -- sports-plus und npm test ausführen. cards.json nur lokal regenerieren, niemals committen; Import und Pack-Reihenfolge sind Integrationsbedarf für ChatGPT. Keine anderen Pakete ändern.

## QA-STORAGE – Integrator, offen

Exklusiv beim Integrator, eigener Branch/Claim: storage.js, engine.js, main.js, Storage-Aktionen sowie `QA-STORAGE`-Tests/Fixtures. Konkurrenz mit anderen Agenten ausdrücklich ausgeschlossen.

Auftrag: ältere echte Struktur-Fixtures mit laufender Runde und mehreren Gruppen; Reservierung/Wertung bei konkurrierenden Tabs; localStorage-only mit und ohne Web Locks; verspätete Wertung muss die dargestellte Karten-/Session-ID prüfen. Kein Storage-Reset, keine schema-/ID-Änderung. Import invalid-after-valid muss Zustand komplett unverändert lassen (bereits Unit-geprüft). Export derzeit Gruppenhistorien; vollständige Partie-/Einstellungs-Sicherung additiv entwerfen und bestehende Backups weiter akzeptieren. Release erst nach diesen Nachweisen.

## MOBILE-02 / I18N-01 / DEPLOY-CF – Integrator, offen

- MOBILE-02: sinnvolle Themenbereiche, freiwillige Regeln-/Rollen-Einführung mit Beispiel und Proberunde; jederzeit Hilfe, erfahrene Nutzer nicht aufhalten.
- I18N-01: UI-Texte aus Regeln/Views lösen; uiLanguage und cardLanguage getrennt. Zunächst de unverändert, englische Karten nur eigenständig redaktionell geprüfte Quelle. IDs/Historien erhalten.
- DEPLOY-CF: Projektbestand prüfen, getestetes Preview und Origin-Migrationshinweis; Accountzugriff fehlt. Produktion/Domain/Legal erst nach konkreter Freigabe. Details in cloudflare-deployment.md.
- Android folgt erst nach Web-Abnahme; keine Kosten, Accounts oder Paket-Upgrades vor Bedarf.

## Prüfprotokoll und Übergabe

Basis-Audit 9a7a938; Karten 19be010; Regeln/UI 18a9f2e. Scroll-/Matrix-Korrektur `8aad640`; PR/Merge-SHA in integration-status.md. Vor Fortsetzung `git fetch origin` und exakten aktuellen Head prüfen; Änderungen anderer Entwickler nicht überschreiben. Jede fertiggestellte Aufgabe ergänzt tatsächliche Tests, Commit, PR und verbleibenden Bedarf. Vorbereitete Aufträge ohne Agentensitzung bleiben „vorbereitet“.
