# Wortspiel – verbindlicher Integrationsplan

Stand: Audit 2026-10-09. Dies ist der abgeglichene Plan; der ursprüngliche vollständige Plan ist unverändert in [history/plan-v2-2026-10-08.md](history/plan-v2-2026-10-08.md) erhalten. Frühere Häkchen sind keine Abnahmebelege. Technische Belege und PR-Matrix: [integration-status.md](integration-status.md); Ausgangsstand: [audits/2026-10-09-baseline.md](audits/2026-10-09-baseline.md).

## Zusammenarbeit

ChatGPT/Codex ist alleiniger main-Integrator. Der Nutzer hat Claude Code extern gestartet und Cloudflare-Deployment nach der erforderlichen Freigabe ausdrücklich delegiert. Isolierte Aufgaben: [agent-handoffs.md](agent-handoffs.md). QA-DEVICES PR #22 und DEPLOY-CF PR #23 liegen zur Integration vor; QA-STORAGE #21 ist bei Codex aktiv. Andere vorbereitete Aufgaben sind ohne Claim/PR nicht als gestartet zu werten.

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
| A15 | 120 Sportkarten nur auf `v2/A15-sport` | nächstes separates Inhaltsreview, Quelle bleibt erhalten |
| B1/B2/B4/B5 | Regeln und Tests vorhanden, Validierungen/Migrationen eingebunden | B4-Zeitstempel/Ergebnis-Auszeichnungen und B5-Mischmodus-UI weiter offen |
| B3/E4 | Presets, Alters-/Tabu-Auswahl und freie Erklärung eingebunden | Jugendliche können Hauptmodus unabhängig wählen |
| C1–C4/C7/C8 | vorhandene Geräte-/Eingabe-CSS und Rotationstests | echte Geräte/Lesbarkeit noch nicht abgenommen |
| C5/C6 | minimale/teilweise CSS-Dateien | kein fertiger Beamer-/Großbildmodus behauptet |
| C9 | bestehende elf Screens plus Schnellstart-Matrix | Android-Tablet explizit und WebKit als nächster QA-Auftrag |
| D1/E2 | Sound und Wake Lock inklusive Tests integriert | echte Mobilgeräte bleiben offen |
| E3 | neuere Presenter-Version erhalten; fehlende Guards/Tests ergänzt; WebHID-Race korrigiert | echter Spotlight-Test zusätzlich nötig |
| #15 / Schnellstart | ersetzt durch abgesicherte Integration: Schnellstart, optionaler Assistent, Themen-Suche, Replay | kein ungeprüftes Kopieren des Drafts |
| Geräuscheraten | isolierter Claude-Auftrag NOISE-01 vorbereitet | keine halbfertige Produktionsauswahl |
| Internationalisierung | Trennung fachlich dokumentiert | technische Text-Extraktion noch offen |
| Cloudflare | passende Build-Konfiguration anhand aktueller Doku geprüft | Account-/Projektbestand/Preview nicht zugänglich, nicht deployed |
| Android | Capacitor/WebView als spätere Prüfung | keine Verpackung vor Web-Abnahme |

## Nächste verbindliche Schritte

1. INT-A-B abgeschlossen mit PR #16 / main `9c1d9d6`: alle Alt-PRs #1–#15 bewertet und geschlossen, alle Quellbranches erhalten.
2. QA-STORAGE (Integrator): atomarer localStorage-Rückfall, konkurrierende Tabs, alte Fixture-Spielstände, stale scoring; voller Import-/Export-Abgleich.
3. QA-A11Y / QA-DEVICES / NOISE-01: isolierte Aufgaben mit klaren Dateigrenzen; siehe Übergabe.
4. A15-REVIEW: fertigen Sportbranch bewerten; A12/A14 nur nach tatsächlich vorliegenden Inhalten entwickeln.
5. MOBILE-02 (Integrator): Themenbereiche und freiwillige Einführung/Proberunde vervollständigen, Ergebnisstatistik klar ausweisen.
6. I18N-01 (Integrator): Oberflächen- und Kartensprache getrennt implementieren, zunächst de unverändert.
7. RELEASE-01: gesamte [release-checklist.md](release-checklist.md) erfüllen; erst dann stabiler Release-Tag.
8. DEPLOY-CF (Claude): PR #23 / lokale Simulation vorhanden, Zugang fehlt. Codex integriert CF-1/CF-2 mit eigener SW-Abnahme; Claude inventarisiert nach Zugang und prüft das echte Preview; erforderliche Kontoberechtigung und erste öffentliche Cloudflare-Produktion gebündelt freigeben lassen. GitHub Pages bleibt Rückfall.
