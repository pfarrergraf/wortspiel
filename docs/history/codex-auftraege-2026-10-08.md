# Aufträge für Codex – Welle 1

Basis: Branch `main` ab Tag `v2-foundation`. Lies vor jedem Auftrag `AGENTS.md` und `docs/plan-v2.md`
(Abschnitt 0, „Verträge“ und die Zeile deiner Aufgabe). **Claude Code hat A01–A08, C1–C4, C7, C8 und E3 (Presenter/Tastatur) bereits erledigt.**
Diese IDs sind in `docs/claims/` reserviert, bitte nicht anfassen.

Jeder Auftrag ist ein eigener Codex-Task auf einem eigenen Branch. Erster Commit: `docs/claims/<ID>.md`
(Agent `codex`, Branch, Datum). Die Aufträge sind voneinander unabhängig und können gleichzeitig laufen.

## Prompt-Vorlage (für jeden Auftrag einsetzen)

```
Projekt Wortspiel. Lies AGENTS.md und docs/plan-v2.md (Abschnitt 0, Verträge, Zeile <ID>).
Aufgabe <ID>: <Titel>. Branch v2/<ID>-<kurzname> von main.
Erster Commit: docs/claims/<ID>.md (Agent: codex, Branch, Datum).
Ändere NUR: <Dateien>. Alles andere unter "Integrationsbedarf" im PR beschreiben.
Nicht committen: cards.json, package.json, package-lock.json, dist, docs/plan-v2.md.
Fertig, wenn: <Definition of Done>; cd frontend && npm test grün
(bei UI zusätzlich npm run build && npm run test:e2e).
PR-Beschreibung: geänderte Dateien, Testergebnis, Integrationsbedarf.
```

## Logik (rein, testbar) – sofort startbar

| ID | Titel | Dateien | Definition of Done |
| --- | --- | --- | --- |
| B1 | Altersfilter | `frontend/src/rules/audience.js`, `frontend/tests/B1.test.mjs` | `matchesAudience(card, settings)`: `settings.ageGroup` null/undefined → alle Karten; sonst `(card.ageMin ?? 14) <= ageGroup`. `card.retired === true` → immer `false`. Zusätzlich exportiert: `AGE_GROUPS` (`[{id:6,name:"Kinder ab 6"}, 8, 10, 12, 14, null = "Alle"]`), `validateAgeGroup(value)` (wirft deutsche Fehlermeldung), `migrateAudience(state)` (`settings.ageGroup ??= null`, Session ebenso). Tests decken Standardwert 14, retired und alle Stufen ab. Einhängen in `validateSettings` und Boot-Migration → Integrationsbedarf. |
| B2 | Tabu-Stufen | `frontend/src/rules/taboo.js`, `frontend/tests/B2.test.mjs` | `visibleTaboo(card, settings)`: `tabooMode` `classic`/fehlend → alle, `light` → die ersten 3, `none` → `[]`. Exporte: `TABOO_MODES` (id, name, Beschreibung auf Deutsch: „Klassisch“, „Leicht – 3 Tabuwörter“, „Frei erklären – ohne Tabuwörter“), `tabooLabel(settings)` → `"Tabuwort"` bzw. bei `none` `"Wort gesagt"`, `validateTabooMode`, `migrateTabooMode(state)` (`??= "classic"`, auch Session). |
| B4 | Statistik | `frontend/src/rules/stats.js`, `frontend/tests/B4.test.mjs` | `sessionStats(session)` → `{ perTeam: [{correct, taboo, skip, points}], bestTurn: {team, cycle, points} | null, tabooKing: teamIndex | null, totalCards }`. Robust bei leeren Partien und Gleichständen (dann `null`). Nur aus vorhandenen `session.turns` berechnen, nichts im State ändern. |
| B5 | Spielmodi-Logik | `frontend/src/rules/modes.js`, `frontend/tests/B5.test.mjs` | `MODES` (`explain`, `pantomime`, `draw`, `oneword` mit deutschem Namen und Kurzregel). `pickMode(card, settings, random)`: aus `settings.modes` (fehlend → `["explain"]`), `pantomime`/`draw` nur für `difficulty` easy/medium, sonst Rückfall auf `explain`. `random` wird höchstens einmal aufgerufen und nur wenn mehr als ein Modus möglich ist (damit bestehende Tests mit festem `random` gleich bleiben). `validateModes`, `migrateModes`. |
| D1 | Sound-Engine | `frontend/src/sound.js`, `frontend/tests/D1.test.mjs` | Synthetisierte Klänge per Web Audio für die Ereignisse `correct`, `skip`, `taboo`, `tick` (letzte 10 s, einmal pro Sekunde, Tonhöhe steigt), `countdown`, `turnEnd`, `win`. Reagiert nur auf `on(...)` aus `src/events.js` (render, result, turn-start, turn-end, tick); `toggle-sound` bleibt. `settings.volume` (Standard 0.8) und `settings.tick` (Standard true) beachten. Ein gemeinsamer `AudioContext`, beim ersten `pointerdown` entsperren (iOS). Klang-Definitionen als reine Daten exportieren und im Test mit einem Fake-AudioContext prüfen. Keine Audiodateien. |
| E2 | Wake Lock | `frontend/src/wakelock.js` | Bildschirm bleibt an, solange `ctx.state.session.phase === "playing"` (über `on("render")`). Freigeben bei Pause, Ende und `visibilitychange`, wieder anfordern bei Rückkehr. Ohne `navigator.wakeLock` still. Import in `main.js` → Integrationsbedarf. |

## Wortpakete A09–A17 – sofort startbar

Je Paket nur `frontend/data/packs/<paket-id>.json` anlegen. Format, Pflichtfelder und **Qualitätsregeln**
stehen in `docs/plan-v2.md` (Paket A) und `frontend/data/packs/README.md`. Prüfen mit
`cd frontend && npm run cards:check -- <paket-id>` (muss „Keine Fehler.“ melden).

| ID | Paket-ID | Kategorie | Ziel |
| --- | --- | --- | --- |
| A09 | `future` | neu: 🚀 Technik, KI & Zukunft (`blue`) | 110 |
| A10 | `planet` | neu: 🌱 Natur & Umwelt (`mint`) | 100 |
| A11 | `camp` | neu: 🏕️ Freizeit, Camp & Fahrten (`yellow`) | 100 |
| A12 | `kids` | neu: 🧸 Kinderwelt (`pink`), `ageMin` 6–8, mit `emoji` je Karte | 200 |
| A13 | `fantasy` | neu: 🐉 Fantasy & Märchen (`purple`) | 100 |
| A14 | `tv-plus` | Erweiterung `{ "id": "tv" }` | 150 |
| A15 | `sports-plus` | Erweiterung `{ "id": "sports" }` | 120 |
| A16 | `food-plus` | Erweiterung `{ "id": "food" }` | 80 |
| A17 | `faith-plus` | Erweiterung `{ "id": "faith" }` | 80 |
