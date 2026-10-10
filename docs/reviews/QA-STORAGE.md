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

## Erneuter Review: historische Gegenrichtung und Zähler

Am Zwischenstand `1e162fb` meldete der erneute automatische Review eine zusätzliche P1-Gegenrichtung: gleich/höher revisionierte Datenbank darf eine ältere lokale Kopie mit zusätzlichen IDs nicht überschreiben. Der Gewinner muss nun in beiden Revisionsrichtungen alle Historien des anderen enthalten, außer einem nachweislich neueren bestätigten Reset. P2: negative oder unsichere Revisionswerte werden vor Auswahl abgewiesen; ein ausgeschöpfter Safe-Integer-Zähler darf nicht inkrementiert werden. Zusätzlich bleibt eine gültige lokale Revision 0 erhalten statt dem ebenfalls 0 revisionierten Default zu weichen.

Neun zusätzliche Desktop-Repros waren vor dieser Korrektur rot; nach dem Fix 56 gezielte Desktopfälle grün (53 QA-STORAGE und drei bestehende Schnellstartfälle), 107 Unit/Build grün. Die vorherige vollständige 107/190-Abnahme bezieht sich auf den Zwischenstand, der ausdrücklich **nicht** gemergt wurde. Finale vollständige 208-Browser-Abnahme/exakte CI erst im Abschlusskommentar des PR. Beide ursprünglichen Kopien bleiben bei Konflikt bytegetreu erhalten; auch Startup, Schreiben und Backup-Lesen werden geprüft.

## Abschließender Review – 2026-10-10

Die exakten CI-Läufe der Zwischenstände belegten 107 Unit/208 Browser (QA-STORAGE d7a4858, Run 37997559424) und 109 Unit/214 Browser (CF-1 dfe8cce, Run 37997633887). Die lokalen Langläufe dieser Zwischenstände wurden durch den Umgebungswechsel unterbrochen und werden nicht als vollständig bestanden ausgegeben. Der Review hielt die Core-Integration wegen weiterer belegter Fälle zurück.

Sechs weitere Repros waren vor dem Fix rot: ein fehlgeschlagenes stale Pause darf keinen Ende-Dialog öffnen und keinen fremden neuen Zug abschließen (drei Speicherpfade); ein ausdrücklich bestätigter Reset bleibt nach rückwärts korrigierter Gerätezeit monoton und nach Quota-Spiegelungsfehler wiederherstellbar (Web Locks/Bakery); ein vor einem gültigen Reset entstandener höher revisionierter Fork darf alte Karten nicht wiederaufleben lassen. Der Ende-Dialog bricht nun nach fehlgeschlagener Pause ab, resetAt steigt mindestens gegenüber dem bisherigen Marker, und Historienabstammung verweigert ältere Resetmarker vor der Seen-Mengenprüfung.

Nach Korrektur: 107 Unit/Build und 69 gezielte Desktopfälle grün (59 QA-STORAGE plus vorhandene Spiel-/Schnellstartfälle), keine Assertions entfernt. Finale Gesamtsuite umfasst 220 Browserfälle; tatsächliches Ergebnis/exakte CI/Merge im Abschlusskommentar des PR. Kein bekannter fehlerhafter Zwischenstand wurde gemergt.

## Speicherabstammung statt bloßem Zähler – 2026-10-10

Ein weiterer Review belegte gleich revisionierte lokale Forks, verfrüht gelöschte Pending-Markierung nach Legacy-Schreibversuch und Undo-/Session-Forks mit identischen Seen-IDs. Zehn neue Repros waren vor Korrektur rot; positive Fälle für mehrere echte lokale Aktionen bestanden bereits. Korrektur bleibt im vorhandenen Storage-Modul, Schema 1, mit additivem `_storage`-Marker: kompakter Konsistenzfingerprint des vollständigen Spielstands, letzter Datenbankanker und bei DB-Commit der zuvor gelesene lokale Spiegel. Kein zweiter Spielstate und kein duplizierter Nutzdaten-Payload, keine Authentifizierung/Sicherheitsgrenze. Alle neuen Commits erhalten den Marker; ungeklärte alte Kopien werden nicht durch Zähler/Historien-Teilmenge legitimiert. Identische Altstände bleiben lesbar, inklusive fehlendem altem difficulty-Feld mit bestehender Migration; nur eine vorhandene DB-Kopie wird nicht mit einem frisch erzeugten Default verwechselt.

