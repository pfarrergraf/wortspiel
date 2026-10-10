# Wortspiel – verbindlicher Integrationsplan

Stand: ludeverbis / UI-COLOR-01, 2026-10-10. Dies ist der abgeglichene Plan; der ursprüngliche vollständige Plan ist unverändert in [history/plan-v2-2026-10-08.md](history/plan-v2-2026-10-08.md) erhalten. Frühere Häkchen sind keine Abnahmebelege. Technische Belege und PR-Matrix: [integration-status.md](integration-status.md); Ausgangsstand: [audits/2026-10-09-baseline.md](audits/2026-10-09-baseline.md).

## Aktueller Hauptstand und neuer Auftrag

main `2f3e6c7`: Zusammenführung, ludeverbis-Umbenennung, Entfernung der Altersgrenzen und fünf Spielarten einschließlich Geräusche/Gemischt abgeschlossen. Cloudflare-Produktion nach konkreter Nutzerfreigabe online unter https://ludeverbis.pages.dev/ . GitHub Pages bleibt identischer Rückfall. Exakte main-CI: 123 Unit und 365 Browserfälle grün; 55 Produktionsfälle, SHA-256-Abgleich aller 26 Dateien auf beiden Hosts und Offline-Update mit unveränderter gespeicherter Partie bestanden. Abschlussnachweise: PR #27, PR #29, PR #30, PR #31 und Issue #26. Nachfolgende ältere Statusabschnitte dokumentieren historische Integrationsschritte.

Neuer Nutzerauftrag AGE-01: **Keine Altersbegrenzungen** für gewöhnliche Begriffe. Leicht / Mittel / Schwer entscheidet über den Wortschatz. Altersauswahl, numerische Preset-Grenzen und Altersfilter entfallen; gespeicherte Legacy-Felder und Partien bleiben unverändert lesbar. Eine Freigabe ausdrücklich sexueller Inhalte benötigt eigene Inhaltskennzeichnung, die das bisherige `ageMin` nicht bietet. Claim und Prüfbericht: [AGE-01](reviews/AGE-01.md). Der kompakte Smartphone-Einstieg aus PR #29 zeigt Spielart, Schwierigkeit und unmittelbaren Start; Teams/Themen/seltene Optionen werden ausdrücklich geöffnet. Die freiwillige Führung benennt Schritt 2 jetzt Schwierigkeit. Schwer bleibt der kumulative Filter `all`; keine zusätzliche Profi-Stufe oder neue Kartenklassifikation.

Neuer Nutzerauftrag PLAY-05: **Geräusche und Gemischt** ergänzen die Auswahl zu fünf Spielarten. 160 konkrete Geräuschbegriffe mit Leicht/Mittel/Schwer, vier geeignete Darstellungsarten im Mischmodus und redundante Symbol-/Farb-/Textanzeige sind implementiert. Karte und Darstellung werden vor Anzeige gemeinsam gesichert; Undo/Neustart und spätere Korrektur behalten den Modus. Gleichartige Wörter aus den drei Pools werden für Gemischt zusammengefasst. Claim und Prüfbericht: [PLAY-05](reviews/PLAY-05.md). Der vorbereitete Issue-#17-Auftrag wird durch den Integrator einschließlich UI/Engine umgesetzt, ohne eine laufende Claude-Sitzung zu behaupten. Technische Integration/Hostingnachweise im PR; menschlicher Geräusch-Ratetest bleibt offen.

Der bestehende B5-Unterbau für explain/pantomime/draw/oneword bleibt für Legacy-Sitzungen erhalten, die neue Spielart Gemischt verwendet Tabu/Frei/Pantomime/Geräusche. Folgeschritte weiterhin: freiwillige Proberunde/Einführung, Ergebnisstatistik, vollständige Partie-/Einstellungssicherung, geführte Absturzreparatur und Geräte-/Barrierefreiheitsabnahme. Kinder-/Film-Pakete A12/A14 besitzen nur Claims; echte redaktionelle Erprobung bleibt separat offen.

Neuer Nutzerauftrag UI-COLOR-01: **Bunter Einstieg statt einer rein komprimierten Auswahl.** Farbige Hintergrundkarte mit „Ludeverbis – Spiele mit Wörtern“, drehendem Ring und fünf farbigen Spielarten mit Symbolen. Native Auswahlfelder bleiben stabil; Bewegung ist pausierbar und respektiert reduzierte Bewegung. Der sichtbare Name „Verbotene Wörter“ ersetzt „Tabu“, interne Formate und alte Partien bleiben kompatibel. Claim und Prüfbericht: [UI-COLOR-01](reviews/UI-COLOR-01.md).

