# Cloudflare Pages – Vorbereitung und Rückfall

Stand 2026-10-09: Kein Cloudflare-Connector, Account oder Token konfiguriert. Der bestehende **Projektbestand ist deshalb unbekannt**, nicht „kein Projekt vorhanden“. Es wurde kein Preview und kein Produktionsdeployment erzeugt. Keine neuen Zugangsdaten, Berechtigungen, Kosten oder DNS-Änderungen vorgenommen.

## Geprüfte Build-Konfiguration

Abgleich mit Repository (Vite base `./`, Build inkl. Service Worker, Node-22-CI) und offizieller aktueller Dokumentation:

| Feld | Wert |
| --- | --- |
| GitHub Repository | pfarrergraf/wortspiel |
| Produktionsbranch nach Freigabe | main |
| Root Directory | frontend |
| Build Command | npm run build |
| Output Directory, relativ zum Root | dist |
| Node | 22, explizit NODE_VERSION=22 in Preview und Produktion |

[Build-Konfiguration](https://developers.cloudflare.com/pages/configuration/build-configuration/) erklärt Root- und Output-Verzeichnisse. [Build-Image](https://developers.cloudflare.com/pages/configuration/build-image/) führt Node 22.16.0 als aktuellen Default des modernen Images und NODE_VERSION/.nvmrc als Auswahlmechanismen. [Git-Integration](https://developers.cloudflare.com/pages/get-started/git-integration/) beschreibt Repository-Verknüpfung und Produktionsbranch. Abgerufen am 2026-10-09 über Web-Recherche; direktes HTTP aus dem Terminal lieferte 403. Kein Frameworkwechsel nötig.

## Nächste ausführbare Einrichtung nach Zugang

1. In Workers & Pages vorhandene Projekte samt GitHub-Repository und Deployment-SHA prüfen; passendes Projekt wiederverwenden.
2. Falls die GitHub-App noch nicht berechtigt ist, nur dieses Repository zur Freigabe vorlegen. Keine Tokens in Client/Commit/Log.
3. Zuerst automatische Produktion deaktivieren und ausschließlich geprüften Integrationsbranch als Preview bauen. Neue Pages-Projekte können bei Erstellung bereits öffentlich ausrollen: dies ohne Produktionsfreigabe verhindern; falls die Oberfläche das nicht erlaubt, geschützte Preview oder separaten Staging-Weg wählen.
4. Gesamte Release-Checkliste online sowie offline/PWA mit dem Preview-SHA abnehmen. Cloudflare-Build-Erfolg allein prüft keine Browser-Regressionen.
5. Header-Datei im statischen Output gezielt implementieren und real überprüfen (CSP auf lokale Assets abstimmen, nosniff, Referrer-Policy; sw.js nicht dauerhaft im HTTP-Cache festhalten). Noch keine geprüften Header behaupten.
6. Impressum/Datenschutz/Lizenzen mit Verantwortlichem prüfen. Neue Kontoberechtigung, erste öffentliche Cloudflare-Produktion und ggf. Domain/DNS als konkrete Freigabe bündeln.
7. Erst danach main als Produktion aktivieren. GitHub-Pages-Workflow und Adresse beibehalten.

## Originwechsel: Kartenspeicher sicher mitnehmen

Auf https://pfarrergraf.github.io/wortspiel/ zuerst Kartenspeicher → Sicherung herunterladen, Datei aufbewahren. Auf der neuen Cloudflare-Origin dieselbe Sicherung importieren; vorhandene Historie wird vereinigt, nicht ersetzt. Gruppennamen identisch benutzen; Zahl der gesehenen Karten vergleichen. **Die derzeitige Sicherung enthält nur Gruppenhistorien.** Laufende Partien vorher auf GitHub Pages fertigspielen; neue Einstellungen bei Bedarf erneut eingeben. Eine Cloudflare-Adresse erhält nicht automatisch lokale Daten der GitHub-Adresse.

## Rückfall

GitHub Pages bleibt https://pfarrergraf.github.io/wortspiel/. Gesicherter main-SHA `6de6340710de3f389f8de3ba1819123dc4c9a977`, Remote-Branch `backup/main-2026-10-09`. Für Code-Rücknahme neuer PR mit gezielten Reverts, kein main-Force-Push. Cloudflare später nur auf ein zuvor **geprüftes** erfolgreiches Deployment zurückrollen. Auf beiden Origins Historien exportieren und zusammenführend importieren; keine Speicherlöschung. Bestehende Domain/DNS nur nach gesonderter Freigabe ändern.
