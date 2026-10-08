# Wortspiel v2 – Plan für parallele Agentenarbeit

Ziel: Wortspiel wird jugend- und kindgerecht, läuft auf jedem Bildschirm gut und klingt nach Spiel.
Dieser Plan ist für viele gleichzeitig arbeitende Agenten gedacht (Claude Code Subagents und Codex Tasks).
Jede Aufgabe hat eine ID, eigene Dateien, Abhängigkeiten und eine prüfbare Definition of Done.

Es gelten weiterhin alle Regeln aus `AGENTS.md`: stabile Karten-IDs, kein automatischer Reset,
Karten vor dem Anzeigen reservieren, Offline, keine Cloud, Mikrofon standardmäßig aus.

---

## 0. Spielregeln für die Zusammenarbeit (für alle Agenten verbindlich)

1. **Eine Aufgabe = ein Branch = ein Worktree.** Branch-Name `v2/<ID>-<kurzname>`, z. B. `v2/A03-schule`.
   Claude Code: Subagent mit `isolation: "worktree"`. Codex: eigener Task pro ID auf eigenem Branch.
2. **Nur eigene Dateien ändern.** Die Spalte „Dateien“ ist exklusiv. Wenn eine fremde Datei angepasst werden müsste,
   schreib das im PR unter **„Integrationsbedarf“** und ändere sie nicht.
3. **Niemals committen** (außer der Integrator in Phase 3): `frontend/src/data/cards.json`, `package.json`,
   `package-lock.json`, `frontend/dist/`, `docs/plan-v2.md`. Lokales Neuerzeugen zum Testen ist erlaubt,
   vor dem Commit aber wieder verwerfen (`git checkout -- frontend/src/data/cards.json`).
4. **Keine neuen Abhängigkeiten** ohne Freigabe durch den Integrator. Alles muss offline aus dem Bundle laufen.
5. **Tests gehören zur Aufgabe.** Jede Aufgabe legt eigene Testdateien an (`tests/<ID>.test.mjs`,
   `tests/browser/<ID>.spec.js`), damit Tests sich nicht gegenseitig in die Quere kommen.
6. **Vor dem PR:** `npm test`. Bei UI-Änderungen zusätzlich `npm run build && PW_PORT=<eigener Port> npm run test:e2e`. Parallele Worktrees brauchen verschiedene Ports, sonst testet man den Build eines anderen Worktrees.
7. **PR-Beschreibung:** ID, geänderte Dateien, ausgeführte Tests mit Ergebnis, bei UI Screenshots in
   390×844, 820×1180 und 1440×900, Integrationsbedarf.
8. **Die Checkliste in dieser Datei hakt nur der Integrator ab**, und zwar beim Merge. So gibt es keine Konflikte in dieser Datei.
9. **Aufgabe reservieren, bevor du anfängst:** Lege `docs/claims/<ID>.md` an mit Agent (`claude` oder `codex`),
   Branch und Startdatum, und committe die Datei als ersten Commit auf deinem Branch. Ist die ID schon reserviert
   (Datei existiert auf `main` oder auf einem Remote-Branch `v2/<ID>-*`), nimm eine andere Aufgabe.
   Eine Datei pro ID, deshalb gibt es keine Konflikte.

### Was sofort startbar ist (ohne Fundament)

Die **A-Pakete A01–A17** brauchen nur das Paketformat (siehe „Verträge“) und legen ausschließlich neue Dateien unter
`frontend/data/packs/` an. Sie können **jetzt** parallel beginnen, auch während Phase 1 läuft. Die Prüfung mit
`cards:check` kommt mit F7. Bis dahin von Hand gegen die Qualitätsregeln prüfen und JSON validieren
(`node -e "JSON.parse(require('fs').readFileSync('<datei>','utf8'))"`).
A18 wartet auf F6. Alle anderen Pakete warten auf den Tag `v2-foundation`.

### Wer macht was (Empfehlung)

| Art der Arbeit | Gut geeignet |
| --- | --- |
| Deutsche Wortlisten schreiben (Paket A) | Claude-Subagents. Cross-Review durch Codex |
| Reine Logik und Unit-Tests (Paket B, D1) | Codex |
| Layout und visuelle Feinarbeit mit Screenshots (Paket C) | Claude Code |
| Features (Paket E) | gemischt, je nach freier Kapazität |
| Fundament (Phase 1) und Integration (Phase 3) | **ein** Claude-Code-Hauptagent, nicht parallel |

---

## Ablauf in Wellen

```
Phase 1  Fundament (seriell, 1 Agent)          → Tag v2-foundation  ✅ erledigt 2026-10-08
Phase 2  Welle 1: A*, B*, C1, D1, E1–E3 parallel
         Welle 2: C2–C9, D2–D3, E4–E12 parallel  (brauchen C1 / B1 / D1)
         Welle 3: R* Reviews und QA parallel
Phase 3  Integration (seriell, 1 Agent): Merges, cards.json neu erzeugen, Gesamttest, Release
```

---

## Phase 1 – Fundament (seriell, blockiert alles andere) – ✅ erledigt

