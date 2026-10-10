# BRAND-01 – ludeverbis

Nutzerentscheidungen vom 2026-10-10: ludeverbis (Spiel mit Wörtern), ausschließlich Pfarrer Benjamin Graf als Anbieter/Kontakt, Spenden für die Jugendarbeit auf das Gemeindekonto. Name in Kopfzeile, Seitentitel, Installationsmanifest, iOS-Metatitel, Hilfen und sichtbaren Speichermeldungen umgesetzt. Informationsseiten nennen Benjamin Graf; keine erfundene Körperschaft oder Vertretung. Gemeindebezug und Spendenkonto bleiben erhalten. Pfarrteam-/Spenden-/Adressquellen nochmals am 2026-10-10 geprüft:

- https://kirchengemeinde-oberlahnstein.ekhn.de/ansprechpartner/pfarrteam
- https://kirchengemeinde-oberlahnstein.ekhn.de/spenden
- https://kirchengemeinde-oberlahnstein.ekhn.de/impressum

Storage-Namespace `wortspiel.state.v1`, Backups `app: wortspiel`, Presenter/iOS-Hinweis-Keys, relative PWA-ID und Scope, Cache-Namespace und Karten-IDs bleiben identisch. Kein neuer Kartenspeicher durch Umbenennung. Originwechsel erfordert weiterhin Gruppenexport/-import; laufende Partie wird nicht exportiert. Bestehende C8/E3/Presenter-Assertions prüfen den neuen sichtbaren Namen; kein Test geschwächt.

Gemeinsamer Kern-main `bcb47b3` ist bereits gemergt und mit kompletter CI veröffentlicht. PR #24/#25 sind dadurch integriert, Sportreview #20 abgeschlossen; Quell-/Recoverybranches erhalten. INFO-01 wird zusammen mit diesem geprüften Branding über PR #27 integriert. 112 Unit, Kartencheck und Build bestanden; Browser-/exakte CI-Ergebnisse werden am finalen PR-SHA dokumentiert. Windows-SW-Neustarttests verwenden kurzen Ausgabe-/Profilpfad, ohne Änderung der Tests oder Timeouts.

Wrangler 4.149.0 wurde per Nutzer-Browserlogin mit account:read, user:read und pages:write authentifiziert. Keine Zugangsdaten im Repository/Client. Bestehendes Projekt wortspiel-app verifiziert. Gewünschter neuer Pages-Projektname ludeverbis; Preview/Produktions-SHAs, URLs, Header und Hashnachweise folgen nach tatsächlichem Upload. Codex-Browser-Verbindung ist wegen fehlender sandboxPolicy in der Laufzeit nicht verfügbar; bestehende Playwright-Abnahme und HTTP-Nachweise werden verwendet. Keine Geräte-/Banking-App-Abnahme behauptet, kein stabiler Release-Tag.
