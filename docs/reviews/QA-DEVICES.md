# QA-DEVICES – Geräte-, Layout-, Offline- und PWA-Prüfung

- Aufgabe: [#19](https://github.com/pfarrergraf/wortspiel/issues/19)
- Agent: Claude Code, Branch `v2/QA-DEVICES-matrix`
- Basis: main `9c1d9d68a673e02f3e91b234a867e05a1de433b1` (PR #16)
- Datum: 2026-10-09
- Neue Testdatei: `frontend/tests/browser/QA-DEVICES.spec.js` (14 Testfälle, je 7 in den bestehenden Projekten `mobile` und `desktop`)

**Alle Geräteangaben in diesem Bericht sind Simulationen** (Chromium-Viewport mit Touch-/Mobile-Emulation). Es stand kein echtes Gerät zur Verfügung. Screenshots und Emulation ersetzen weder echte Gerätetests noch die Lesbarkeitsprüfung durch zwei Personen.

## Prüfumgebung

| Punkt | Wert |
| --- | --- |
| Node | 22.22.0 |
| Playwright (aus Lockfile) | 1.64.0 |
| Browser | vorinstalliertes Playwright-Chromium 141.0.7390.37, `CI=1` (kein Google Chrome vorhanden) |
| Port | `PW_PORT=4301`, eigener Worktree und eigener Build |

Umgebungsunterschied: Das Lockfile verlangt Chromium-Build 1248, die Cloud-Umgebung enthält nur Build 1194; `playwright install` ist dort nicht erlaubt. Ohne Anpassung scheiterten deshalb **alle 88 Bestandstests nach 2–5 ms** mit „Executable doesn't exist“ – ein Umgebungsproblem, kein Produktfehler. Für den Lauf wurde ein temporäres `PLAYWRIGHT_BROWSERS_PATH` außerhalb des Repositorys angelegt, dessen 1248-Pfade per Symlink auf das vorhandene Chromium 141 zeigen. Repository, Config und Lockfile blieben unverändert. CI (Node 22, installiert seine Browser selbst) ist davon nicht betroffen.

## Was die neuen Tests prüfen

Die zentrale Playwright-Config bleibt unverändert. Jeder Test öffnet eigene Browser-Kontexte mit dem jeweiligen Geräteprofil. Damit nichts doppelt läuft, prüft das Projekt `mobile` die Touch-Geräte und das Projekt `desktop` die Surface-/Notebook-/Desktop-Profile. Es gibt keine `skip`s.

| Test | `mobile`-Projekt (Simulation) | `desktop`-Projekt (Simulation) |
| --- | --- | --- |
| Klassisch / Frei erklären / Pantomime: Karte, Timer und Wertung passen | 320×568, 375×667, 393×852, Smartphone quer 852×393, Android-Tablet 800×1280 und 1280×800, iPad 820×1180 und 1180×820 | Surface 1368×912 (Touch), Notebook 1440×900, Desktop 1920×1080 |
| Drehung mitten im Zug | Smartphone 393×852↔852×393, Android-Tablet 800×1280↔1280×800, iPad 820×1180↔1180×820 | Surface 1368×912↔912×1368 |
| Volle Partie auf 320×568, dann „Nochmal spielen“ | ja | ja |
| Produktionsbuild unter `/wortspiel/`: Service Worker, Manifest, Icons, Fremdrequests, Offline | Smartphone 393×852 | Notebook 1440×900 |
| Echter Browser-Neustart offline und Service-Worker-Update | Android-Tablet 800×1280 | Surface 1368×912 |

Geprüfte Kriterien im Einzelnen:

- **Layout:** keine horizontale Seitenverschiebung; Begriff, Timer, Pause und alle drei Wertungstasten liegen vollständig im ersten Bildschirm. Im klassischen Modus sind alle Tabuwörter sichtbar und nicht abgeschnitten. Ein Punktestand ist sichtbar: Team-Leiste oder Rundenpunkte.
- **Große Wertungstasten:** Auf Touch-Profilen sind Erraten, Überspringen und Tabu/Gesprochen mindestens 44×44 CSS-Pixel groß.
- **Wertung und Historie:** Nach „Erraten“ wechselt die Karte, der Teamstand steigt und die Rundenzählung zeigt „1 erraten“. Konsolenfehler gibt es nicht.
- **Drehung:** Mit simulierter Uhr bleibt nach der Drehung dieselbe Karte stehen und der Timer läuft weiter. Die Steuerung bleibt in beiden Ausrichtungen sichtbar. Das Protokoll `correct, skip, correct` und 4 reservierte Karten-IDs bleiben über beide Drehungen erhalten.
- **Nochmal spielen:** Eine Partie mit 2 Teams × 1 Runde erzeugt 2 Runden in der Historie und 6 gesehene Karten. Nach „Nochmal spielen“ kommt keine der 6 Karten erneut; 6 neue Karten werden geprüft, danach sind es 12 gesehene IDs.
- **Unterpfad `/wortspiel/`:** Ein eigener Node-Server im Test liefert `dist/` nur unter `/wortspiel/` aus (wie bei GitHub Pages). Geprüft wird:
  - Der Service-Worker-Scope ist `…/wortspiel/`.
  - Das Manifest kommt mit `manifest+json`. `start_url` und `scope` lösen auf `/wortspiel/` auf, `display` ist `standalone`, `lang` ist `de`.
  - Alle Manifest-Icons laden mit dem angegebenen Typ, und die PNG-Größen passen zu `sizes`. Es gibt ein maskierbares 512er-Icon. Das Apple-Touch-Icon ist mindestens 180 px groß.
  - Alle Build-Dateien inklusive der OFL-Lizenz liegen im Precache.
  - Anfragen an fremde Origins werden blockiert und protokolliert; es gab **0**. Auch Anfragen außerhalb von `/wortspiel/` gab es **0**.
  - Offline-Reload setzt die pausierte Runde mit derselben Karte fort. Ein neuer Tab startet offline.
- **Neustart und Update:** Mit einem persistenten Profil wird ein echter Browser-Neustart im Offline-Modus durchgeführt. Die laufende Runde kommt pausiert zurück, alle gesehenen IDs bleiben erhalten, und es lässt sich weiterspielen. Danach wird ein Deployment simuliert: Der Server liefert ein `sw.js` mit neuem Cache-Namen. Der neue Worker übernimmt, der alte Cache wird gelöscht, die Kartenhistorie bleibt unverändert (3 IDs) und offline funktioniert weiter.

## Ergebnisse (tatsächlich ausgeführt)

| Prüfung | Ergebnis |
| --- | --- |
| `npm ci` | ok |
| `npm test` | 98/98 bestanden, 0 skipped |
| `npm run cards:check` | „Keine Fehler.“ |
| `npm run build` | ok, Offline-Cache `2cb47ad5b8cf2a`, 17 Dateien |
| `QA-DEVICES.spec.js` | 14/14 bestanden |
| Gesamte E2E-Suite (Bestand + neu), Lauf 1 | 101 bestanden, **1 fehlgeschlagen**: `pantomime.spec.js` im Projekt desktop (siehe Befund 5) |
| Gesamte E2E-Suite, Lauf 2 (unverändert) | **102/102 bestanden**, 0 skipped, 3,2 min |
| `pantomime.spec.js --repeat-each=8` isoliert | 16/16 bestanden |

Nebenbefund: `https://pfarrergraf.github.io/wortspiel/sw.js` trägt denselben Cache-Hash `2cb47ad5b8cf2a` wie der lokale Build von `9c1d9d6`. GitHub Pages liefert also genau den geprüften main-Stand aus, und der Build ist reproduzierbar.

## Befunde

1. **Kein Produktfehler in den simulierten Profilen gefunden.** Alle Pflichtsteuerelemente passen in allen 11 Profilen und allen 3 Modi, ebenso nach der Drehung.
2. **Beobachtung (Design-Entscheidung, kein Fehler):** Auf Smartphones hochkant liegt die Rundenseitenleiste (Rundenpunkte, Zähler, „Runde beenden“) unter der Karte und ist nur durch Scrollen erreichbar. Sichtbar bleibt der Team-Gesamtstand. Im Smartphone-Querformat blendet `src/styles/responsive/phone-landscape.css` (Zeilen 65–70) Team-Leiste und Überschrift bewusst aus und zeigt stattdessen die Rundenpunkte. Ob den Spielenden das reicht, kann nur der echte Spieltest zeigen.
3. **Laufende Runde nach Neustart:** Sie wird pausiert wiederhergestellt (`restoreSession`). Das ist richtig und wurde für den Test so angenommen.
4. **Umgebungsproblem** (siehe oben): Der Lockfile-Playwright und die vorinstallierten Browser der Cloud-Umgebung passen nicht zusammen.

5. **Vorhandener instabiler Test (kein Produktfehler, nicht durch diesen PR verursacht):** `frontend/tests/browser/pantomime.spec.js:9` liest `tabooThemes` per `count()` direkt nach `page.goto("/")`. Ist die App noch nicht gerendert, weil der Speicher asynchron öffnet, ergibt das 0. Dann scheitert Zeile 34 mit „Expected 0, Received 24“. Das trat einmal im Gesamtlauf unter Last auf; isoliert lief der Test 16/16 grün.

## Integrationsbedarf (für den Integrator)

- **Testrobustheit `pantomime.spec.js`:** Vor dem Zählen auf die gerenderten Kategorien warten, zum Beispiel `await expect(page.locator('.category-grid input[name="category"]').first()).toBeVisible();` vor Zeile 9. Damit wird keine Prüfung abgeschwächt. Die Datei gehört nicht zu diesem Paket.

- **Keine Kernmodule, kein CSS, kein Service Worker und keine Config geändert.** Für Befund 2 ist keine Korrektur nötig, solange der reale Test sie nicht verlangt.
- **WebKit/Safari-Engine:** Weiterhin offen. Laut Auftrag fügt der Integrator ein WebKit-Projekt hinzu. Die neue Spec ist engine-neutral, mit einer Ausnahme: Der Neustart-Test nutzt `chromium.launchPersistentContext`.
- **Zeitbedarf:** Die neue Spec braucht etwa 75 s Laufzeit und erhöht die Testzahl um 14.
- **Optional:** Ein Hinweis in `AGENTS.md` auf den `PLAYWRIGHT_BROWSERS_PATH`-Workaround für Cloud-Sitzungen, oder das Lockfile auf die vorinstallierte Browser-Version abstimmen. Beides ist eine Integrator-Entscheidung.
- `docs/release-checklist.md`: Der Punkt „Explizites Android-Tablet“ kann als **simuliert geprüft** vermerkt werden. „WebKit/Safari“ bleibt offen, ebenso alle Punkte unter „Reale Geräte“.

## Weiterhin offen: reale Prüfungen (nicht automatisierbar)

| Gerät / Aufgabe | Was konkret prüfen | Status |
| --- | --- | --- |
| Zwei Personen nebeneinander, kleines Smartphone (≈ 5,4–6,1″), klassische Karte | Beide lesen gleichzeitig aus normalem Sitzabstand (≈ 50–70 cm) Begriff und alle Tabuwörter fehlerfrei vor. Wertung ohne Fehlgriff, 3 Karten, einmal bei voller und einmal bei gedimmter Helligkeit | offen |
| iPhone Safari + Home-Bildschirm | Installation, Offline-Start im Flugmodus, Safe Areas, Drehung im Zug | offen |
| Android-Handy Chrome | Installation („App installieren“), Offline-Neustart, Bildschirmtastatur bei Teamnamen | offen |
| Android-Tablet hoch/quer | Drehung im Zug, Lesbarkeit aus 1 m, Touch-Ziele | offen (nur simuliert) |
| iPad hoch/quer | wie oben; Split View | offen (nur simuliert) |
| Surface mit/ohne Tastatur | Touch und Maus im Wechsel, Presenter | offen (nur simuliert) |
| Notebook / Monitor | Lesbarkeit für die Gruppe aus Raumentfernung | offen (nur simuliert) |
| Große Systemschrift / Zoom 200 % | Karte, Timer und Wertung bleiben bedienbar | offen |

## Wiederholung

```bash
cd frontend
npm ci && npm run build
CI=1 PW_PORT=4301 npx playwright test tests/browser/QA-DEVICES.spec.js
```

Screenshots je Gerät und Modus landen im jeweiligen Playwright-Ausgabeordner unter `test-results/`; dieser Ordner wird nicht committet.
