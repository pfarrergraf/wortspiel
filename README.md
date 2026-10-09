# Wortspiel — Alles sagen. Fast alles.

Ein buntes, kostenloses Spiel zum Begriffe-Erklären für eine Gruppe an **einem Smartphone, Tablet oder Laptop**. Eine Person erklärt den Begriff, ohne die verbotenen Wörter zu benutzen; ihr wertet über große Spieltasten.

**Spielen:** https://pfarrergraf.github.io/wortspiel/

## Was die aktuelle Webversion kann

- 2.744 deutsche Erklärungskarten in 24 Themenpaketen, davon 2.736 aktiv und acht begründet ausgemusterte Begriffsvarianten mit erhaltenen IDs. Zusätzlich 1.435 Pantomime-Wörter in 16 eigenen Kategorien.
- Drei Schwierigkeitsstufen: **Leicht** (1.133 aktive Karten), **Mittel** (1.962 einschließlich der leichten) und **Alles / knifflig** (2.736 aktive Karten). Die Zähler berücksichtigen zusätzlich Altersgruppe, Themen und Kartenspeicher.
- Schnellauswahlen **Jugendliche**, **Konfis** und **Gemischte Runde**. Konfis kombiniert die leichte Auswahl mit Grundlagen aus Glaube & Kirche; Jugendliche verwendet Alltagsthemen ohne das Kirchenpaket. Themen und Stufe bleiben frei anpassbar.
- Zwei bis sechs frei benennbare Teams, Rundenzeit von 30 bis 180 Sekunden, einstellbare Runden pro Team und Punkteabzüge.
- Erraten, Überspringen und Tabuwort; Pause, verdeckte Karte, Rücknahme der letzten Wertung, Rundenprotokoll und Ergebnisübersicht.
- Gruppenbezogener Kartenspeicher ohne Ablaufdatum. Bereits **angezeigte** Karten werden gespeichert, auch bei Überspringen oder vorzeitigem Rundenende. Neue Partien und App-Updates löschen ihn nicht. Ist ein Paket ausgespielt, gibt es keine automatische Wiederholung.
- Manueller Reset je Gruppe, JSON-Sicherung aller Gruppen und zusammenführender Import auf demselben oder einem anderen Gerät.
- Offline nach dem ersten vollständigen Laden; installierbare PWA, einschließlich lokal bereitgestellter Schriftarten. Auf „Offline bereit“ warten, bevor die Internetverbindung getrennt wird.
- Optionale lokale Spracherkennung, **standardmäßig ausgeschaltet**, mit ausdrücklichem `processLocally: true`. Kein automatischer Cloud-Fallback, keine Transkriptionskosten. Nur Browser mit lokaler Verarbeitung und deutschem Sprachpaket bieten diese Funktion an.

Die Spracherkennung gibt Hinweise auf gehörte Begriffe. Sie kann erklärende und ratende Personen nicht unterscheiden und vergibt deshalb keine Punkte automatisch. Die manuelle Wertung bleibt immer verfügbar. Ein echtes Android- oder iOS-Gerät mit Mikrofon wurde nicht für die Sprachfunktion getestet; Browserunterstützung ist experimentell.

## Schnellstart und Spielarten

Oben stehen „Letzte Einstellungen verwenden“ beziehungsweise „Nochmal spielen“, „Neue Partie vorbereiten“ und „Spiel anpassen“. Eine laufende Partie kann weiter über „Partie fortsetzen“ geladen werden. „Nochmal spielen“ übernimmt den letzten Partie-Snapshot, einschließlich Teams, Altersgruppe, Themen, Zeit und Wertung. Laufende Partien werden nur nach Bestätigung ersetzt. Bereits gesehene Karten bleiben gesperrt, auch wenn die Auswahl erschöpft ist.

Die freiwillige geführte Vorbereitung hat fünf Schritte: Spielart, Altersgruppe, Teams, Themen und Spielstart. „Alle Einstellungen“ bleibt erreichbar. Die Themensuche verändert keine Auswahl; „Alle auswählen“ und „Alle abwählen“ gelten für den ganzen jeweiligen Kartenpool.

**Klassisch** verbietet die zusätzlichen Tabuwörter; **Frei erklären** verbietet nur den Begriff und seine Wortbestandteile. Auch Jugendliche wählen zwischen beiden. **Pantomime** verwendet einen eigenen Pool ohne Worte und Geräusche, mit 1–3 Punkten je Begriff. Geräuscheraten ist noch nicht veröffentlicht und erscheint nicht als unfertige Auswahl.