Umgesetzt wie beschrieben, mit diesen Abweichungen: Zusätzlich gibt es den Ereignisbus `src/events.js`
(`render`, `result`, `turn-start`, `turn-end`, `pause`, `resume`, `tick`), Feature-Module unter `src/features/`,
`src/sound.js`, `src/haptics.js` und `src/shortcuts.js` als Andockpunkte für D1, D3 und E3, sowie die
CSS-Partials `buttons.css` und `motion.css`. Die Architektur ist in `AGENTS.md` beschrieben.

Zweck: Den Code so aufteilen, dass ~40 Agenten parallel arbeiten können, ohne dieselben Dateien anzufassen.
Das Verhalten der App bleibt in dieser Phase **unverändert**. Alle bestehenden Tests müssen grün bleiben.

- [x] **F0 Stand sichern.** Laufende Arbeit am Schwierigkeitsgrad committen
      (`difficulty.json`, `easy-cards.json`, Änderungen in engine/main/styles/tests/import). Erst dann neu verzweigen.
- [x] **F1 main.js aufteilen** in:
      `src/app.js` (State, `change()`, `render()`, Timer),
      `src/actions.js` (Registry: `registerAction(id, handler)` statt eines großen `if/else`),
      `src/ui/icons.js`, `src/ui/chrome.js` (Header/Footer), `src/ui/setup.js`, `src/ui/game.js`,
      `src/ui/summary.js`, `src/ui/memory.js`, `src/ui/dialogs.js`.
      `main.js` importiert nur noch und startet.
- [x] **F2 Slots für Einstellungen.** `src/ui/settings/index.js` exportiert eine Liste von Abschnitten
      `{ id, order, render(settings, ctx), read(formData, settings) }`. `setup.js` rendert diese Liste.
      Bestehende Einstellungen (Zeit, Runden, Strafen, Sound, Sprache) werden zu Abschnitts-Modulen.
      Neue Features hängen sich mit **einer Zeile** in `index.js` ein.
- [x] **F3 Slots für die Spielkarte.** `game.js` rendert die Karte über `renderCard(card, session)` aus
      `src/ui/card.js`, die Aktionsknöpfe über `src/ui/play-actions.js`. Damit können B2 (Tabu-Stufe) und E5 (Spielmodi) unabhängig arbeiten.
- [x] **F4 styles.css aufteilen** in `src/styles/` mit `tokens.css`, `base.css`, `chrome.css`, `setup.css`,
      `game.css`, `summary.css`, `memory.css`, `dialogs.css` und leeren Dateien
      `responsive/phone.css`, `responsive/phone-landscape.css`, `responsive/tablet.css`,
      `responsive/desktop.css`, `responsive/large.css`, `platform/ios.css`, `platform/input.css`, `themes/dark.css`.
      `styles/index.css` importiert alles in fester Reihenfolge. Bestehende Media Queries ziehen in die responsive-Dateien.
- [x] **F5 Regel-Module mit Stubs.** Neue reine Module, die `engine.js` schon aufruft und die zunächst
      neutral antworten:
      - `src/rules/audience.js`: `matchesAudience(card, settings)` gibt vorerst `true` zurück.
      - `src/rules/taboo.js`: `visibleTaboo(card, settings)` gibt vorerst `card.taboo` zurück.
      - `src/rules/modes.js`: `pickMode(card, settings, random)` gibt vorerst `"explain"` zurück.
      - `src/rules/stats.js`: `sessionStats(session)` gibt vorerst `{}` zurück.
      `availableCards` ruft `matchesAudience` auf. `drawCard` speichert `session.currentMode = pickMode(...)`.
- [x] **F6 Kartenpakete als Quelle.** Neues Verzeichnis `frontend/data/packs/`. Je Paket eine Datei
      (Format unten). `scripts/import-cards.mjs` liest alle Pakete. Die Pakete hängen sich an die bestehenden Quellen an,
      Reihenfolge und IDs bisheriger Karten bleiben gleich. Neue optionale Kartenfelder
      `ageMin`, `emoji`, `topical`, `retired` werden in `cards.json` übernommen.
- [x] **F7 Kartenprüfung** `scripts/check-cards.mjs` und npm-Script `cards:check`. Es prüft das Paketformat,
      Duplikate (über normalisierte ID, auch gegen den Bestand), 5 bis 6 Tabuwörter je neuer Karte,
      kein Tabuwort enthält den Begriff oder ist in ihm enthalten, gültige `difficulty` und `ageMin`,
      Kategorie existiert, gültige Farbe, Sperrwortliste (`data/blocklist.txt`). Ausgabe als lesbarer Bericht.
      Dazu kommen npm-Scripts `cards:import`. **package.json ändert nur F7.**
