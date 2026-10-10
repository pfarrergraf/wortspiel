# AGE-01 – Altersgrenzen entfernen

Alte `ageGroup`-Einstellungen haben normale Wörter ausgeblendet, auch wenn diese zur gewählten Schwierigkeit und zum Thema passten. Künftig filtern Schwierigkeit, Themen, ausgemusterte Karten und dauerhaft gesehene IDs. `ageGroup` und `ageMin` bleiben ausschließlich für Datenkompatibilität und unveränderte veröffentlichte Kartenmetadaten erhalten; das Update schreibt bestehende Partien nicht um.

Die Altersauswahl entfällt. Kinder- und Jugend-Presets behalten ihre Themen, Tabu-Stufen und Spielzeiten, setzen aber keine Altersgrenzen mehr. Jahreszahlen entfallen aus den Namen. Schritt 2 der freiwilligen Führung heißt Schwierigkeit. Leicht / Mittel / Schwer bleibt im schnellen Smartphone-Einstieg.

Ausdrücklich sexuelle Inhalte bräuchten eine eigene, redaktionell geprüfte Kennzeichnung und Freigabe. Die alten Altersangaben sind dafür ungeeignet. Dieser Auftrag fügt weder einen solchen Kartenpool noch eine vermeintliche Inhaltsprüfung hinzu.

Regressionen prüfen alle bisherigen numerischen Alterswerte mit verschiedenen Kartenmetadaten, unveränderte Legacy-Migration/-Validierung, Schwierigkeit/Themen/Retirement/History sowie Undo und Kartenspeicher nach einer Woche. Der neue Browserfall lädt eine alte pausierte Partie mit `ageGroup: 6`, prüft den erweiterten verfügbaren Pool und bewahrt Sitzung und Gruppenhistorie exakt bei Preset-/Einstellungsänderungen und Neustart.

Lokale Prüfungen: 114 Unit-Tests, cards:check, Build und 58 relevante Playwright-Fälle auf installiertem Chrome erfolgreich (AGE-01, UI-START-01, kids, quickstart, game; einschließlich elf Bildschirmgrößen). Die vollständige Chromium-CI und tatsächliche Hosting-Prüfung werden im zugehörigen PR belegt. Cloudflare und GitHub Pages veröffentlichen ausschließlich nach grüner CI; reale Geräte bleiben als gesonderte Abnahme offen.

Integrationsbedarf: Engine und Planänderung durch den alleinigen Integrator. Keine Änderungen an Storage, Kartenquellen/-IDs, Hosting, Spendeninformationen oder Abhängigkeiten. Recovery-Branch: `backup/main-2026-10-10-before-age-removal` auf `350365e`.
