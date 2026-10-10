# AGE-01 – Schwierigkeit ohne Altersgrenzen

- Agent: Codex, alleiniger Integrator; keine parallele Sitzung.
- Datum: 2026-10-10. Branch: `v2/AGE-01-no-age`.
- Basis: main `350365e1cc56a5b277b46b5da4581901c55e2a06`.
- Nutzerauftrag: Keine Altersbegrenzungen für gewöhnliche Begriffe. Leicht / Mittel / Schwer bleibt die primäre Auswahl; explizite sexuelle Inhalte wären eine eigene Inhaltsfreigabe.
- Exklusiv: `frontend/src/rules/audience.js`, Altersanteil der Presets in `src/engine.js`, `src/ui/settings/audience.js`, Schrittbezeichnung in `src/features/mobile-wizard.js`, Erklärung in `src/ui/setup.js`, zugehörige Unit-/Browserregressionen, eigene Reviewdatei und aktuelle Integrationsplanung.
- Integrationsbedarf: Änderungen an Engine und aktueller Planung erfolgen ausschließlich durch den Integrator. Keine Änderungen an Storage, Kartenmetadaten, IDs, Abhängigkeiten oder Informations-/Hostingdateien; kein dist-Commit.
- Akzeptanz: Keine Altersauswahl und kein impliziter Altersfilter, auch bei gespeicherten alten Einstellungen. Legacy-Felder bleiben validierbar und gespeicherte Partien unverändert. Schwierigkeit, Themen, ausgemusterte Karten und dauerhafte Gruppenhistorie filtern weiter. Unit-, Build- und Browserprüfungen vor Integration.