- [x] **F8 Gerätematrix vorbereiten** in `playwright.config.js`: Projekte `phone-small` (320×568),
      `iphone-se` (375×667), `iphone-15` (393×852), `iphone-landscape` (852×393), `pixel-7`,
      `ipad-mini` (768×1024), `ipad-landscape` (1180×820), `surface-pro` (1368×912, hasTouch),
      `notebook` (1440×900), `monitor` (1920×1080), `large` (2560×1440). Alle laufen mit Chrome/Chromium
      (`defaultBrowserType: "chromium"`). Die vorhandenen Specs laufen weiter auf `mobile` und `desktop`.
      Die neuen Projekte laufen nur für Specs mit dem Tag `@matrix`.
      **Ausgangsbefund:** Auf `phone-small`, `iphone-se`, `iphone-landscape` und `ipad-landscape` liegen Karte oder
      Wertungsknöpfe im Zug außerhalb des Bildschirms. Sie stehen in `KNOWN_LAYOUT_GAPS` in `tests/browser/matrix.spec.js`.
      Wer eine Lücke schließt, entfernt den Eintrag. **Stand: alle vier Lücken durch C2–C4 geschlossen, Liste leer.**
- [x] **F9 AGENTS.md ergänzen.** Verweis auf diesen Plan und die Regeln aus Abschnitt 0.
- [x] **F10** `npm test`, `npm run build`, `npm run test:e2e` grün → Merge auf `main`, Tag `v2-foundation`.

### Verträge, die in Phase 1 festgelegt werden (alle anderen bauen darauf auf)

**Paketformat** `frontend/data/packs/<paket-id>.json`:

```json
{
  "category": { "id": "gaming", "name": "Gaming", "emoji": "🎮", "color": "purple" },
  "cards": [
    { "word": "Minecraft", "taboo": ["Blöcke", "Bauen", "Creeper", "Pixel", "Videospiel"],
      "difficulty": "easy", "ageMin": 8, "emoji": "⛏️" }
  ]
}
```

- Erweitert ein Paket eine bestehende Kategorie (z. B. `tv`, `sports`), steht dort nur `"category": { "id": "tv" }`.
- Karten-ID bleibt `de:<normalisiertes Wort>`. **Ein Begriff, der schon existiert, ist keine neue Karte.**
  Er bekommt nur die zusätzliche Kategorie. Das Tabuwort-Set der älteren Karte bleibt.
- `difficulty`: `easy` | `medium` | `hard`. Eine Angabe im Paket gilt als geprüft. `difficulty.json` bleibt für Bestandskarten.
- `ageMin`: 6 | 8 | 10 | 12 | 14 | 16. **Fehlt der Wert, gilt 14** (sicherer Standard, wie bei `difficulty`).
- `topical: true` markiert Begriffe, die schnell veralten (Jugendwörter, Trends).
- `retired: true` blendet eine Karte aus. **Karten werden nie gelöscht**, damit IDs und Kartenspeicher stabil bleiben.
- Farben: nur vorhandene (`mint`, `blue`, `yellow`, `purple`, `coral`, `pink`).

**Neue Einstellungen** (Migration mit `??=` wie `migrateDifficulty`, Schema bleibt 1):

| Feld | Werte | Standard neu | Standard für gespeicherte Partie |
| --- | --- | --- | --- |
| `tabooMode` | `classic` (alle), `light` (3 Wörter), `none` (freies Erklären) | `classic` | `classic` |
| `ageGroup` | `6`, `8`, `10`, `12`, `14`, `null` (= alle) | `null` | `null` |
| `modes` | Teilmenge von `explain`, `pantomime`, `draw`, `oneword` | `["explain"]` | `["explain"]` |
| `volume` | 0–1 | 0.8 | 0.8 |
| `tick` | boolean (Ticken in den letzten 10 s) | `true` | `true` |
| `countdown` | boolean (3-2-1 vor dem Zug) | `true` | `true` |

---

## Phase 2 – Parallele Arbeitspakete

### Paket A – Neue Wörter und Kategorien (je Aufgabe ein Agent, alle parallel)

Jede A-Aufgabe besitzt **genau eine Datei** `frontend/data/packs/<paket-id>.json` und nichts sonst.

**Qualitätsregeln für alle Wortlisten** (in den Prompt jeder A-Aufgabe kopieren):

- Deutsch, aktuelle Rechtschreibung. Begriffe, die Jugendliche 2026 wirklich benutzen oder kennen.
- Jede Karte hat 5 Tabuwörter. Das sind die naheliegendsten Erklärwörter, nicht irgendwelche.
  Kein Tabuwort ist ein Teil des Begriffs (bei „Schulbus“ also nicht „Schule“ oder „Bus“, denn Wortbestandteile sind ohnehin tabu).
  Stattdessen die nächstbesten Wörter nehmen.
- Altersgerecht: keine Drogen, kein Alkohol als Pointe, keine Sexualisierung, keine Gewaltverherrlichung,
  keine Beleidigungen oder Slurs (auch nicht als „Jugendwort“), keine Glücksspiel-Werbung, keine Parteipolitik,
  keine Begriffe, die Gruppen abwerten. In der Grauzone weglassen.
