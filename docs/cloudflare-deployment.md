# Cloudflare Pages – Vorbereitung, Preview-Prüfung und Rückfall

Stand: 2026-10-09, DEPLOY-CF (Claude Code), Basis main `9c1d9d68a673e02f3e91b234a867e05a1de433b1`.

**Kurzstatus:**
- Es gibt keinen Cloudflare-Zugang in dieser Sitzung. Der Cloudflare-Connector ist vorhanden, aber nicht autorisiert. Es gibt kein Token und kein Wrangler-Login.
- Der Projektbestand im Konto ist deshalb **unbekannt**.
- Es wurde **kein Projekt angelegt** und **kein Preview oder Produktionsdeployment erstellt**.
- Es wurden keine Berechtigungen, Kosten oder DNS-Änderungen verursacht.
- Was ohne Konto prüfbar war, wurde lokal mit `wrangler pages dev` geprüft. Das ist der offizielle lokale Pages-Simulator, er wurde nur im Scratch-Verzeichnis installiert. Diese Ergebnisse gelten als **Simulation, nicht als Online-Abnahme**.

## 1. Ist-Stand (lesend geprüft)

| Prüfung | Ergebnis |
| --- | --- |
| Cloudflare-Konto / Pages-Projekte | nicht zugänglich → unbekannt |
| GitHub-Deployments des Repos | nur `github-pages` (zuletzt `9c1d9d6`, 2026-10-09 20:25 UTC) |
| Check-Runs auf `9c1d9d6` | nur `build` und `deploy` von `github-actions`; **kein Cloudflare-Pages-Check** |
| GitHub Pages online | `https://pfarrergraf.github.io/wortspiel/` antwortet mit 200. `sw.js` trägt den Cache-Hash `2cb47ad5b8cf2a`, **identisch** mit dem lokalen Build von `9c1d9d6` |
| `wortspiel.pages.dev` | **fremdes Projekt**: Next.js-Wordle-Klon, `author` „KilianMandscharo“. Nicht unseres |

Folgerungen:
- **Keine Git-Verknüpfung:** Ein mit diesem Repository Git-verknüpftes Pages-Projekt würde Check-Runs oder Deployments an Commits hinterlassen. Es gibt keine. Ein Direct-Upload-Projekt im Konto ist damit aber nicht ausgeschlossen.
- **Name `wortspiel` ist vergeben:** Der Name ist auf `pages.dev` bereits belegt. Ein neues Projekt erhält eine andere Subdomain, z. B. `wortspiel-<zufall>.pages.dev`, oder braucht einen anderen Projektnamen. Die tatsächliche Adresse erst nach der Anlage dokumentieren und nie mit `wortspiel.pages.dev` verwechseln.

## 2. Build-Konfiguration (gegen Repository und aktuelle Doku geprüft)

| Feld | Wert |
| --- | --- |
| Repository | pfarrergraf/wortspiel |
| Produktionsbranch (erst nach Freigabe) | main |
| Root Directory | `frontend` |
| Build Command | `npm run build` (Vite und Service-Worker-Generator) |
| Output Directory, relativ zum Root | `dist` |
| Node | 22, explizit `NODE_VERSION=22` für Preview und Produktion |

