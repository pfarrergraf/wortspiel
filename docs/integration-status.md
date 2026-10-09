# Integrationsstatus – Audit 2026-10-09

Basis `main`: `6de6340710de3f389f8de3ba1819123dc4c9a977`. Sicherung `backup/main-2026-10-09`. Branch `integration/2026-10-09-audit`. Baseline-Commit `9a7a938`; Kartenintegration `19be010`; Regel-/UI-/Presenterintegration `18a9f2e`. Integration: [PR #16](https://github.com/pfarrergraf/wortspiel/pull/16). Der Abschlusskommentar dort dokumentiert den tatsächlichen main-Merge-SHA, CI-Lauf und die Schließung der Alt-PRs. GitHub ist die verbindliche Quelle dieses veränderlichen Abschlussstatus.

## PR-Matrix

Kategorien: **1** vollständig enthalten; **2** durch neuere Implementierung ersetzt; **3** teilweise übernommen; **4** sinnvoll fehlend; **5** funktionaler Konflikt; **6** fehlerhaft/überholt. Ein Eintrag kann mehrere Aspekte ausweisen. Kein Alt-PR wird blind mit seiner alten Basis gemergt.

| PR | Funktion / geänderte Dateibereiche | Stand gegen Baseline-main | Risiko | Tests / Ergebnis | Entscheidung und Ziel | Beleg / Begründung |
| --- | --- | --- | --- | --- | --- | --- |
| #1 | B4, rules/stats.js, B4.test, Claim | 1: byte-identisch | niedrig | B4 und Gesamt-Unit grün | erledigt schließen; Basis-SHA | alle drei geänderten Dateien identisch; E7-Auszeichnungen/Zeitstempel bleiben eigene Aufgabe |
| #2 | B1, rules/audience.js, B1.test, Claim | 1: byte-identisch | niedrig | Alters-/Migrations-/Historientests grün | erledigt schließen; Basis-SHA | Engine-Validierung und Boot-Migration bereits eingebunden |
| #3 | B2, rules/taboo.js, B2.test, Claim | 1 plus neuere Pantomime-Beschriftung | mittel bei Überschreiben | B2 + Pantomime grün | erledigt schließen; Basis + 18a9f2e | einzige Baseline-Differenz ergänzt Gesprochen; nicht rückwärts kopieren; freie Primärspielart additiv |
| #4 | B5, rules/modes.js, B5.test, Claim | Module 1; Integrationsbedarf 3 | mittel | B5 + neuer Modus/Undo-Test grün | gezielter Log-/Undo-Fix 18a9f2e; dann schließen | fehlender Modus im Log additiv ergänzt; Misch-UI ausdrücklich außerhalb dieses Releases |
| #5 | A18, data/age-tags.json, Claim | 3: 673/673 Wörter, Powerbank ab12 statt Review-ab10 | niedrig | Import, B1, Metadatenvergleich grün | einzigen Review-Unterschied übernehmen; 19be010 | Wortmenge identisch; keine fremden Metadaten überschrieben |
| #6 | D1, sound.js, D1.test, Claim | 1: byte-identisch | mittel bei Rückwärtskopie | Fake-AudioContext/Signale grün | erledigt schließen; Basis-SHA | main importiert die identische getestete Engine bereits |
| #7 | E2, wakelock.js, E2.test, Claim | 1: byte-identisch | niedrig | 15 Lifecycle-/Race-Tests grün | erledigt schließen; Basis-SHA | main importiert Wake Lock bereits |
| #8 | E3, shortcuts.js, E3.spec, Claim | 2/3: jüngere Presenter-Implementierung; Guards/Tests fehlten | hoch | E3 + Presenter/WebHID grün | neuere Steuerung erhalten; Guards und angepasste Tests 18a9f2e | PageDown/Handover/Spotlight erhalten; Hilfe pausiert, IME/contenteditable/repeat geschützt; ältere Tests an native Fokussierung und tatsächliche Presenter-Regeln angepasst |
| #9 | A17, faith-plus.json, Claim | 3: 80/81 Datensätze; Diakonin und retired Samariter fehlten | mittel | Karten-/Alias-/ID-Tests grün | gezieltes Inhaltsreview übernehmen; 19be010 | doppelte Erklärung zu Barmherziger Samariter: alte ID bleibt, neue eigenständige Diakonin |
| #10 | A09, future.json, Claim | 3: 110/116; sechs Ersatzbegriffe/retired fehlten | mittel | Karten-/Alias-/ID-/Importtests grün | fehlendes Review übernehmen; 19be010 | sechs semantische/schreibähnliche Varianten ausgemustert; ID erhalten; sechs eigenständige Ersatzbegriffe hinzugefügt |
| #11 | A10, planet.json, Claim | 1: semantisch und byte-identisch | niedrig | Kartenprüfung und bestehende ID-Tests grün | erledigt schließen; Basis-SHA | 100 Karten vollständig vorhanden |
| #12 | A11, camp.json, Claim | 1: semantisch und byte-identisch | niedrig | Kartenprüfung grün | erledigt schließen; Basis-SHA | 100 Karten vollständig vorhanden |
| #13 | A16, food-plus.json, Claim | 4: fehlt vollständig | mittel wegen Cross-Duplikaten | Import/Bestandsschutz/ID grün | 80 Quelldatensätze übernehmen; 19be010 | Zuckerwatte nur Kategorie-Ergänzung; fixierte Vorrangfolge verhindert Überschreiben |
| #14 | A13, fantasy.json, Claim | 4: fehlt vollständig | mittel | Karten-/retired-/ID-Tests grün | 101 Datensätze, 100 aktiv übernehmen; 19be010 | Alice-Kurzvariante retired; Literatur-ID bleibt gültig; neue Spukhaus-Karte |
| #15 | mobile-wizard, setup, main, pantomime, CSS | 5/4: Draft-CI rot, bislang nicht integriert | hoch | neues Setup/Replay/free + Matrix grün | geprüfte Ersatzintegration 18a9f2e; Draft danach mit Beleg schließen | Formular-sections überschrieben none; versteckte Pflichtfelder; fehlende Altersauswahl im Schritt Zielgruppe. Neuer Assistent im bestehenden Formular, expliziter Einstieg, native Validierung, Browser-Zurück, freie Moduswahl |

Exakter Dateivergleich mit allen Head-SHAs: [audits/2026-10-09-pr-files.json](audits/2026-10-09-pr-files.json). JSON-Pakete in kompakter Repository-Formatierung übernommen; semantischer Vergleich statt bloßem Textdiff. Roh-Branches bleiben erhalten. Schließung ausschließlich nach geprüfter Zielintegration auf main, mit eigenem Kommentar je PR und ohne Branch-Löschung.

## Arbeitspakete und tatsächlich ausgeführte Prüfungen

1. **Audit/Sicherung, 9a7a938:** Remote-Rückfall, vollständige Branch-/PR-/CI-/Pages-Inventur; Baseline 92 Unit, 53 Browser bestanden, vier vorhandene skips. Anfangs Chrome-Umgebungsfehler getrennt dokumentiert. Keine Codeänderung davor.
2. **Karten, 19be010:** neue Pakete und fehlende Reviews. Neuer Stand 2.744 Erklärungskarten in 24 Kategorien, 2.736 aktiv. 187 zusätzliche eindeutige IDs. Pantomime unverändert 1.435 Wörter / 16 Kategorien. Keine der 2.557 bisherigen IDs verloren, sämtliche bisherigen Texte/Tabuwörter/Schwierigkeiten/Quellen unverändert. Genau diese Baseline-Änderungen: Powerbank ageMin 12→10; sieben begründet retired; Zuckerwatte gewinnt Kategorie food. Kartenprüfung, Build, 95 Unit und 53 ausführbare bestehende Browserfälle grün.
3. **Regeln/UI, 18a9f2e:** Modus/Undo, atomare reine Importvalidierung, freies Erklären und Settings-Abgleich, Replay, optionaler Fünfschritt-Assistent und Suche; Presenter erhalten/geschützt, WebHID-Listener vor Umleitung. 98 Unit und voller Lauf 88 Browsertests grün, keine skips. Alte `test.fixme` aktiviert; keine bestehenden Prüfungen entfernt. Testanpassungen prüfen reale aktuelle Regeln statt alter PR-Regeln.
4. **Visuelle Nachprüfung:** Screenshot zeigte nach Rundenstart eine Scrollposition oberhalb des Timers. Startaktion scrollt jetzt nach abgeschlossenem Render auf Anfang; freie Matrix prüft zusätzlich obere/seitliche Grenzen. Elf strengere Matrixfälle bestanden (21.7 s), Commit `8aad640`.

Ein fehlgeschlagener erster Karten-Unit-Lauf deckte die alte Annahme „all enthält retired“ auf. Die Prüfung fordert nun exakt alle nicht retired Karten sowie exakt acht dokumentierte retired IDs. Ein früher Setup-Test klickte ein absichtlich überlagertes Radio statt dessen Label; korrigiert ohne force-Klick. Geerbte E3-Tests warteten nicht auf persistierten Handover; ergänzt um sichtbare Ready-Bedingung. Ein versehentlicher paralleler E2E-Start scheiterte an Port 4173; verworfen und vollständig seriell wiederholt. Diese Test-/Umgebungsprobleme werden nicht als Produkt-Baselinefehler gezählt.

## Grenzen und nächste Schritte

- Keine Claude-Code-CLI/Sitzung aufrufbar; konkrete Aufgaben sind vorbereitet, nicht im Hintergrund gestartet.
- Cloudflare-Projektbestand mangels Accountzugriff unbekannt, kein Preview/Produktionsdeploy. Aktuelle Build-Dokumentation geprüft; Konto-/Publikationsfreigabe erst nach konkreter Vorbereitung.
- Reale gemeinsame Lesbarkeit durch zwei Personen nicht getestet. Chromium-Screenshots ersetzen sie nicht.
- Multi-Tab-Abnahme (insbesondere localStorage-only und verspätete Wertung) sowie ältere vollständige Fixtures und echtes lokales Mikrofon bleiben eigene Pflichtprüfungen.
- A12/A14 Remote-Branches besitzen nur Claims, keinen fertigen Inhalt. A15 `578761d` enthält 120 Sportkarten und bleibt für einen separaten Review erhalten.
- Themenbereiche, freiwillige Proberunde, UI-/Kartensprache-Trennung, Geräuscheraten und Android bleiben konkrete Folgepakete; keine unfertigen Produktionsbedienelemente.
- **Kein stabiler Release-Tag** vor gesamter Abnahme; siehe release-checklist.md. Phase A/B und vollständige Release-Freigabe getrennt bewerten.

## GitHub-Aufträge

Vorbereitet und nicht gestartet: [NOISE-01 #17](https://github.com/pfarrergraf/wortspiel/issues/17), [QA-A11Y #18](https://github.com/pfarrergraf/wortspiel/issues/18), [QA-DEVICES #19](https://github.com/pfarrergraf/wortspiel/issues/19), [A15-REVIEW #20](https://github.com/pfarrergraf/wortspiel/issues/20). [QA-STORAGE #21](https://github.com/pfarrergraf/wortspiel/issues/21) bleibt exklusiv beim Integrator.

## Parallele Folgepakete 2026-10-09

- **QA-STORAGE #21 / Codex:** eigener Worktree und Claim, Rückfall `backup/main-2026-10-09-pre-storage` auf `9c1d9d6`. Revisionsfencing, exklusive Speicherschreiber, sichere Abbruch-/Quota-/Formatfälle, historische vollständige Fixtures und kompatibler Vollbackup-Entwurf. Basis-Repro: drei stale Fälle rot; gezielte Prüfung nach Korrektur grün. Lokaler vollständiger Stand vor zusätzlichen Mixed-Backend-Fällen: 107 Unit und 144 Browser ohne skips; PR #24: Zwischenstand 107 Unit/170 Browser grün, danach ein belegter P1-Spiegelungsfehler; PR bis zum Journal-Fix wieder Draft. Persistente Schreibmarkierung, schreibfreier frischer Export und Quarantäne widersprüchlicher Historien ergänzt; 54 gezielte Desktopfälle grün. Exaktes finales Ergebnis/Merge/CI im Abschlusskommentar des PR. Alte bestehende Schnellstart-Tests deckten eine eigene Zwischenregression auf; Blur-/Wizard-Queue korrigiert, Tests unverändert erhalten.
- **Claude QA-DEVICES [PR #22](https://github.com/pfarrergraf/wortspiel/pull/22):** 14 neue Fälle, Android-Tablet/Rotation/drei Modi, Unterpfad/PWA, Offline-Browser-Neustart und SW-Update. Lokale Simulation sauber von realer Prüfung getrennt. Nach Review und grüner CI integriert: main `35389e3c96a2442a9a3e38fc929e6136cde1c3c2`. Keine parallele Änderung der Claude-Dateien. Die gemeldete alte Pantomime-Test-Race repariert Codex in PR #24, ohne Assertions zu ändern.
- **Claude DEPLOY-CF [PR #23](https://github.com/pfarrergraf/wortspiel/pull/23):** Claude meldet verbundenen Cloudflare-Connector für Workers/D1/KV/R2, aber keine Pages-Tools. Pages-Projektbestand bleibt unbekannt; kein echtes Pages-Deployment. Lokale Pages-Simulation meldet CF-1 (Redirect `/index.html` im Offlinecache), CF-2 (Header plus nicht ausgelieferte `_headers`) und Inline-Startfehler-Handler unter CSP. Codex übernimmt den SW-/Core-Bedarf mit neuem Claim; Hosting bleibt bei Claude nach Freigabe.
- **Grenzen:** Vollbackup nur Entwurf; seltene Fallback-Absturz-Entsperrung braucht einen expliziten Ablauf. Reale Geräte/Lesbarkeit, WebKit/Mikrofon und echtes Cloudflare-Preview bleiben Release-Gates. Kein Release-Tag.

## Geprüfte Folgepakete – 2026-10-09

- **QA-STORAGE [PR #24](https://github.com/pfarrergraf/wortspiel/pull/24), Head `1e162fb`:** 107 Unit/190 Browser ohne skips lokal **und** in [exakter Node-22-CI](https://github.com/pfarrergraf/wortspiel/actions/runs/37996643946). Review-P1 bei DB-Commit ohne lokale Spiegelung nach rotem Repro behoben; persistentes Journal, spätere lokale Rückfälle gesperrt, divergierende Historien erhalten, Export schreibfrei/frisch. Geführte Reparatur und Vollbackup bleiben offen.
- **CF-1 [PR #25](https://github.com/pfarrergraf/wortspiel/pull/25):** 109 Unit/196 Browser ohne skips lokal, Karten/Build grün; drei neue Repros vor Fix rot. Echter lokaler Wrangler-4.149.0-Pages-Simulator: Header, 308, Offline Root/index/Query und CSP-Retry erhalten Daten. Claude-Hostingdateien nicht verändert. Kein echtes Cloud-Deployment.
- Verbindliche Merge-SHAs und abschließende exakte CI jeweils im PR-Abschlusskommentar. Backup-/Quellbranches bleiben erhalten. Stabile Release-Abnahme weiterhin offen, kein Release-Tag.

- Erneuter QA-STORAGE-Review vor Merge fand ältere lokale Zusatzhistorien und ungültige Zähler: neun Repros rot, Fix d7a4858; 56 gezielte Desktopfälle grün. Beide PRs ziehen den Fix nach. Finale Sollsuite QA-STORAGE 107 Unit/208 Browser, CF-1 109 Unit/214 Browser. Verbindliche tatsächliche Ergebnisse/CI/Merge wie oben im jeweiligen Abschlusskommentar; fehlerhafte Zwischenstände wurden nicht integriert.
