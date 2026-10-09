# Aktuelle Architektur

## Anwendung und Zuständigkeiten

Die aktive Anwendung ist `frontend/`: JavaScript ES-Module, Vite, Node, Playwright. Keine Serverpflicht, Registrierung oder externen Produktionsassets. `main.js` startet die Anwendung, lädt Feature-Module und migriert gespeicherte Einstellungen. `app.js` besitzt `ctx`, Renderfunktion, Dialoge, Timer und eine serielle Mutationswarteschlange. Feature-Aktionen registrieren sich über `actions.js`; `events.js` verbindet Rendering, Wertung, Sound und Wake Lock.

`engine.js` definiert reine Regeln und führt über `rules/` Altersfilter, Tabu-Stufen, Pantomime und statistische Auswertung zusammen. `ui/` rendert HTML; Einstellungsabschnitte haben `render`/`read`. Der Setup-Assistent verändert die Sichtbarkeit des **bestehenden** Formulars. Kein zweiter State, keine zweite Speicherarchitektur. Sein Schritt und die Themensuche sind flüchtiger UI-Zustand; FormData liest auch ausgeblendete Felder. Native Pflichtfeldvalidierung blendet das betreffende Feld vorher ein. Der Browser-Zurück-Verlauf navigiert durch Vorbereitungsschritte.

## Spielarten

- `gameMode: taboo` mit `tabooMode: classic` oder `light`: erklärende Person und kontrollierende Person lesen dieselbe Karte.
- `gameMode: free`, `tabooMode: none`: dieselben Erklärungskarten, keine zusätzlichen Tabuwörter. Begriff und Bestandteile bleiben verboten.
- Ältere Partien `gameMode: taboo`, `tabooMode: none` bleiben gültig und spielen weiter frei. Ihre gespeicherten Wertungen und Auswahl werden nicht umgeschrieben.
- `gameMode: pantomime`: eigene Kategorien `pm-*`, eigene IDs `de:pantomime:*`, 1–3 Punkte je Wort.
- `settings.modes`/B5 ist vorhandene Logik für spätere Mischvarianten. Keine unfertige neue Auswahl in der veröffentlichten UI. Logs speichern den gezogenen Modus additiv; Undo stellt ihn mit der Karte wieder her. Legacy-Logs verwenden den passenden Rückfall.
- Geräuscheraten, Zeichnen als eigenständiger Hauptmodus und Englisch sind noch nicht integriert. Geräuscheraten bleibt bis zur Prüfung vollständig außerhalb des Releases.

## Speicher und Lebenszyklus

Schema 1; DB `wortspiel`, Store `state`, Schlüssel `wortspiel.state.v1`. IndexedDB aktualisiert Lesen/Ändern/Schreiben in einer readwrite-Transaktion. localStorage ist Kopie und Rückfall. Gruppen-IDs normalisieren Namen; `group.seen` enthält Karten-ID → Zeitstempel, ohne Ablaufdatum. Eine Karte wird **vor Anzeige** reserviert. Undo korrigiert Punkte und zeigt eine frühere Karte wieder; keine Historie wird gelöscht. Reset erfordert weiterhin ausdrückliche Bestätigung nur für die ausgewählte Gruppe.

Einstellungen für die nächste Partie und `session.settings` sind separate Snapshots. „Nochmal spielen“ verwendet den Session-Snapshot, sonst die letzten Einstellungen. Laufende Partien erfordern vor Ersatz einen Dialog; dessen pending settings sind flüchtig und erst bei bestätigtem, erfolgreichem Erstellen gespeichert. Erschöpfte Kartenpools lösen einen Fehler ohne Reset aus. Hilfe und Tab-/Sichtbarkeitswechsel pausieren die Runde.