- Bekannte Personen nur, wenn sie langfristig bekannt sind. Keine Privatpersonen und keine kleinen Influencer.
- Marken und Spiele sind erlaubt, wenn sie allgemein bekannt sind (Minecraft, WhatsApp, Lego).
- Pro Paket ungefähr 50 % `easy`, 35 % `medium`, 15 % `hard`. `ageMin` ehrlich setzen.
- `npm run cards:check` muss für die eigene Datei ohne Fehler laufen. Duplikate gegen den Bestand entfernen
  oder bewusst als Kategorie-Ergänzung stehen lassen (im PR auflisten).
- Im PR stehen 10 Beispielkarten und die Verteilung nach Schwierigkeit und Alter.

| ID | Paket-ID / Kategorie | Neu oder Erweiterung | Ziel | Fokus Alter | Beispiele |
| --- | --- | --- | --- | --- | --- |
| [x] A01 | `gaming` 🎮 Gaming | neu | 150 | 8–17 | Minecraft, Controller, Level, Speedrun, Mario Kart, Respawn, Lootbox |
| [x] A02 | `social` 📱 Social Media & Apps | neu | 130 | 10–17 | Story, Follower, Reel, Gruppenchat, Sprachnachricht, Filter, Livestream |
| [x] A03 | `school` 🎒 Schule & Ausbildung | neu | 150 | 8–17 | Hausaufgaben, Klassenfahrt, Vertretungsstunde, Spickzettel, Praktikum, Abi |
| [x] A04 | `slang` 💬 Jugendsprache | neu, `topical` | 100 | 12–17 | Digga, cringe, lost, Ehrenmann, sus, Aura, Side-Eye, NPC, wild |
| [x] A05 | `music` 🎧 Musik & Stars | neu | 120 | 10–17 | Playlist, Festival, Beat, Kopfhörer, Karaoke, Bandprobe, Rap |
| [x] A06 | `hobbies` 🛹 Freizeit & Hobbys | neu | 130 | 8–17 | Skatepark, Bouldern, Trampolin, Escape Room, Freibad, Kino |
| [x] A07 | `friends` 💛 Freundschaft & Gefühle | neu | 100 | 10–17 | beste Freundin, Liebeskummer, Gruppenzwang, Geheimnis, Versöhnung |
| [x] A08 | `style` 👟 Mode & Style | neu | 80 | 12–17 | Sneaker, Hoodie, Undercut, Nagellack, Second Hand, Bucket Hat |
| [ ] A09 | `future` 🚀 Technik, KI & Zukunft | neu | 110 | 10–17 | KI, Roboter, Akku, Smartwatch, E-Scooter, Passwort, Ladekabel |
| [ ] A10 | `planet` 🌱 Natur & Umwelt | neu | 100 | 8–17 | Mülltrennung, Klimawandel, Gewitter, Regenwald, Fahrradtour |
| [ ] A11 | `camp` 🏕️ Freizeit, Camp & Fahrten | neu | 100 | 8–17 | Lagerfeuer, Nachtwanderung, Zeltlager, Stockbrot, Taschenlampe, Heimweh |
| [ ] A12 | `kids` 🧸 Kinderwelt | neu | 200 | 6–10 | Sandkasten, Rutsche, Zahnfee, Bauernhof, Kuscheltier, Seifenblase |
| [ ] A13 | `fantasy` 🐉 Fantasy & Märchen | neu | 100 | 6–14 | Drache, Einhorn, Zauberstab, Rotkäppchen, Ritterburg, Schatzkarte |
| [ ] A14 | `tv` Filme, Serien & Anime | Erweiterung (bisher 25) | 150 | 8–17 | Spoiler, Staffel, Binge-Watching, Superheld, Anime, Trailer, Popcorn |
| [ ] A15 | `sports` Sport | Erweiterung (bisher 30) | 120 | 8–17 | Parkour, E-Sport, Elfmeter, Bundesjugendspiele, Sportunterricht |
| [ ] A16 | `food` Snacks & Fast Food | Erweiterung | 80 | 6–17 | Döner, Bubble Tea, Pausenbrot, Pizza Hawaii, Smoothie |
| [ ] A17 | `faith` Glaube & Konfi | Erweiterung | 80 | 10–17 | Jugendgottesdienst, Lobpreis, Konfi-Unterricht, Teamer, Andacht, Taizé |
| [ ] A18 | Bestand taggen | nur `frontend/data/age-tags.json` (neu) | alle `easy`/`medium` Bestandskarten | – | `ageMin` für Bestandskarten nachtragen. F6 liest die Datei wie `difficulty.json` |

Stand 2026-10-08: A01–A08 gemergt, 977 neue Karten, Bestand 2 193 Karten in 20 Kategorien.
Review-Notizen für R1–R3: „Gaslighting“ und „Situationship“ (slang, ab 14) für Konfi-Gruppen prüfen; Trendwörter 2025 in slang
unbestätigt (Das crazy, Six Seven, Tuff, Aura farmen); „Werwolf (Spiel)“ in hobbies umbenennen (Klammer auf der Karte).

Summe: rund 2 000 neue Karten, davon mehr als 1 500 speziell für Jugendliche.