Ein lokaler Rückfall darf eine Pending-Markierung **niemals** aufgrund gleicher/höherer Revision entfernen: Schreiben/Export bleiben bis zur DB-Spiegelung blockiert. Lokale RAM-/Website-Kopien werden auf Konflikt geprüft; Punkte/Undo/Runden/Session-ID sind Teil des Fingerprints. Unbekannte künftige Marker-Versionen bleiben unangetastet. Bei einem Lineage-Konflikt verbirgt die UI die alte Karte und stoppt deren Timer ohne durable Sessionänderung.

Geprüft: 107 Unit/Karten/Build grün; 83 gezielte Desktopfälle grün, zusätzlich DB-only-Legacy-Wiederaufnahme und Marker-Zukunftsversion/Session-ID/Turn-Fork. Zwei echte Fallback-Serien werden mit sämtlichen Punkten/Historien in DB zurückgeführt. Der unveränderte alte Migrationstest deckte eine Zwischenregression auf; Produktcode erkennt die bekannte difficulty-Omission, keine Testabschwächung. Nur der neue Revision-0-Fixture-Test berücksichtigt den additiven Marker und vergleicht weiterhin alle ursprünglichen Spielfelder exakt. Zwischenstand umfasst 252 Browserfälle; tatsächliches Ergebnis/exakte CI/Review/Merge im Abschlusskommentar. Kopien mit ungeklärter Herkunft brauchen explizite Reparatur; keine automatische Zusammenführung von Wertungen. Vollbackup exportiert künftig keine fremde Storage-Provenienz, sondern erzeugt sie beim validierten Restore neu.

## Geschützte Benachrichtigungen und zukünftige Schreibmarker

Zwischenstand 178b2d2: lokal 107 Unit/252 Browser bestanden, CI 38044290565 dagegen 250/252. Die zwei CI-Ausfälle waren ein neuer Testablauf-Fehler: er entfernte seine künstliche Pending-Markierung vor Abschluss der zuvor geklickten Fortsetzen-Aktion. Er wartet nun auf das Ersetzen des ursprünglichen DOM-Buttons; sämtliche Speicher-/Historien-/Karten-Assertions bleiben erhalten. Die echte Anwendung entfernt fremde Pending-Markierungen weiterhin nie.

Erneuter Review: zukünftige Pending-Versionen bzw. unbekannte Zusatzfelder bleiben bytegetreu erhalten; akzeptiert werden exakt der bisherige `{revision}`-Marker oder `{version:1,revision}`. Schreibvorgänge erzeugen die versionierte Form. Sechs neue Fälle prüfen beide Speicherpfade ohne Mutatoraufruf oder Änderung der Kopien.

Difficulty-Omission vergleicht nur die dokumentierten Defaults (global easy, Session all) als identisch. Andere bekannte Omissionen werden ausschließlich als exakter Nachfolger eines mitgeführten vollständigen Quell-Checkpoints akzeptiert; keine abweichende Kategorie/Punkte/Session darf dadurch legitimiert werden. Vier Fälle prüfen unbewiesene easy/medium-Forks, gültiges all und veränderte Themenauswahl. Der bestehende Migrationstest bleibt unverändert. Eine irrtümliche Prüfung eines nicht vorhandenen session.pool-Feldes wurde anhand der tatsächlichen Engine entfernt; Kartenauswahl basiert auf session.settings.

Der reale main.js-storage-Listener übernahm zuvor rohe Benachrichtigungen vor der Abstammungsprüfung. Drei UI-Repros waren vor Korrektur rot: gültige koordinierte Updates wurden angezeigt, aber auch ein höher revisionierter Legacy-Wertungsfork. Der Listener liest nun zuerst den schreibfreien validierten Snapshot gegen die bisherige RAM-Basis; überholte asynchrone Ergebnisse werden verworfen. Bei Konflikt versteckt er die unsichere Karte/stoppt den Timer, bewahrt beide Kopien und überschreibt die bekannte Basis nicht. Neue Fälle prüfen IndexedDB und lokalen Speicher mit/ohne Web Locks, echte fremde Notifications und anschließendes Fortsetzen.

Nach Korrektur: 107 Unit, Kartencheck/Build und 98 gezielte Desktopfälle bestanden. Gesamtsuite jetzt 278 Browserfälle; endgültige lokale Abnahme und exakte Node-22-CI müssen vor Merge im PR belegt werden. Hauptbranch und alle Claude-Dateien blieben unverändert.