Export/Import sichert und vereinigt derzeit **Gruppenhistorien**, keine komplette laufende Partie und keine Team-/Setup-Sicherung. Der gesamte Import wird vor Veränderung einer Gruppe validiert. Historien-IDs `de:*` umfassen auch Pantomime und bleiben unabhängig von aktuellen Kategorien erhalten. Website-Speicher ist originbezogen; Hostingwechsel benötigt expliziten Export und Import.

QA-STORAGE ergänzt eine gemeinsame exklusive Schreibkoordination: Web Locks, andernfalls pro-Schreiber-Bakery-Tickets ohne unsichere Lease-Ablaufzeit. Lesen/Prüfen/Ändern/Schreiben und lokale Spiegelung liegen innerhalb dieser Sperre; IndexedDB behält zusätzlich seine readwrite-Transaktion. Gemischte IndexedDB-/localStorage-Tabs nutzen dieselbe Koordination. Jeder UI-Auftrag bindet sich an seine ursprüngliche Revision; ein fremder neuer State wird angezeigt, aber nicht mit der alten Aktion gewertet. Eigene vorbereitende Feldspeicherungen dürfen einen queued Assistentenschritt fortsetzen, wenn die komplette Session unverändert blieb; neue Sessions besitzen eine additive ID, ältere Sessions ohne ID bleiben gültig.

Unbekannte/malformed gespeicherte Formate bleiben unverändert statt durch Defaults ersetzt zu werden. Ein blockierter Zugriff endet nach fünf Sekunden ohne Mutation. Ohne Web Locks kann ein abrupt abgestürzter Schreiber ein Koordinationsticket hinterlassen; sicheres explizites Entsperren nach dem Stoppen aller anderen Tabs bleibt ein Folgepaket. Niemals per TTL fremde Tickets oder Spielstände löschen. Details und Vollbackup-Entwurf: [reviews/QA-STORAGE.md](reviews/QA-STORAGE.md).

## Kartenquellen und Reproduktion

`src/data/cards.json` ist generiert aus gepinntem Kovah-Stand `02001345db07d7f440103c35ad9ef1ccf83f8065`, `tabu_cards.json`, Ergänzungen, Schwierigkeit, Alterstags und `data/packs/*.json`. `data/pack-order.json` fixiert die Vorrangfolge veröffentlichter Quellen; neue Pakete werden hinten ergänzt. Gleiche ID erhält zusätzliche Kategorien, aber keine neuen Texte, Tabuwörter oder Metadaten aus einem späteren Paket. IDs entstehen weiter aus der normalisierten deutschen Wortform. Semantische Aliase werden mit begründetem `retired` erhalten.

`src/data/pantomime.json` bleibt eine separate, zur Laufzeit eingebundene Quelle. Bestehende ID-Fixtures sichern v1, alle 2.557 Erklärungskarten der Audit-Baseline und alle veröffentlichten Pantomime-IDs.

## Offline, Eingabe und spätere Erweiterungen

Build enthält lokale Fonts/Icons, Manifest und generierten content-gehashten Service Worker. Relativer Vite-base `./` ermöglicht GitHub-Pages-Unterpfad und Cloudflare-Root. Der Worker cached den kompletten Build, keine Browser-Spielstände. Cachewechsel löscht ausschließlich alte App-Asset-Caches.

Presenter/Tastatur klicken dieselben Wertungsaktionen mit Entprellung. WebHID-Lernen registriert den Empfänger **vor** Umleitung der Tasten. LocalSpeech akzeptiert nur explizite lokale Verarbeitung; ausgeschaltet als Standard, kein Cloud-Fallback, niemals automatische Punkte. Hinweise verwenden die aktuell sichtbaren Tabuwörter, bei Pantomime hört der Helfer nicht zu.

Vorbereitung späterer Arbeit: UI-Sprache und Kartensprache künftig getrennte Felder/Module, deutsche IDs unverändert; keine naiven Kartenübersetzungen. Eine Capacitor-/WebView-Verpackung erst nach mobiler Web-Abnahme. Noch keine Android-Abhängigkeiten, Signierung oder Play-Console-Konfiguration.