Vite `base: "./"` macht alle Pfade relativ. Der Build läuft deshalb unverändert unter `/` (Cloudflare) und unter `/wortspiel/` (GitHub Pages). Quellen, abgerufen am 2026-10-09:
- [Build-Konfiguration](https://developers.cloudflare.com/pages/configuration/build-configuration/)
- [Git-Integration](https://developers.cloudflare.com/pages/get-started/git-integration/)
- [Branch-Kontrollen](https://developers.cloudflare.com/pages/configuration/branch-build-controls/)
- [Preview-Deployments](https://developers.cloudflare.com/pages/configuration/preview-deployments/)
- [Header](https://developers.cloudflare.com/pages/configuration/headers/)

## 3. Wichtig: Projektanlage ohne ungewollte Produktion

Laut aktueller Doku gilt:
- Die Einrichtung per Git-Integration endet mit **„Save and Deploy“**. Das baut und veröffentlicht sofort den gewählten Produktionsbranch auf `<projekt>.pages.dev`. Die erste Anlage per Git ist also bereits eine **öffentliche Produktion**.
- Automatische Produktions-Deployments lassen sich erst **nach** der Anlage abschalten: *Settings → Builds & deployments → Configure Production deployments → „Enable automatic production branch deployments“*. Für Preview-Branches gibt es die Wahl „All / None / Custom branches“.
- Ein Git-Projekt lässt sich später nicht in ein Direct-Upload-Projekt umwandeln und umgekehrt auch nicht.
- Preview-URLs (`<hash>.<projekt>.pages.dev` und Branch-Aliase) sind **standardmäßig öffentlich**. Schützen lassen sie sich mit *Settings → General → Enable access policy* (Cloudflare Access). Das schützt nur die Previews, nicht `<projekt>.pages.dev`.

Empfohlener Weg, ohne erste Produktion vor der Freigabe:

| Variante | Ablauf | Neue Berechtigung | Bewertung |
| --- | --- | --- | --- |
| **A – Direct Upload (empfohlen)** | `wrangler pages project create <name> --production-branch main` legt das Projekt **ohne Deployment** an. Danach erzeugt `wrangler pages deploy dist --branch preview-<sha>` ausschließlich ein Preview aus genau dem geprüften Build. Produktion entsteht erst mit `--branch main` nach Freigabe | Cloudflare-Login des Kontoinhabers (interaktiv) oder ein API-Token mit „Cloudflare Pages: Edit“ als GitHub-Secret. Kein Token im Chat | Deployt exakt das in CI getestete Artefakt. Kein unbeabsichtigter Produktionsbuild |
| B – Git-Integration | Cloudflare-GitHub-App nur für dieses Repo freigeben. Bei der Anlage als Produktionsbranch einen **eigenen, leeren Platzhalter-Branch** wählen, sofort danach automatische Produktion deaktivieren und Preview auf „Custom: `v2/*`, `integration/*`“ stellen | Installation der Cloudflare-GitHub-App | Die Anlage veröffentlicht trotzdem den Platzhalter öffentlich. Cloudflare baut selbst, das ist ein zweiter Buildweg neben der CI |

Für A wäre später ein CI-Schritt nach den Tests sinnvoll. Er gehört dem Integrator: `.github/workflows/pages.yml` mit `cloudflare/wrangler-action`, nicht-main nur als Preview, main erst nach Freigabe. Den Workflow nicht ohne Freigabe anlegen.

## 4. Lokale Cloudflare-Simulation (`wrangler pages dev`, Wrangler 4.149.0)

Geprüft wurde `dist/` von `9c1d9d6` mit lokalem Wrangler und Chromium 141. Das ist **Simulation**, keine Online-Abnahme.

| Pfad | Antwort |
| --- | --- |
| `/` | 200 `text/html` |
| `/index.html` | **308 → `/`** (Pages-Normalisierung) |
| `/sw.js` | 200, standardmäßig `Cache-Control: public, max-age=0, must-revalidate` |
| `/manifest.webmanifest` | 200 `application/manifest+json` |
| `/licenses/Manrope-OFL.txt` | 200 `text/plain` |
| unbekannter Pfad | 200 mit `index.html` (SPA-Fallback, weil kein `404.html` existiert) |
| `/_headers` (falls vorhanden) | wird **nicht** ausgeliefert |

### Befund CF-1 (blockierend vor Produktion): Precache von `./index.html`

`scripts/service-worker.mjs` nimmt `./index.html` in den Precache auf. Auf Cloudflare liefert dieser Request eine Weiterleitung. Gespeichert wird dann eine Antwort mit `redirected: true`. Offline schlägt deshalb fehl:
- die Navigation auf `/index.html` mit `net::ERR_FAILED`;
- der Navigations-Fallback des Workers, denn er nutzt genau diesen Eintrag.

`/` und `/?from=homescreen` funktionieren offline. Auf GitHub Pages tritt das Problem nicht auf, dort gibt es keine Weiterleitung.

Lokal verifizierter Minimalfix, als **Integrationsbedarf** für den Integrator (die Datei gehört nicht zu diesem Paket):

```diff
--- a/frontend/scripts/service-worker.mjs
-const files = (await list(root)).filter((file) => file !== "sw.js");
+// index.html is served as "./" (Cloudflare Pages redirects /index.html to /);
+// _headers/_redirects are host config, never served as files.
+const files = (await list(root)).filter((file) => !["sw.js", "index.html", "_headers", "_redirects"].includes(file));
@@
-      if (event.request.mode === 'navigate') return await cache.match(new URL('./index.html', self.registration.scope)) || Response.error();
+      if (event.request.mode === 'navigate') return await cache.match(self.registration.scope) || Response.error();
```

Ergebnis mit dem Fix in der Simulation:
- Kein Eintrag im Cache ist mehr `redirected`.
- Offline antworten `/`, `/?from=homescreen` und `/index.html` mit 200, und die App läuft.

Nötige Regressionstests: eine Unit-Prüfung des generierten `FILES` sowie der bestehende Offline-E2E und `QA-DEVICES.spec.js` (Unterpfad und SW-Update).

Ein Nebenbefund ist nicht blockierend: Offline auf einem *unbekannten Unterpfad* (z. B. `/spiel/x`) liefert der SPA-Fallback HTML. Die relativen Assets lösen dort aber falsch auf, und die App bleibt leer. Das betrifft jeden Host und ist kein regulärer Einstieg.

### Befund CF-2: Sicherheits-Header

Derzeit gibt es keine `_headers`-Datei; Cloudflare sendet nur Standard-Header. Der folgende Vorschlag wurde lokal angewendet:

```
/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: no-referrer
  X-Frame-Options: DENY
  Permissions-Policy: camera=(), geolocation=(), payment=(), usb=(), microphone=(self), hid=(self)
  Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; manifest-src 'self'; worker-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'none'
/sw.js
  Cache-Control: no-cache
/assets/*
  Cache-Control: public, max-age=31536000, immutable
https://:project.pages.dev/*
  X-Robots-Tag: noindex
https://:version.:project.pages.dev/*
  X-Robots-Tag: noindex
```

Ergebnis der Simulation:
- Alle Header kommen an.
- In den Modi Klassisch, Frei erklären und Pantomime treten **keine CSP-Verstöße und keine Konsolenfehler** auf, ebenso nicht beim Sicherung-Download und beim zusammenführenden Import in einen frischen Kontext.

Grenzen der Prüfung:
- Nicht geprüft unter CSP: lokales Mikrofon (Speech) und WebHID-Presenter, das braucht echte Hardware.
- Der Startfehler-Button in `src/main.js` nutzt `onclick="location.reload()"`. Unter dieser CSP würde der Inline-Handler blockiert, das betrifft nur den Fehlerpfad. Für den Integrator: auf `addEventListener` umstellen.
- `X-Robots-Tag: noindex` für `*.pages.dev` ist eine Empfehlung, solange eine eigene Domain geplant ist. Das ist eine Entscheidung des Nutzers.

**Integrationsbedarf:** Die Datei gehört nach `frontend/public/_headers`. Das darf **erst zusammen mit CF-1** (Ausschluss von `_headers` aus dem Precache) kommen. Sonst schlägt `cache.addAll` an der nicht ausgelieferten Datei fehl, und der Offline-Modus fällt aus. GitHub Pages ignoriert `_headers`, dort ist die Datei harmlos.

## 5. Preview-Abnahme (erst mit Kontozugang ausführbar)

Mit dem exakten Preview-SHA abhaken; Ergebnisse hier eintragen:

- [ ] Quell-Commit = geprüfter main-SHA; Build-Log Node 22; `Offline-Cache <hash>` identisch mit CI-Build.
- [ ] HTTPS, tatsächlich ausgelieferte Header (`curl -sI`), `sw.js` nicht langfristig gecacht.
- [ ] Offline: SW installiert, Reload und neuer Tab offline, `/index.html` offline (CF-1), SW-Update nach zweitem Preview ohne Verlust gesehener Karten.
- [ ] Manifest/Icons/Installation auf Android-Chrome und iOS-Safari (Home-Bildschirm).
- [ ] Smartphone/Tablet/Desktop real; Simulation siehe `docs/reviews/QA-DEVICES.md`.
- [ ] Sicherung von GitHub Pages herunterladen → auf Preview zusammenführend importieren → Anzahl gesehener Karten vergleichen.
- [ ] Netzwerkprotokoll: keine Fremd-Origins (lokal mit Blockierliste: 0 Fremdrequests).
- [ ] Lizenzhinweise erreichbar (`licenses/Manrope-OFL.txt`, GPL/THIRD_PARTY_NOTICES im Repo verlinkt).
- [ ] Rechtliches: Es gibt derzeit **kein Impressum und keine eigenständige Datenschutzseite**, nur den Infodialog „Karten & Datenschutz“. Ob für die Cloudflare-Adresse ein Impressum nötig ist und wer verantwortlich ist, entscheidet der Nutzer. Hier werden keine Angaben erfunden.

## 6. Originwechsel: Kartenspeicher sicher mitnehmen

Browser-Speicher gehört zur jeweiligen Origin. Spielstände von GitHub Pages erscheinen auf Cloudflare **nicht** automatisch.

1. Auf https://pfarrergraf.github.io/wortspiel/ unter **Kartenspeicher → Sicherung herunterladen** die Datei speichern.
2. Eine **laufende Partie dort zu Ende spielen** oder dort weiterführen. Die Sicherung enthält **nur Gruppen und Kartenhistorien**, keine laufende Partie und keine vollständigen Einstellungen.
3. Auf der Cloudflare-Adresse unter **Kartenspeicher** die Sicherung importieren. Sie wird **zusammengeführt**; vorhandene Historie bleibt erhalten, nichts wird ersetzt.
4. **Dieselben Gruppennamen** verwenden und die Anzahl gesehener Karten in beiden Origins vergleichen.
5. Nichts automatisch löschen oder zurücksetzen. Die GitHub-Pages-Daten bleiben bestehen.

Simulation: Eine Sicherung aus einem Kontext wurde in einen frischen Kontext importiert, Meldung „2 zusätzliche Karten in den Speicher übernommen“. Eine vollständige Spielstand-Migration ist **nicht** implementiert und wird nicht beworben.

## 7. Rückfall

- GitHub Pages bleibt unter https://pfarrergraf.github.io/wortspiel/ bestehen. Aktuell ausgeliefert wird `9c1d9d6`, Cache-Hash `2cb47ad5b8cf2a`.
- Gesicherter Alt-Stand: `backup/main-2026-10-09` → `6de6340710de3f389f8de3ba1819123dc4c9a977`.
- Code-Rücknahme nur per neuem PR mit gezielten Reverts, kein Force-Push auf main.
- Cloudflare: Rollback nur auf ein zuvor geprüftes Deployment (*Deployments → Rollback*). Projekt, Domain und DNS nur nach gesonderter Freigabe ändern.
- Auf beiden Origins können Historien exportiert und zusammenführend importiert werden. Es gibt keine Speicherlöschung.

## 8. Was für die Produktionsfreigabe noch fehlt

1. Der Nutzer autorisiert den Cloudflare-Zugang (claude.ai → Connectors → Cloudflare Developer Platform) **oder** gibt Variante A/B frei. Tokens nie im Chat.
2. Projektbestand inventarisieren, ein passendes Projekt wiederverwenden.
3. Integrator übernimmt CF-1 (und ggf. CF-2) nach main und lässt die CI grün laufen.
4. Preview genau dieses SHA erstellen und Abschnitt 5 vollständig online abnehmen.
5. Gebündelte Freigabe vorlegen: Preview-URL, Produktions-SHA, Tests, Risiken, Zielprojekt und Adresse, Kosten (Pages Free: 0 €, sofern kein Access-Bezahlplan nötig), Berechtigungen, Rückfall, rechtliche Punkte.
