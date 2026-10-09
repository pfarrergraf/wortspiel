# QA-STORAGE #21 – Persistenz und verspätete Aktionen

Integrator: ChatGPT/Codex. Basis `9c1d9d6`, Branch `v2/QA-STORAGE-safety`, eigener Worktree, PW_PORT=4211. Wiederherstellung: `backup/main-2026-10-09-pre-storage` auf dem Basis-SHA; keine direkte main-Änderung, kein Force-Push.

## Fehler und Schutz

Auf der Basis konnte ein zweiter Tab seine veraltete Karte werten und damit die inzwischen nächste Karte mitwerten: der bestehende Speicher liest zwar den neuesten State, hatte aber keine Erwartungsrevision. Drei neue Browserfälle reproduzierten dies vor dem Fix (IndexedDB, localStorage/Web Locks, localStorage ohne Web Locks).

`app.change()` bindet die Aktion an den ursprünglich sichtbaren State-Snapshot. `Storage.update()` prüft dessen Revision **innerhalb** der exklusiven Aktualisierung; bei Konflikt kein Mutatoraufruf, keine Punkte/Kartenreservierung, kein Revisionssprung. Die UI übernimmt stattdessen den aktuellen State und bittet, die Karte zu prüfen. Das gilt für Wertung, Undo, Timer, Sessionersatz und Einstellungen. Eigene vorgelagerte Feldspeicherungen im Setup dürfen den Assistenten fortsetzen, solange die gesamte Session unverändert blieb; fremde Revisionen oder Gameplay bleiben gesperrt. Neue Sessions erhalten eine additive ID, alte Sessions ohne ID bleiben gültig.

Alle Storage-Aufrufe eines Objekts sind seriell. Zwischen Tabs läuft ein exklusiver Web Lock mit begrenztem Warten; eine bereits erworbene Sperre wird niemals per Timer entzogen. Ohne Web Locks verwendet der Rückfall Lamport-Bakery-Tickets mit je einem eigenen Register pro Schreiber, stabiler Schlüsselliste und lexikographischer Reihenfolge bei gleicher Nummer. Keine ablaufende Lease, keine automatische Löschung eines fremden Tickets. Schema, Speicherschlüssel und Karten-IDs bleiben unverändert. IndexedDB-transaktionale und lokale Schreiber teilen dieselbe Koordination. Lesbarer Website-Speicher für die Schreibmarkierung und, ohne Web Locks, schreibbare kleine Koordinationstickets sind Voraussetzung; bei verweigertem Zugriff wird vor dem Datenbank-Commit abgebrochen.

Unbekannte/malformed lokale oder Datenbank-Snapshots bleiben erhalten statt durch einen Default-Spielstand ersetzt zu werden. Bei Quota/Mutatorfehler bleibt die letzte lokale Kopie erhalten; ein erfolgreicher IndexedDB-Commit bleibt auch bei fehlgeschlagener Spiegelung gültig. Pagehide bricht einen offenen DB-Schreibvorgang ab, bevor das eigene Fallback-Ticket freigegeben wird.

## Datenbank-Commit ohne lokale Spiegelung

Ein weiterer Fehlerfall wurde vor dem Fix zweimal rot reproduziert und vom automatischen PR-Review unabhängig als P1 gemeldet: ein erfolgreicher Datenbank-Commit bei fehlgeschlagener lokaler Spiegelung erlaubte einem lokalen Rückfall-Tab, die ältere Kopie weiterzuschreiben. Dessen höherer Revisionszähler konnte später den bereits gewerteten Datenbankstand überschreiben.

Vor jedem Datenbank-Commit wird nun `wortspiel.state.v1.pending` mit der beabsichtigten Revision dauerhaft geschrieben. Die Markierung enthält keine Spielinformationen. Sie wird erst nach erfolgreicher lokaler Spiegelung entfernt. Ein lokaler Schreiber mit älterer Kopie verweigert Mutation und Export; die UI verbirgt die alte Karte, stoppt deren Timer und verhindert Rücknavigation zur alten Runde. Ein Tab mit lesbarer Datenbank kann die gesicherte Kopie unter derselben Sperre spiegeln. Fehler beim Journalzugriff oder Ticketanlegen führen vor dem Commit zum Abbruch. Schon zuvor auseinandergefallene Kopien werden nicht anhand des höheren Zählers übernommen, wenn dabei Datenbank-Kartenhistorie verloren ginge. Ein belegter neuerer ausdrücklich bestätigter Gruppenreset bleibt zulässig.

Der Gruppenexport liest einen frischen, geklonten, schreibfreien Snapshot aus dem tatsächlichen Speicher. Eine volle lokale Kopie verhindert damit keine Sicherung der lesbaren Datenbank; veraltete lokale Backups werden verständlich verweigert.

## Historische Fixtures

`frontend/tests/fixtures/QA-STORAGE/` enthält synthetische Spiele, erstellt mit den tatsächlichen damaligen Engines aus `b926e30` und `6de6340`, keine echten Nutzerdaten. Drei Gruppen/Teams, abgeschlossene erste Runde, pausierte zweite Runde, Logs/Punkte/Tabuwortstrafen; dazu altes schema-1-Gruppenbackup, legacy freie Erklärung und aktueller retired Alias Samariter sowie Pantomime. Herkunft und konkrete Abweichung sind im Fixture-README dokumentiert. Tests vergleichen alle bisherigen IDs mit beiden heutigen Pools.