## Begriffe passend zur Gruppe

Für eine Konfi- oder Jugendrunde zuerst **Konfis** beziehungsweise **Jugendliche** auswählen. Beide verwenden „Leicht“: gezielt ausgewählte Begriffe aus Schule, Freizeit, Essen, Tieren und Alltag, einschließlich 80 neuer Grundbegriffe. Seltene Personen wie Alison Brie, spezielle Automarken, unbekannte Tierarten und entlegene Gebiete erscheinen dort nicht. „Mittel“ ergänzt mehr Allgemeinwissen und weitere Kirchenbegriffe. Erst „Alles / knifflig“ öffnet den gesamten ursprünglichen Bestand.

Die redaktionelle Einschätzung richtet sich nach vermuteter Bekanntheit und wurde noch nicht mit Jugendgruppen erprobt. Sie ist keine feste Altersfreigabe und bewertet nicht automatisch alle Schwierigkeiten beim Erklären. Eine leichtere Karte kann je nach Vorwissen weiterhin schwierig sein.

Eine laufende Partie behält ihre gewählte Stufe. Für eine neue Auswahl unter „Spielübersicht“ die gewünschten Einstellungen wählen und eine neue Partie starten. Beim Update erhält eine ältere laufende Partie den bisherigen vollständigen Pool; zukünftige Partien sind zunächst auf „Leicht“ eingestellt. Gesehene Karten bleiben über alle Stufen hinweg gesperrt. Wenn die leichte Auswahl ausgespielt ist, zeigt die App das an und wiederholt keine Karten automatisch.

## Eine Woche ohne wiederholte Karten

1. Gebt eurer Gruppe einen festen Namen und verwendet immer denselben Browser beziehungsweise dieselbe installierte App.
2. Spielt beliebig viele Partien. Der Verlauf hat kein zeitliches Ablaufdatum und wird pro Gruppe getrennt gespeichert.
3. Nutzt „Kartenspeicher → Speicher schützen“. Der Browser entscheidet, ob er dauerhaftes Speichern zusagt.
4. Ladet vor und während einer Freizeit Sicherungen herunter. Browserdaten können durch manuelles Löschen, einen privaten Browsermodus oder Speicherdruck verloren gehen. Der Import ergänzt vorhandene Verläufe; er ersetzt oder löscht sie nicht.
5. Nur „Kartenspeicher zurücksetzen“ gibt die gesehenen Karten wieder frei. Die Rücknahme einer Wertung korrigiert Punkte; beide bereits gezeigten Karten bleiben im Verlauf.

IndexedDB speichert den Zustand transaktional **vor** dem Anzeigen einer Karte. localStorage hält zusätzlich eine Kopie bereit und dient als Rückfall, falls IndexedDB nicht verfügbar ist. Ohne funktionierenden dauerhaften Website-Speicher beginnt das Spiel nicht. Gleichzeitig geöffnete Tabs lesen Änderungen; für eine laufende Runde empfehlen wir ein einzelnes Fenster.

## Lokal starten

Voraussetzung: Node.js 22 oder neuer und npm.

```powershell
cd frontend
npm ci
npm run dev
```

Die angezeigte lokale Adresse im Browser öffnen. Für den Offline-Modus wird ein Produktionsbuild benötigt:

```powershell
npm run build
npm run preview
```

Der Build liegt unter `frontend/dist`. Er läuft auch unter einem Unterpfad, etwa `/wortspiel/`, und braucht kein Backend.

## Tests

```powershell
cd frontend
npm test
npm run build
npm run test:e2e
```

Die lokalen Browsertests benutzen standardmäßig installierten Google Chrome. Alternativ `npx playwright install chromium` und `CI=1 npm run test:e2e` verwenden. In GitHub Actions wird Chromium installiert. Getestet werden die Spielregeln einschließlich Zeitgrenze, eine Woche ohne Wiederholung, getrennte Gruppen, Undo, ausgespielte Pakete, Import und Reset. Die Browsertests prüfen mobile und Desktop-Ansichten, Tasten, pausierte Fortsetzung nach Reload, Sicherungsimport, Offline-Spiel und Einstellungen. Zusätzlich gibt es einen Test mit einem echten Chrome-Neustart und einem dauerhaften Browserprofil.

Der Audit-Stand und die PR-Entscheidungen stehen in [docs/integration-status.md](docs/integration-status.md). Die Kartenprüfung gehört ebenfalls zur CI: `npm run cards:check`. Die ursprünglichen und aktuellen ID-Fixtures bleiben erhalten. Reale Geräte und gemeinsames Ablesen durch zwei Personen sind noch Teil der [Release-Abnahme](docs/release-checklist.md).