### Paket B – Spielregeln (Engine, rein und testbar)

| ID | Aufgabe | Dateien (exklusiv) | Abhängig |
| --- | --- | --- | --- |
| [ ] B1 | **Altersfilter**: `matchesAudience` filtert nach `ageGroup` und `card.ageMin` (Standard 14) und blendet `retired`-Karten immer aus. `validateSettings` prüft `ageGroup`. Migration. | `src/rules/audience.js`, `tests/B1.test.mjs` | F5 |
| [ ] B2 | **Tabu-Stufen**: `visibleTaboo` mit `classic` (alle), `light` (die ersten 3) und `none` (keine). Im Modus `none` bleibt die Wertung `taboo` intern, die Oberfläche nennt sie „Wort gesagt“ (Begriff oder Wortteil ausgesprochen). Strafe nach Einstellung. Migration und Validierung. | `src/rules/taboo.js`, `tests/B2.test.mjs` | F5 |
| [ ] B3 | **Neue Schnellauswahl** (passt auch die Preset-Zahlen in `tests/browser/game.spec.js` an) in `PRESETS`: „Kinder (6–9)“: `ageGroup 8`, `tabooMode none`, 90 s, keine Strafen, Kategorien kids/fantasy/animals/food/hobbies/camp. „Jüngere Jugendliche (10–13)“: `light`. „Jugendliche (14–17)“: `classic`, Jugend-Kategorien. „Konfis“ (+faith/camp). „Erwachsene / gemischt“. Bitte nur den `PRESETS`-Block und `applyPreset` in `engine.js` ändern. | `engine.js` (nur PRESETS/applyPreset), `tests/B3.test.mjs` | B1, B2 |
| [ ] B4 | **Statistik**: `sessionStats` mit erratenen Karten pro Team, bester Runde, schnellster Karte (Zeitstempel im Log ergänzen, nur additiv), Tabu-König. | `src/rules/stats.js`, `tests/B4.test.mjs` | F5 |
| [ ] B5 | **Spielmodi-Logik**: `pickMode` wählt zufällig aus `settings.modes`, gleichmäßig verteilt. `pantomime` und `draw` nur bei Karten mit `difficulty easy/medium`. | `src/rules/modes.js`, `tests/B5.test.mjs` | F5 |
| [ ] B6 | **Eigene Karten** (Logik): `customCards` pro Gruppe im State, IDs `custom:<gruppe>:<normalisiert>`. Validierung beim Anlegen. `importBackup` akzeptiert zusätzlich `custom:`-Schlüssel und eigene Karten (validiert, gemergt, nie überschrieben). | `src/rules/custom.js`, `tests/B6.test.mjs`. Änderung in `importBackup`/`exportBackup` unter Integrationsbedarf beschreiben | F5 |

### Paket C – Bildschirmanpassung (Smartphone, Tablet, Surface, Notebook, Monitor, Apple)

**Abnahmekriterien für alle C-Aufgaben** (werden in C9 automatisiert geprüft):

1. Kein horizontales Scrollen auf allen Geräten der Matrix aus F8.
2. **Während des Zuges sind Begriff, alle Tabuwörter, Timer und die drei Wertungsknöpfe ohne Scrollen sichtbar.**
   Das gilt auf jedem Gerät der Matrix, auch im Querformat am Handy.
3. Bei Touch (`pointer: coarse`) sind Ziele mindestens 44×44 px groß (Apple HIG), Wertungsknöpfe mindestens 64 px hoch.
4. Drehen oder Umschalten Laptop↔Tablet mitten im Zug: kein Neuladen, kein Verlust von Timer oder Karte,
   keine doppelte Kartenziehung.
5. Eingabefelder haben mindestens 16 px Schrift (sonst zoomt iOS beim Antippen).
6. Keine Erkennung über den User-Agent (iPadOS meldet sich als Mac). Nur Feature- und Media-Queries.