**Android-Auftrag ANDROID-01:** Der Nutzer beauftragt jetzt ausdrücklich Commit, Sicherung und Play-Store-Vorbereitung. Paketname `io.github.pfarrergraf.ludeverbis` ist bestätigt. Die gemeinsame statische Web-App wird mit lokalen Assets in Capacitor/Android gebündelt; getrennte App-Origin, manueller Datei-Export/Import, Hintergrundpause und API 36. Keine Engine-/Storage-/Kartendatenmigration. [Store-Texte und Konto-/Abnahmecheckliste](play-store/console-checklist.md), [Claim](claims/ANDROID-01.md). Der frühere Aufschub der Verpackung ist durch diesen Auftrag aufgehoben. Echte Geräte, menschliche Geräuschtests und die endgültigen Play-Console-/rechtlichen Erklärungen bleiben Pflichtarbeit vor öffentlicher Store-Freigabe; kein automatischer Store-Upload.

## Zusammenarbeit

ChatGPT/Codex ist alleiniger main-Integrator. Der Nutzer beauftragt am 2026-10-10 die Zusammenführung der Online-PRs, aller vorhandenen Branches und lokaler Wertungskorrekturen. Aktives Paket INT-MAIN auf `v2/INT-MAIN-unify`: [Prüfbericht](reviews/INT-MAIN.md). QA-STORAGE #24 und CF-1 #25 sind über PR #28 auf main bcb47b3 integriert; beide letzten Speicherbefunde korrigiert. 112 Unit/Kartencheck/Build und vollständige exakte CI grün. Windows lokal: 304 Browser im ersten Volllauf plus beide SW-Neustartfälle unverändert mit kurzem Profilpfad grün. Nutzer bestätigt ludeverbis, ausschließlich Pfarrer Benjamin Graf als Anbieter und Gemeindekonto für Jugendarbeit; BRAND-01 wird mit INFO-01 über PR #27 integriert. Wrangler-Browserlogin und Pages-Projekt ludeverbis stehen; finales Preview und konkrete erste Produktionsfreigabe bleiben die nächsten Schritte. Quellbranches und Rückfallstände bleiben erhalten. Die folgenden älteren Core-Belege sind historische Zwischenstände, keine neue Merge-Sperre nach abgeschlossener INT-MAIN-Abnahme.

Eine Aufgabe: ID, Akzeptanzkriterien, Dateigrenze, Claim `docs/claims/<ID>.md`, eigener Branch/Worktree, Tests, PR und Integrationsbedarf. Reservierte IDs nicht erneut übernehmen. Gemeinsame Kernmodule und Lockfiles ausschließlich beim Integrator. Keine Force-Pushes, keine unbewiesenen Löschungen, keine automatische Kartenrücksetzung. Neue Abhängigkeiten nur nach Prüfung beim Integrator. Der ausschließlich für Tests generierte `dist/` wird nie committed. Parallele Browsertests nur auf unterschiedlichen `PW_PORT`s **und getrennten Build-Verzeichnissen/Worktrees**.

## Tatsächlich geprüfter Stand

| Paket | Integrationsstand | Abnahmegrenze |
| --- | --- | --- |
| F0–F8 | vorhandene modulare Basis, Claims, Kartenprüfung und Bildschirmmatrix | aktive Architektur erhalten |
| A01–A08 | auf main vorhanden | redaktionelle Jugend-/Altersprüfung offen |
| A09/A17/A18 | Bestand plus fehlende Review-Korrekturen gezielt übernommen | Powerbank ab10; sieben alte IDs begründet retired, keine Löschung |
| A10/A11 | semantisch identisch mit main | kein redundanter Merge |
| A13/A16 | fehlende geprüfte Quellen + Import übernommen | ID-/Metadatenregression geprüft |
| A12/A14 | Remote-Branches enthalten nur Claim | keine fertigen Karten behauptet |
| A15 | 120 Sportkarten in INT-MAIN geprüft und als letzte Quelle integriert | 112 neue IDs; alle alten Metadaten/IDs durch Regression geschützt |
| B1/B2/B4/B5 | Regeln und Tests vorhanden, Validierungen/Migrationen eingebunden | B4-Zeitstempel/Ergebnis-Auszeichnungen und B5-Mischmodus-UI weiter offen |
| B3/E4 | Presets, Tabu-Stufe und freie Erklärung eingebunden; AGE-01 entfernt Altersauswahl und Altersfilter | Legacy-Felder bleiben kompatibel; Inhaltsfreigabe wäre ein eigener Auftrag |
| C1–C4/C7/C8 | vorhandene Geräte-/Eingabe-CSS und Rotationstests | echte Geräte/Lesbarkeit noch nicht abgenommen |
| C5/C6 | minimale/teilweise CSS-Dateien | kein fertiger Beamer-/Großbildmodus behauptet |
| C9 | bestehende elf Screens plus Schnellstart-Matrix | Android-Tablet explizit/Rotation/Offline-Neustart/SW-Update in PR #22 geprüft; WebKit bleibt offen |
| D1/E2 | Sound und Wake Lock inklusive Tests integriert | echte Mobilgeräte bleiben offen |
| E3 | neuere Presenter-Version erhalten; fehlende Guards/Tests ergänzt; WebHID-Race korrigiert | echter Spotlight-Test zusätzlich nötig |
| #15 / Schnellstart | ersetzt durch abgesicherte Integration: Schnellstart, optionaler Assistent, Themen-Suche, Replay | kein ungeprüftes Kopieren des Drafts |
| Geräuscheraten / Gemischt | PLAY-05 implementiert, fünf Spielarten und eigener Pool mit 160 Geräuschbegriffen | technische Integration in PR #31; menschlicher Ratetest bleibt offen |
| Internationalisierung | Trennung fachlich dokumentiert | technische Text-Extraktion noch offen |
| Cloudflare | passende Build-Konfiguration anhand aktueller Doku geprüft | Claude: Direct-Upload-Projekt wortspiel-app und öffentliche Previews nach separater Nutzerfreigabe; echter Patch-Preview geprüft, finales main-Preview und Produktion noch offen |
| Android | ANDROID-01: offline Capacitor-Paket/API 36, APK/AAB/Signierung/Store-Materialien | technische Prüfung im PR; echte Geräte und Play Console vor öffentlicher Store-Freigabe |