## GitHub Pages

Der Workflow `.github/workflows/pages.yml` prüft und baut die App bei Änderungen auf `main` und veröffentlicht `frontend/dist` über GitHub Pages. Unter **Settings → Pages → Source** muss **GitHub Actions** gewählt sein. Der Quellcode ist öffentlich; Spielstände bleiben auf den Geräten.

Für einen anderen Repository-Namen die Quellcode-Links in `frontend/src/main.js`, diese README und die Repository-Homepage anpassen. Das relative Build-Verzeichnis und der Service Worker funktionieren auch unter einem neuen Unterpfad. Eine neue Domain bedeutet einen neuen Website-Speicher; zuvor die Gruppen exportieren und anschließend importieren. Die Sicherung enthält Gruppenhistorien, keine laufenden Partien; diese zuvor fertigspielen. Cloudflare-Konfiguration und Rückfall sind in [docs/cloudflare-deployment.md](docs/cloudflare-deployment.md) beschrieben; eine Cloudflare-Version ist noch nicht veröffentlicht.

## Quellen und Lizenz

Das Projekt steht unter **GPL-3.0-or-later**; der vollständige Lizenztext liegt in [LICENSE](LICENSE).

- [Kovah/Taboo-Data](https://github.com/Kovah/Taboo-Data), Kevin Woblick und Mitwirkende: deutsche Kartendaten, GPL-3.0-or-later, importierter Stand `02001345db07d7f440103c35ad9ef1ccf83f8065`.
- [Kovah/Taboo](https://github.com/Kovah/Taboo): Referenz für ein Spiel im Browser ohne Backend; kein Anwendungscode übernommen.
- Vorhandene Karten aus `tabu_cards.json` und eigene Ergänzungen für Glaube, Sport, Film und Alltag. Sie sind zusammen mit diesem Projekt unter derselben Lizenz veröffentlicht.
- [Manrope](https://github.com/sharanda/manrope), Mikhail Sharanda: lokal eingebundene Schrift über `@fontsource/manrope`, SIL Open Font License; siehe [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

Leere oder unvollständige Einträge wurden ausgelassen, Texte getrimmt, Begriffe über normalisierte, stabile IDs zusammengeführt und Kategorien bei mehrfach vorkommenden Begriffen ergänzt. Eine Karte kann mehreren Themen angehören; die Sperre gilt für alle ihre Kategorien. Die Illustration auf der Startseite ist eine Beispielkarte und kein Teil des Kartenstapels.

Die Einordnung bestehender Karten ist in `frontend/data/difficulty.json` als ausdrückliche Auswahl gepflegt. Neue, nicht eingeordnete Quelldaten gelangen ausschließlich in „Alles / knifflig“. `frontend/data/easy-cards.json` enthält die 80 neu geschriebenen leichten Karten. Der Import prüft die Einordnungen auf unbekannte und doppelte Begriffe. Für eigene Anpassungen diese Quelldateien bearbeiten und anschließend den Import sowie Tests und Build ausführen.

Um die Kartendatei reproduzierbar neu zu importieren:

```powershell
git clone https://github.com/Kovah/Taboo-Data.git .sources/Taboo-Data
git -C .sources/Taboo-Data checkout 02001345db07d7f440103c35ad9ef1ccf83f8065
node frontend/scripts/import-cards.mjs
```

Das unabhängige Projekt wird unter dem beschreibenden Namen „Wortspiel“ veröffentlicht. Es ist kein offizielles Hasbro-Produkt; es übernimmt weder deren Markenauftritt noch deren kommerzielle Karten.

## Datenschutz und spätere Cloud-Spracherkennung

Kein Tracking, keine Accounts, keine Werbung. Gruppennamen, Einstellungen, Punkte und Kartenspeicher bleiben lokal. Beim Abruf der Website gelten die technischen Zugriffsprotokolle von GitHub Pages. Die lokale Spracherkennung speichert keine Aufnahmen oder Transkripte in der App.

Eine passwortgeschützte Cloudflare-Worker-Erweiterung ist **noch nicht implementiert**. Ihr vorgesehenes Design ist in [docs/cloud-speech.md](docs/cloud-speech.md) beschrieben. Die aktuelle Version enthält keine Cloud-Zugangsdaten und ruft keinen Transkriptionsdienst auf.

Die früheren Python-Desktop-Prototypen im lokalen Arbeitsordner werden für die Web-App nicht benötigt.