| ID | Aufgabe | Dateien (exklusiv) | Abhängig |
| --- | --- | --- | --- |
| [x] C1 | **Design-Tokens**: fluide Typografie mit `clamp()`, Abstände, Kartengröße als Custom Properties, `dvh`/`svh` statt `vh`, Container Queries für Karte und Knopfleiste. Basis für alle C-Aufgaben. | `styles/tokens.css`, `styles/base.css` | F4 |
| [x] C2 | **Smartphone hoch** (320–430 px): kompakte Kopfzeile im Spiel, Knöpfe als unterer Daumenbereich, Punktestand als schmale Leiste, kleine Geräte (iPhone SE, 320 px) zuerst. | `responsive/phone.css` | C1 |
| [x] C3 | **Smartphone quer**: zweispaltig mit Karte links und Knöpfen rechts, Kopfzeile ausgeblendet, Safe-Area links/rechts (Notch/Dynamic Island). | `responsive/phone-landscape.css` | C1 |
| [x] C4 | **Tablet** (hoch und quer, 744–1366 px): eigenes Layout. Hochformat: große Karte mittig, Knopfleiste unten. Querformat: Karte links, Knopfspalte rechts in Daumenreichweite, Rundenleiste ausklappbar. Setup zweispaltig. | `responsive/tablet.css` | C1 |
| [ ] C5 | **Notebook und Monitor**: begrenzte Lesebreite, Tastenkürzel-Hinweise sichtbar (siehe E3), Hover-Zustände nur bei `hover: hover`. | `responsive/desktop.css` | C1 |
| [ ] C6 | **Großbild / Beamer** (≥ 1800 px oder Option „Großbildmodus“): Karte und Punktestand skalieren für den Blick von weitem. | `responsive/large.css` | C1 |
| [x] C7 | **Eingabeart erkennen (Surface, Convertibles)**: `src/device.js` setzt `data-input="touch|mouse|pen"` am `<html>` beim letzten `pointerdown` und bei `matchMedia('(any-pointer: coarse)')`-Änderungen, außerdem `data-orientation`. Touch-Größen gelten über `[data-input=touch]`, nicht nur über die Breite. Resize und Rotation lösen **kein** `render()` aus. | `src/device.js`, `platform/input.css`, `tests/browser/C7.spec.js` | C1 |
| [x] C8 | **Apple (iPhone, iPad, Safari, Home-Bildschirm-App)**: `apple-mobile-web-app-capable`, `-status-bar-style`, `-title`, `apple-touch-icon` 180×180, Safe-Area oben, unten und seitlich, `touch-action: manipulation` und `-webkit-tap-highlight-color` auf Spielknöpfen, kein Gummiband-Scrollen im Spiel (`overscroll-behavior`), Hinweis „Zum Home-Bildschirm hinzufügen“, weil iOS kein `beforeinstallprompt` kennt. | `index.html` (nur `<head>`), `public/apple-touch-icon.png`, `platform/ios.css`, `src/ui/install-hint.js` | C1 |
| [ ] C9 | **Automatischer Gerätetest** `@matrix`: prüft für jedes Gerät die Kriterien 1–5. Dazu ein Rotationstest (Viewport mitten im Zug wechseln → gleiche Karte, Timer läuft, Kartenspeicher unverändert). Screenshots als Artefakt (nicht als Baseline-Vergleich, weil sie je nach OS abweichen). | `tests/browser/matrix.spec.js` (Grundgerüst existiert, inkl. `KNOWN_LAYOUT_GAPS`) | F8, darf parallel zu C2–C8 entstehen |
| [ ] C10 | **Optionaler CI-Lauf in WebKit** (echte Safari-Engine) für `@matrix`, als separater, nicht blockierender Job. | `.github/workflows/webkit.yml` | C9 |

**Manuelle Abnahme auf echten Geräten** (Phase 3, mit Häkchen im PR):
iPhone (Safari und Home-Bildschirm-App), iPad hoch/quer, Android-Handy, Surface mit und ohne Tastatur
(Tablet-Modus), Notebook, externer Monitor/Beamer.

### Paket D – Sounds und Haptik

Empfehlung: Alle Klänge **mit Web Audio synthetisieren**. Das braucht keine Dateien, keine Lizenzen und funktioniert offline sofort.
Falls doch Samples kommen: nur CC0, Quelle in `THIRD_PARTY_NOTICES.md`, Dateien unter `public/sounds/`.

| ID | Aufgabe | Dateien (exklusiv) | Abhängig |
| --- | --- | --- | --- |
| [ ] D1 | **Sound-Engine** `src/sound.js`: `play(event)` mit den Ereignissen `correct` (heller Zweiklang), `skip` (Wisch), `taboo` (Buzzer), `tick` (letzte 10 s, schneller werdend), `countdown` (3-2-1-Los), `turnEnd` (Gong), `win` (Fanfare), `click`. Lautstärke und Stummschaltung, ein gemeinsamer `AudioContext`. **iOS**: beim ersten Tippen entsperren (`resume()` im Gesture-Handler), Hinweis auf den Stummschalter. Ersetzt `beep()`. | `src/sound.js`, `tests/D1.test.mjs` (Ereignis-Mapping mit Fake-AudioContext) | F1 |
| [ ] D2 | **Klangpakete**: „Klassisch“, „Arcade“, „Leise“ (nur Timer-Ende). Einstellungs-Abschnitt mit Lautstärke-Regler, Ticken an/aus und Probehören. | `src/sound-themes.js`, `src/ui/settings/sound.js` | D1, F2 |
| [ ] D3 | **Haptik**: `navigator.vibrate` für taboo/turnEnd, wo verfügbar (Android). Auf iOS still ignorieren, kein Workaround. Respektiert die Sound-Einstellung „Signale“. | `src/haptics.js` | D1 |

### Paket E – Weitere Features

