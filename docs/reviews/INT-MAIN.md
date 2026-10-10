# INT-MAIN – gemeinsamer Hauptstand, 2026-10-10

Der Nutzer beauftragt die Zusammenführung der Online-Branches/PRs und lokalen Änderungen. Basis ist `2eedbea10b83dc75d47831c40be2286e10a068b3`. Der Online-Stand ist zusätzlich auf `backup/main-2026-10-10-before-unify` gesichert. Die lokale nachträgliche Wertung ist vollständig im Commit `4eedb49` auf `backup/local-work-2026-10-10` erhalten. Integration erfolgt auf `v2/INT-MAIN-unify`, niemals durch Experimente auf main oder Force-Push.

## Abgleich der vorhandenen Arbeit

| Quellen | Entscheidung |
| --- | --- |
| A01–A08, A10/A11, B1/B2/B4/B5, C1–C4/C7/C8, D1/E2, Fundament | bereits Vorfahren von main; nicht rückwärts kopieren |
| A09/A13/A16/A17 | fachliche Korrekturen bereits gezielt durch PR #16 integriert; abweichende ältere Quelldateien überschreiben keine veröffentlichten Metadaten |
| A18 | sämtliche taskbezogenen Dateien in main enthalten |
| E3 | neuere Presenter-/Tastatursteuerung plus angepasste Regressionstests auf main; ältere Implementierung wird nicht erneut eingebaut |
| A12/A14 | nur Claims vorhanden; Claims erhalten, keine fertigen Inhalte behauptet |
| A15 / `578761d` | 120 geprüfte Sportkarten als letzte Paketquelle übernommen: 112 neue IDs, acht bestehende IDs erhalten nur zusätzliche Kategorien |
| QA-DEVICES #22 / DEPLOY-CF #23 | bereits integriert; Cloudflare-Inventur/Preview-Belege bleiben erhalten |
| QA-STORAGE #24 / `4782a1e` | über CF-1-Branch vollständig übernommen, letzte zwei Review-Befunde mit Repros korrigiert |
| CF-1 #25 / `5edd32b` | per normalem Merge übernommen: Offline-HTML-Alias, Hostdateien, CSP/Header, Eventlistener-Retry, hostneutraler Hinweis |
| lokale Arbeit / `4eedb49` | per Cherry-Pick integriert; Konflikte erhalten sowohl Replay als auch nachträgliche Wertung und Log-Modus |
| INFO-01 #27 / `063d688` | technisch vorbereitet; Betreiber-/Veröffentlichungsbestätigung noch beim Nutzer angefragt, daher getrennt von der unmittelbar veröffentlichbaren Kernintegration |

Die älteren Python-Prototypen, `instructions.md`, Bootstrap-Dateien und lokalen Claude-Worktrees bleiben auf dem Gerät erhalten. Die alte lokale Copilot-Anweisung für das Desktopprojekt ist archiviert; die aktive Anleitung verweist nun auf die Web-App und AGENTS.md. Kein neuer Client-/npm-Paketbedarf.

## Reparaturen und Nachweise

- Der checkpointbasierte Legacy-Pfad akzeptierte das isolierte Weglassen einer `easy`-/`medium`-Sessionstufe. Zwei neue Repros waren vorher rot. Jetzt gilt allein die dokumentierte `all`-Auslassung; die bestehende vollständige historische Migration beider fehlenden Felder bleibt nur mit exaktem Eltern-Checkpoint und ansonsten unverändertem Payload kompatibel. Punkte, Karte, Auswahl und Historien bleiben geprüft.
- Ein `change(..., false)`-Speicherkonflikt aktualisierte den State, aber nicht das Formular. Zwei echte Zwei-Tab-Repros waren vorher rot. Nach Konflikt werden Formular und Werte neu gerendert und eigene Rebase-Zuordnungen verworfen. Vier Prüfungen mit Textfeld/Assistent und IndexedDB/localStorage bewahren die fremde Teamänderung bei der nächsten eigenen Eingabe.
- Zwölf gezielte Chrome-Desktopfälle einschließlich der unveränderten alten Migration und des Schnellstarts bestanden nach den Korrekturen.
- Alle 2.744 veröffentlichten Erklärungskarten sind mit unveränderlichen IDs, bisherigen Kategorien und SHA-256 der übrigen Metadaten als Regression verankert. Nach Sportintegration: 2.856 insgesamt, 2.848 aktiv, acht bisherige retired IDs; 1.187 leicht und 2.056 einschließlich mittel. Pantomime-Pool unverändert.
- Node 22.17.1: 112 Unit-Tests ohne Fehler/Skips, Kartencheck ohne Fehler und Produktionsbuild bestanden. Vollständige lokale Chrome-Suite und exakte CI werden im Abschluss des Integrations-PR mit tatsächlicher Anzahl dokumentiert. Ein laufender Test wird nicht als Erfolg ausgegeben.

## Cloudflare und verbleibende Entscheidungen

Die vorhandenen zwei öffentlichen Preview-Aliase antworteten in dieser Sitzung mit HTTP 200; die Produktionsadresse `wortspiel-app.pages.dev` mit 404. Der frühere Patch-Preview ist kein Build des finalen Integrationscommits. Wrangler 4.149.0 ist außerhalb der App-Abhängigkeiten im npm-Ausführungscache verfügbar; `whoami` meldet fehlende Anmeldung. Keine Cloudflare-Credentials in Prozess-/Benutzer-/Maschinenvariablen. Die Plugin-Suche lieferte in dieser Sitzung keine verfügbare Cloudflare-Verbindung. Nutzerwahl für Browseranmeldung oder lokales vorhandenes Token ist angefragt; keine Konto-/Projekt-/DNS-/Produktionsmutation durchgeführt.

Neue App-Bezeichnung und Veröffentlichung der vorbereiteten Betreiberangaben/Informationsseiten sind angefragt. Ohne Antwort bleibt das öffentliche Branding Wortspiel erhalten und INFO-01 ein prüfbarer Entwurf. Produktion wird erst nach Preview des genauen fertigen SHA und konkreter Freigabe aktiviert. Die Sicherung enthält Gruppen/Kartenhistorien, keine laufende Partie oder vollständige Einstellungen; Originwechsel verlangt Export/Import und erhält die alte Adresse.

Reale iOS/Android-Geräte, WebKit, zwei Personen am kleinen Display, Mikrofon/HID und eine echte Banking-App wurden hier nicht getestet. Kein stabiler Release-Tag wird aus der automatischen Kernintegration abgeleitet. Quelle und Rückfallbranches bleiben erhalten; abschließende PR-/main-/CI-SHAs stehen im Integrations-PR.
