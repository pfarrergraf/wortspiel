# Wortspiel – verbindlicher Integrationsplan

Stand: Integration 2026-10-10. Dies ist der abgeglichene Plan; der ursprüngliche vollständige Plan ist unverändert in [history/plan-v2-2026-10-08.md](history/plan-v2-2026-10-08.md) erhalten. Frühere Häkchen sind keine Abnahmebelege. Technische Belege und PR-Matrix: [integration-status.md](integration-status.md); Ausgangsstand: [audits/2026-10-09-baseline.md](audits/2026-10-09-baseline.md).

## Zusammenarbeit

ChatGPT/Codex ist alleiniger main-Integrator. Der Nutzer beauftragt am 2026-10-10 die Zusammenführung der Online-PRs, aller vorhandenen Branches und lokaler Wertungskorrekturen. Aktives Paket INT-MAIN auf `v2/INT-MAIN-unify`: [Prüfbericht](reviews/INT-MAIN.md). QA-STORAGE #24 und CF-1 #25 sind im Kandidaten zusammengeführt; die letzten zwei Speicherbefunde sind mit Repros korrigiert. Lokal 112 Unit/Kartencheck/Build grün; vollständige Browserabnahme/CI vor main-Merge. INFO-01 #27 bleibt bis zur konkreten Betreiber-/Veröffentlichungsbestätigung getrennt. Quellbranches und Rückfallstände bleiben erhalten. Die folgenden älteren Core-Belege sind historische Zwischenstände, keine neue Merge-Sperre nach abgeschlossener INT-MAIN-Abnahme.

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
| B3/E4 | Presets, Alters-/Tabu-Auswahl und freie Erklärung eingebunden | Jugendliche können Hauptmodus unabhängig wählen |
| C1–C4/C7/C8 | vorhandene Geräte-/Eingabe-CSS und Rotationstests | echte Geräte/Lesbarkeit noch nicht abgenommen |
| C5/C6 | minimale/teilweise CSS-Dateien | kein fertiger Beamer-/Großbildmodus behauptet |
| C9 | bestehende elf Screens plus Schnellstart-Matrix | Android-Tablet explizit/Rotation/Offline-Neustart/SW-Update in PR #22 geprüft; WebKit bleibt offen |
| D1/E2 | Sound und Wake Lock inklusive Tests integriert | echte Mobilgeräte bleiben offen |
| E3 | neuere Presenter-Version erhalten; fehlende Guards/Tests ergänzt; WebHID-Race korrigiert | echter Spotlight-Test zusätzlich nötig |
| #15 / Schnellstart | ersetzt durch abgesicherte Integration: Schnellstart, optionaler Assistent, Themen-Suche, Replay | kein ungeprüftes Kopieren des Drafts |
| Geräuscheraten | isolierter Claude-Auftrag NOISE-01 vorbereitet | keine halbfertige Produktionsauswahl |
| Internationalisierung | Trennung fachlich dokumentiert | technische Text-Extraktion noch offen |
| Cloudflare | passende Build-Konfiguration anhand aktueller Doku geprüft | Claude: Direct-Upload-Projekt wortspiel-app und öffentliche Previews nach separater Nutzerfreigabe; echter Patch-Preview geprüft, finales main-Preview und Produktion noch offen |
| Android | Capacitor/WebView als spätere Prüfung | keine Verpackung vor Web-Abnahme |

## Nächste verbindliche Schritte

1. INT-A-B abgeschlossen mit PR #16 / main `9c1d9d6`: alle Alt-PRs #1–#15 bewertet und geschlossen, alle Quellbranches erhalten.
2. QA-STORAGE (Integrator, PR #24): stale scoring, gemeinsame exklusive Koordination, historische Fixtures, Journal bei fehlgeschlagener Spiegelung und frischer schreibfreier Gruppenexport geprüft. Vollbackup/geführte Absturzreparatur bleiben Folgepakete.
3. QA-A11Y / QA-DEVICES / NOISE-01: isolierte Aufgaben mit klaren Dateigrenzen; siehe Übergabe.
4. A15-REVIEW in INT-MAIN abgeschlossen; A12/A14 besitzen nur erhaltene Claims, Inhalte bleiben eine zukünftige Aufgabe.
5. MOBILE-02 (Integrator): Themenbereiche und freiwillige Einführung/Proberunde vervollständigen, Ergebnisstatistik klar ausweisen.
6. I18N-01 (Integrator): Oberflächen- und Kartensprache getrennt implementieren, zunächst de unverändert.
7. RELEASE-01: gesamte [release-checklist.md](release-checklist.md) erfüllen; erst dann stabiler Release-Tag.
8. DEPLOY-CF (Claude): PR #23 nach Review/CI integriert; tatsächliche Pages-Inventur/Previews in cloudflare-deployment.md. Codex PR #25 behebt CF-1/CF-2 und den Hostinghinweis mit SW-/CSP-Abnahme; Claude inventarisiert nach Zugang und prüft das echte Preview; erforderliche Kontoberechtigung und erste öffentliche Cloudflare-Produktion gebündelt freigeben lassen. GitHub Pages bleibt Rückfall.


## Historischer Core-Zwischenstand 2026-10-10 – 4782a1e

QA-STORAGE #24 und CF-1 #25 bleiben bis vollständiger Abnahme außerhalb von main. 107 Unit/Karten/Build und 98 gezielte Desktopfälle bestanden. Neue Fälle sichern unbekannte Pending-Versionen/Zusatzfelder, ausschließlich dokumentierte Difficulty-Defaults und den realen storage-Eventpfad: fremde rohe Snapshots werden erst gegen die bekannte Basis validiert. Drei echte UI-Repros vor Fix rot, nach Fix grün. Das neue künstliche Pending-Testfixture wartet nun auf den abgeschlossenen Bedienvorgang; keine Assertions abgeschwächt. Zwischenstand #24 178b2d2 bestand lokal 252 Browser, aber CI nur 250/252 wegen dieses Testablaufs; #25 fff08d2 bestand lokal und in CI 38044459172 alle 258 Browser. Diese Belege sind keine Freigabe der neueren Version.

Aktuelle Sollsuiten: #24 107 Unit/278 Browser, #25 109 Unit/284 Browser. Vollständige lokale Ergebnisse, exakte CI und Merge-SHAs im Abschlusskommentar der jeweiligen PR. main ist weiterhin 2eedbea; Rückfall backup/main-2026-10-10-pre-core. Claude-Dokumente/Tests bleiben unverändert; nach tatsächlicher Core-Integration übernimmt Claude das unveränderte finale main-Build ins Preview und dokumentiert dessen Online-Abnahme. Keine öffentliche Produktion/DNS/neuen Berechtigungen/Release-Tag ohne erforderliche Abnahme und Freigabe.