| ID | Aufgabe | Dateien (exklusiv) | Abhängig | Priorität |
| --- | --- | --- | --- | --- |
| [ ] E1 | **3-2-1-Countdown** vor jedem Zug (abschaltbar). **Wichtig: Die Karte wird erst nach dem Countdown gezogen und reserviert**, nicht schon davor sichtbar. | `src/ui/countdown.js`, `src/ui/settings/countdown.js` | F1, D1 (Ton optional) | Muss |
| [ ] E2 | **Bildschirm bleibt an**: Screen Wake Lock während `playing`, bei Pause und Sichtbarkeitswechsel freigeben und wieder anfordern. Ohne Unterstützung still. | `src/wakelock.js` | F1 | Muss |
| [x] E3 | **Tastenkürzel und Presenter** (Logitech R400/R500/Spotlight: Weiter = Start/Erraten, Zurück = Tabuwort, dritte Taste „.“/„b“/F5/Esc = Überspringen) für Notebook und Monitor: Leertaste/Enter = Erraten, S = Überspringen, T = Tabu, P = Pause, Strg+Z = Rückgängig. Gegen Doppeltrigger entprellt wie die Knöpfe. Hilfe-Overlay mit `?`. Nicht aktiv in Eingabefeldern. | `src/shortcuts.js`, `tests/browser/E3.spec.js` | F1 | Muss |
| [ ] E4 | **UI Tabu-Stufe und Altersgruppe**: Einstellungs-Abschnitte. Die Karte zeigt nur `visibleTaboo`. Bei `none` gibt es einen großen Hinweis „Frei erklären – nur das Wort selbst ist verboten“ und der Knopf heißt „Wort gesagt“. | `src/ui/settings/taboo.js`, `src/ui/settings/age.js`, `src/ui/card.js` | B1, B2, F3 | Muss |
| [ ] E5 | **Spielmodi-UI**: Auswahl Erklären / Pantomime / Zeichnen / Ein Wort. Auf der Karte ein großes Modus-Symbol und eine kurze Regel. Bei Pantomime und Zeichnen werden keine Tabuwörter angezeigt. | `src/ui/settings/modes.js`, `src/ui/mode-badge.js` | B5, F3 | Soll |
| [ ] E6 | **Kinderkarten mit Emoji**: Ist `card.emoji` gesetzt und `ageGroup ≤ 10`, erscheint ein großes Emoji als Lesehilfe. Größere Schrift im Kinder-Preset. | `src/ui/card-emoji.js`, `styles/kids.css` (neu) | F3, A12 | Soll |
| [ ] E7 | **Ergebnis mit Auszeichnungen**: Bildschirm am Ende mit Statistik aus B4, Ehrentiteln („Schnellste Erklärung“, „Tabu-König“), Konfetti-Animation (respektiert `prefers-reduced-motion`) und Fanfare. | `src/ui/awards.js`, `styles/awards.css` (neu) | B4, D1 | Soll |
| [ ] E8 | **Eigene Karten (UI)**: Im Kartenspeicher eigene Begriffe für die Gruppe anlegen, bearbeiten und ausblenden. Eigene Kategorie „Unsere Karten“. Sie sind in der Sicherung enthalten. | `src/ui/custom-cards.js`, `styles/custom.css` (neu) | B6 | Soll |
| [ ] E9 | **Sicherungs-Erinnerung**: Safari kann Website-Daten nach 7 Tagen ohne Nutzung löschen, wenn die Seite nicht als App installiert ist. Nach jeder Partie, bei der seit über 7 Tagen keine Sicherung gemacht wurde, erscheint ein Hinweis mit einem Klick auf „Sicherung herunterladen“. Auf iOS zusätzlich der Installationshinweis aus C8. | `src/ui/backup-reminder.js` | F1 | Muss |
| [ ] E10 | **Dunkles Design und hoher Kontrast**: folgt dem System, mit Umschalter. Kontrast WCAG AA. | `themes/dark.css`, `src/ui/settings/theme.js` | C1 | Kann |
| [ ] E11 | **Zuschauer-Anzeige**: zweites Fenster/Tab auf demselben Gerät (z. B. Beamer) zeigt nur Punktestand und Timer, **nie die Karte**. Lokal über `BroadcastChannel`, kein Netzwerk. | `src/ui/scoreboard-window.js`, `scoreboard.html` | F1, C6 | Kann |
| [ ] E12 | **Karte vorlesen** für Kinder, die noch nicht gut lesen: nur mit `speechSynthesis`-Stimmen, die `localService === true` haben. Gibt es keine, wird die Funktion ausgeblendet. Standardmäßig aus. Vorgelesen wird nur über Kopfhörer-Hinweis, damit die Ratenden es nicht hören. | `src/read-aloud.js`, `src/ui/settings/read-aloud.js` | F3 | Kann |
| [ ] E13 | **Kurzes Tutorial** beim ersten Start mit 3 Karten zum Wischen (Regeln, Rollen: Erklärer/Kontrolle/Ratende). Danach erreichbar über den Hilfe-Knopf. | `src/ui/onboarding.js`, `styles/onboarding.css` (neu) | F1 | Soll |

### Welle 3 – Reviews und Qualität (parallel, nachdem die jeweiligen Pakete fertig sind)