## Nächste verbindliche Schritte

1. INT-A-B abgeschlossen mit PR #16 / main `9c1d9d6`: alle Alt-PRs #1–#15 bewertet und geschlossen, alle Quellbranches erhalten.
2. QA-STORAGE (Integrator, PR #24): stale scoring, gemeinsame exklusive Koordination, historische Fixtures, Journal bei fehlgeschlagener Spiegelung und frischer schreibfreier Gruppenexport geprüft. Vollbackup/geführte Absturzreparatur bleiben Folgepakete.
3. QA-A11Y / QA-DEVICES: isolierte Aufgaben mit klaren Dateigrenzen; siehe Übergabe. NOISE-01 ist durch den Nutzerauftrag PLAY-05 / PR #31 ersetzt; menschliche Erprobung der Geräuschbegriffe bleibt offen.
4. A15-REVIEW in INT-MAIN abgeschlossen; A12/A14 besitzen nur erhaltene Claims, Inhalte bleiben eine zukünftige Aufgabe.
5. MOBILE-02 (Integrator): Themenbereiche und freiwillige Einführung/Proberunde vervollständigen, Ergebnisstatistik klar ausweisen.
6. I18N-01 (Integrator): Oberflächen- und Kartensprache getrennt implementieren, zunächst de unverändert.
7. RELEASE-01: gesamte [release-checklist.md](release-checklist.md) erfüllen; erst dann stabiler Release-Tag.
8. DEPLOY-CF (Claude): PR #23 nach Review/CI integriert; tatsächliche Pages-Inventur/Previews in cloudflare-deployment.md. Codex PR #25 behebt CF-1/CF-2 und den Hostinghinweis mit SW-/CSP-Abnahme; Claude inventarisiert nach Zugang und prüft das echte Preview; erforderliche Kontoberechtigung und erste öffentliche Cloudflare-Produktion gebündelt freigeben lassen. GitHub Pages bleibt Rückfall.


## Historischer Core-Zwischenstand 2026-10-10 – 4782a1e

QA-STORAGE #24 und CF-1 #25 bleiben bis vollständiger Abnahme außerhalb von main. 107 Unit/Karten/Build und 98 gezielte Desktopfälle bestanden. Neue Fälle sichern unbekannte Pending-Versionen/Zusatzfelder, ausschließlich dokumentierte Difficulty-Defaults und den realen storage-Eventpfad: fremde rohe Snapshots werden erst gegen die bekannte Basis validiert. Drei echte UI-Repros vor Fix rot, nach Fix grün. Das neue künstliche Pending-Testfixture wartet nun auf den abgeschlossenen Bedienvorgang; keine Assertions abgeschwächt. Zwischenstand #24 178b2d2 bestand lokal 252 Browser, aber CI nur 250/252 wegen dieses Testablaufs; #25 fff08d2 bestand lokal und in CI 38044459172 alle 258 Browser. Diese Belege sind keine Freigabe der neueren Version.

Aktuelle Sollsuiten: #24 107 Unit/278 Browser, #25 109 Unit/284 Browser. Vollständige lokale Ergebnisse, exakte CI und Merge-SHAs im Abschlusskommentar der jeweiligen PR. main ist weiterhin 2eedbea; Rückfall backup/main-2026-10-10-pre-core. Claude-Dokumente/Tests bleiben unverändert; nach tatsächlicher Core-Integration übernimmt Claude das unveränderte finale main-Build ins Preview und dokumentiert dessen Online-Abnahme. Keine öffentliche Produktion/DNS/neuen Berechtigungen/Release-Tag ohne erforderliche Abnahme und Freigabe.
