# UI-START-01 – kompakter Smartphone-Start

- Agent: Codex, alleiniger Integrator; keine parallele Agentensitzung.
- Datum: 2026-10-10. Branch: `v2/UI-START-01-compact`.
- Basis: main `efa296635d546a51f1f83e5c9f1813676a1620dd`, gesichert auf `backup/main-2026-10-10-before-ui-start`.
- Auftrag: Nutzer bestätigt Leicht / Mittel / Schwer als primäre Auswahl. Smartphone-Einstieg ohne langes Formular oder verpflichtende fünf Schritte; selten benötigte Optionen auf ausdrücklichen Wunsch sichtbar. Bestehende Spielarten und optionale Führung erhalten.
- Exklusiv: `frontend/src/ui/setup.js`, `src/features/mobile-wizard.js`, additive UI-Eigenschaft in `src/app.js`, `src/styles/responsive/compact-start.css` und Import in `styles/index.css`; ausschließlich sichtbare Schwierigkeitsbezeichnung in `engine.js` und Fallback in `ui/game.js`; eigene Browserregression `tests/browser/UI-START-01.spec.js`, bestehende Browserabläufe soweit sie versteckte Einstellungen ausdrücklich öffnen müssen; eigene Reviewdatei und aktuelle Integrationsplanung.
- Kein Eingriff in Storage, Spielregeln, Karten-/Gruppen-IDs, aktuelle Partien, Auswahlfilter, Abhängigkeiten oder Hosting-/Informationsdateien. Keine erfundene Profi-Stufe. Geräusche und neuer Mischmodus bleiben separat zu implementieren.
- Akzeptanz: erster Smartphone-Bildschirm zeigt primäre Auswahl und Startknopf; kein Pflichtassistent; Einstellungen sind standardmäßig verborgen, bleiben aktiviert und erhalten Werte über Render/Rotation/Offline-Neustart. Ungültige Pflichtfelder werden vor nativer Validierung sichtbar. Desktop und freiwilliger Assistent bleiben nutzbar. Build und relevante Browserregressionen; unveränderte Regeln zusätzlich mit npm test prüfen.