Browserprüfung: originale Startup-Migration, fortsetzen, korrekt werten, Undo und Reload; sämtliche alte Gruppen/Logs/Wertungen/Teams bleiben erhalten, neue gezogene IDs bleiben nach Undo gesehen. Eine reine Engine-Prüfung deckt die sichere Wiederherstellung einer noch laufenden alten Runde zusätzlich ab.

## Tatsächlich ausgeführte Prüfungen

- Isoliertes `npm ci`: erfolgreich.
- Basis: 98 Unit grün; neue stale-Fälle dreimal rot; zusätzliche vorhandene Browserfälle im selben Lauf grün. Der Verzeichnisname matchte zunächst zusätzlich den Dateifilter; später exakte Spec-Suffixe verwendet.
- Zwischenstand: 22 gezielte Desktopfälle grün; Gesamtlauf 128 bestanden, vier neue Fehler in unveränderten Schnellstart-Tests. Ursache war das Revisionsfencing zwischen Blur-Feldspeicherung und Weiter; Produktfix ohne Testabschwächung.
- Danach: 107 Unit grün, Kartenprüfung und Build erfolgreich; 31 gezielte Desktopfälle (28 QA-STORAGE plus 3 bestehende Schnellstartfälle) grün. Voller Lauf danach: 144/144 Browser bestanden, keine skips. Zusätzliche Mixed-Backend-Fälle prüfen nun IndexedDB- und lokale Schreiber in derselben Origin.
- Nach Integration von Claude PR #22: 107 Unit und 170 Browser grün; CI des Zwischenstands `37358ba` erfolgreich. Dieser Stand wurde wegen des anschließend belegten Spiegelungsfehlers ausdrücklich nicht gemergt.
- Journal-Fix: 54 gezielte Desktopfälle grün (44 QA-STORAGE plus vorhandene Spiel-/Schnellstartfälle); vorher zwei neue Journal-Repros rot. Zusätzliche Fälle prüfen Backend-Mischung, bestehende widersprüchliche Kopien, expliziten Reset, Journal-/Ticket-Verweigerung, schreibfreien Snapshot und ausgeblendete blockierte Karte.
- Finale Gesamtsuite und CI: Ergebnisse im Abschlusskommentar des Integrations-PR; erst deren Erfolg erlaubt main-Integration.
- Chromium 156 (Playwright Build 1248) unter Node 24 lokal, Node 22 in CI. Keine Chrome-Symlinks oder Lockfile-Upgrades nötig.

## Bekannte Grenzen / Wiederherstellung

Bei abruptem Prozessabsturz ohne Pagehide kann **ohne Web Locks** ein Fallback-Ticket übrig bleiben. Nach fünf Sekunden endet der nächste Zugriff mit verständlichem Fehler; niemand darf ein fremdes Ticket per TTL entfernen, weil ein eingefrorener Tab später weiterschreiben könnte. Native Web Locks werden vom Browser beim Prozessende freigegeben. Sichere manuelle Wiederherstellung für den seltenen Fallback: erst alle Wortspiel-Tabs/Prozesse stoppen, dann ausschließlich `wortspiel.state.v1.lock:*` entfernen; niemals `wortspiel.state.v1`, `wortspiel.state.v1.pending`, IndexedDB, Gruppen oder Kartencaches löschen. Eine vorhandene Pending-Markierung muss durch Spiegelung des lesbaren Datenbankstands aufgelöst werden, nicht durch manuelles Entfernen. Eine geführte explizite Wiederherstellungsaktion ist noch ein Folgepaket, keine stillschweigende Freigabe für automatisches Entsperren.

Reale Geräte/Mikrofon/WebKit bleiben weitere Release-Gates. Die Test-Fixtures sind historische Strukturen, keine Zustimmung zur Änderung realer Nutzerstände. Kein Cloudflare-Deploy und keine neue Berechtigung in diesem Paket.

## Kompatibler Vollbackup-Entwurf (noch nicht implementiert)

Bestehender Export bleibt `app: wortspiel`, `schema: 1`, `groups`; bestehender Import vereinigt Historien und ersetzt keine laufende Partie/Einstellungen. Erweiterung später: optionales `snapshot: { settings, session }` mit separater Formatversion und vollständig validiertem Snapshot; alte Gruppenbackups bleiben gültig, ältere Clients können die Zusatzfelder ignorieren. UI trennt „Historie zusammenführen“ (Standard) von „Partie wiederherstellen“ (explizite Bestätigung), niemals automatisch laufende Partie überschreiben. Vor Wiederherstellung zunächst alle Gruppenhistorien vereinigen, die aktuelle und sämtliche Logkarten reservieren, laufende Runde pausieren, Punkte unverändert übernehmen. Revision und Geräte-/Presenter-Zustand werden nicht aus der Fremd-Origin übernommen. Vollständige Prüfung vor jeder Mutation. Keine neue Schema-Version oder Karten-ID-Umbenennung notwendig.

Dieser Entwurf macht derzeit keine laufende Partie exportierbar. Claude muss beim Cloudflare-Originwechsel weiterhin auf den vorhandenen Gruppen-/Historienexport verweisen.