| ID | Aufgabe | Wer |
| --- | --- | --- |
| [ ] R1 | **Inhaltsreview A01–A09**: Altersangemessenheit, Qualität der Tabuwörter, Schwierigkeit, Doppelungen über Pakete hinweg. Liefert Korrektur-Commits auf die Paket-Branches. | Codex (Cross-Review) |
| [ ] R2 | **Inhaltsreview A10–A18** | Codex (Cross-Review) |
| [ ] R3 | **Jugend-Check**: Stichprobe von 200 Jugendkarten. Wäre die Karte für 13- bis 17-Jährige peinlich, veraltet oder zu „erwachsen ausgedacht“? `topical`-Karten markieren. | Claude-Subagent |
| [ ] R4 | **Barrierefreiheit**: Fokusreihenfolge, `aria-live` für Timer und Wertung, Kontraste, Screenreader-Labels der neuen Knöpfe, `prefers-reduced-motion`. | Claude-Subagent |
| [ ] R5 | **Code-Review der Engine-Änderungen** gegen die Regeln aus AGENTS.md (Reservierung vor Anzeige, Undo, Import-Validierung, Migration gespeicherter Partien). | Codex |
| [ ] R6 | **Offline-Prüfung**: Build, Service Worker, Flugmodus-Test, keine externen Requests (Playwright `page.route('**', …)` blockiert alles Fremde). | Claude-Subagent |

---

## Phase 3 – Integration (seriell, ein Agent)

- [ ] I1 Merge-Reihenfolge: B1 → B2 → B5 → B4 → B6 → B3, danach alle A-Pakete, dann C1 → C7 → C8 → C2–C6 → C9/C10, dann D1 → D2 → D3, dann E in der Reihenfolge der Tabelle.
- [ ] I2 Integrationsbedarf aus allen PRs abarbeiten (z. B. `importBackup` für B6, Einhängen der Abschnitte in `ui/settings/index.js`).
- [ ] I3 `npm run cards:import` (braucht `.sources/Taboo-Data`) → `npm run cards:check` → **Stabilitätsprüfung: Jede ID aus dem alten `cards.json` existiert weiterhin** (Test ergänzen).
- [ ] I4 `npm test`, `npm run build`, `npm run test:e2e` (inkl. `@matrix`) grün.
- [ ] I5 Migrationstest: gespeicherten v1-State mit laufender Partie laden. Partie läuft unverändert weiter, Kartenspeicher vollständig.
- [ ] I6 Manuelle Geräteabnahme (siehe Paket C). Ergebnisse im Release-PR.
- [ ] I7 `README.md`, `THIRD_PARTY_NOTICES.md` (falls Samples), Hilfe-/Regeltext in der App aktualisieren. GPL-Hinweise erhalten.
- [ ] I8 Version auf 2.0.0, Release über GitHub Pages.

---

## Vorlage für Agenten-Prompts

```
Du arbeitest am Projekt Wortspiel (c:\ai\tabu). Lies zuerst AGENTS.md und docs/plan-v2.md (Abschnitt 0 + Verträge).
Deine Aufgabe: <ID> – <Titel aus der Tabelle>.
Du darfst NUR diese Dateien anlegen/ändern: <Dateien>.
Abhängigkeiten sind bereits auf main: <IDs>.
Definition of Done: <Abnahmekriterien aus der Tabelle>; eigene Tests in <Testdatei>;
`npm test` grün; bei UI zusätzlich `npm run build && npm run test:e2e`.
Arbeite auf Branch v2/<ID>-<kurzname>. Committe nicht cards.json, package.json, package-lock.json, dist oder den Plan.
Schließe mit einer PR-Beschreibung ab: geänderte Dateien, Testergebnis, Screenshots (bei UI), Integrationsbedarf.
```

Für A-Pakete zusätzlich die **Qualitätsregeln für Wortlisten** aus Paket A in den Prompt kopieren.

---

## Risiken und Gegenmaßnahmen

| Risiko | Gegenmaßnahme |
| --- | --- |
| Merge-Konflikte in `main.js`/`styles.css` | Phase 1 teilt alles in Module und Slots auf, Dateien sind exklusiv zugeordnet |
| Doppelte Begriffe über Pakete hinweg | `cards:check` gegen Bestand und alle Pakete, Review R1/R2, gleiche ID wird zur Kategorie-Ergänzung |
| Karten-IDs ändern sich | IDs bleiben wortbasiert, Karten werden nie gelöscht (nur `retired`), Stabilitätstest in I3 |
| Jugendsprache veraltet schnell | `topical`-Markierung, später gezielt `retired` statt löschen |
| Ungeeignete Inhalte für Kinder | sicherer Standard `ageMin 14`, Sperrwortliste, zwei Review-Runden |
| iOS löscht Daten oder spielt keinen Ton | E9 Sicherungs-Erinnerung und Installationshinweis, D1 Audio-Entsperrung und Hinweis auf den Stummschalter |
| Rotation oder Surface-Umschaltung verliert den Zug | C7: kein Re-Render bei Resize, Rotationstest in C9 |
| Countdown zeigt Karte vorab | E1: Karte wird erst nach dem Countdown gezogen (Reservierung bleibt vor Anzeige) |
