# Cloudflare Pages – Projekt, Preview-Prüfung und Rückfall

Stand: 2026-10-09, DEPLOY-CF (Claude Code), geprüfter main-SHA `35389e3c96a2442a9a3e38fc929e6136cde1c3c2`.
Vorheriger Stand dieser Datei (nur Simulation, ohne Kontozugang): Basis `9c1d9d6`.

**Kurzstatus:**
- Der Nutzer hat für diese Sitzung ein API-Token (*Account → Cloudflare Pages: Edit*) als Umgebungs-Secret freigegeben. Token und Account-ID stehen in keinem Log, Commit oder PR.
- Pages-Projekt **`wortspiel-app`** ist als **Direct-Upload-Projekt** angelegt, Produktionsbranch `main`.
- Es gibt **kein Produktionsdeployment**. `https://wortspiel-app.pages.dev/` antwortet mit 404.
- Es gibt nur **Preview-Deployments**. Sie sind öffentlich erreichbar und senden automatisch `X-Robots-Tag: noindex`.
- Der Preview des unveränderten main-Builds ist **online byte-identisch** mit dem lokalen Build. Er bestätigt **CF-1 real**: `/index.html` lädt offline nicht.
- Ein zweiter Preview mit dem lokal angewendeten, **nicht committeten** CF-1/CF-2-Patch besteht alle Online-Prüfungen. Dazu gehören `/index.html` offline, die CSP in allen drei Modi und ein SW-Update von main auf den Patch ohne Kartenverlust.
- Keine Domain, kein DNS, keine weiteren Token, keine Kosten. Nichts wurde gelöscht.
- **Echte Geräte bleiben offen.** Alle Browserprüfungen liefen in Headless-Chromium 141 aus der Cloud-Umgebung.

## 1. Ist-Stand Konto (lesend geprüft, 2026-10-09)

| Prüfung | Ergebnis |
| --- | --- |
| Pages-Projekte vor der Anlage (`wrangler pages project list`) | 9 Projekte, **keines für Wortspiel** (u. a. wer-wird-bibel-millionaer, religionskarte-…, downloadthat, gaistreich, alltagsservice-lauda-*). Nichts verändert |
| Workers (Connector) | 9 Worker, keiner für Wortspiel. Vor und nach der Projektanlage unverändert |
| `wortspiel.pages.dev` | **fremdes Projekt** (Next.js-Wordle-Klon). Nicht unseres, nicht verwechseln |
| Neues Projekt | `wortspiel-app` → `wortspiel-app.pages.dev`, Git-Provider: keiner (Direct Upload) |
| GitHub Pages | `https://pfarrergraf.github.io/wortspiel/` liefert Cache-Hash `2cb47ad5b8cf2a`, identisch mit dem Build von `35389e3` |

## 2. Build-Konfiguration

| Feld | Wert |
| --- | --- |
| Repository | pfarrergraf/wortspiel |
| Projekt / Adresse | `wortspiel-app` / `https://wortspiel-app.pages.dev` (erst nach Freigabe mit Inhalt) |
| Produktionsbranch | main (nur über `wrangler pages deploy … --branch main` nach Freigabe) |
| Build | lokal bzw. in CI: `cd frontend && npm ci && npm run build`, Node 22. Cloudflare baut **nicht** selbst |
| Upload | `frontend/dist` per `wrangler pages deploy` |

Vite `base: "./"` macht alle Pfade relativ. Derselbe Build läuft unter `/` (Cloudflare) und unter `/wortspiel/` (GitHub Pages). Quellen: [Direct Upload](https://developers.cloudflare.com/pages/get-started/direct-upload/), [Preview-Deployments](https://developers.cloudflare.com/pages/configuration/preview-deployments/), [Header](https://developers.cloudflare.com/pages/configuration/headers/).

## 3. Projektanlage ohne ungewollte Produktion – und eine Wrangler-Falle

Gewählt wurde Variante A (Direct Upload):
- `wrangler pages project create` legt das Projekt ohne Deployment an.
- `wrangler pages deploy … --branch <nicht main>` erzeugt nur Previews.
- Eine Git-Integration (Variante B) würde bei der Anlage sofort den Produktionsbranch veröffentlichen. Sie wurde nicht genutzt.

**Wichtig für alle weiteren Aufrufe (Wrangler 4.149.0):**
- Wrangler leitet `wrangler pages project create` standardmäßig auf das neue „Pages als Teil von Workers“ um. Intern wird daraus ein **`wrangler deploy`** (Workers-Deployment).
- Der erste Aufruf brach dabei mit `AutoConfigDetectionError` ab. Laut Log wurde nichts deployt, die Workers-Liste blieb unverändert.
- Angelegt wurde das Projekt danach ausdrücklich über die klassische Pages-API: `wrangler pages project create wortspiel-app --production-branch main --force`. Laut Wrangler-Hinweis ist `--force` nur bei der Anlage nötig. Folgende `pages deploy`-Aufrufe liefen direkt gegen Pages (Environment „Preview“).
- **Für CI und Produktion:** Wrangler-Version pinnen und vor dem ersten Produktionsaufruf prüfen, dass `pages deploy` nicht delegiert. Im Log steht dann kein `delegate pages to workers`.

## 4. Befunde CF-1 und CF-2

### CF-1 (blockierend vor Produktion): Precache von `./index.html` – **online bestätigt**

- Cloudflare antwortet auf `/index.html` mit **308 → `/`**, geprüft mit `curl -sI` am Preview.
- Der Service Worker von `35389e3` speichert diesen Eintrag deshalb als `redirected: true`, online nachgewiesen im Cache des Previews.
- Folge: Ein neuer Tab auf `/index.html` schlägt offline mit `net::ERR_FAILED` fehl. Auch der Navigations-Fallback hängt an diesem Eintrag.
- `/` und `/?from=homescreen` laufen offline.

**Zuständigkeit:**
- Der Integrator hat CF-1 auf `v2/CF-1-offline` beansprucht (`docs/claims/CF-1.md`). Exklusiv gehören ihm `service-worker.mjs`, `public/_headers`, der `main.js`-Startup-Handler und die CF-1-Tests.
- Deshalb gibt es **keinen** konkurrierenden Claude-PR (`v2/DEPLOY-CF-swfix` wurde nicht angelegt).
- Der unten stehende Patch war nur lokal angewendet, um ihn online zu prüfen.

**Korrektur am früheren Minimalfix:** Der frühere Vorschlag filterte `index.html` auch aus der **Hash-Berechnung**. Dann würden reine HTML- oder `_headers`-Änderungen den Cache-Namen nicht mehr ändern, und der Service Worker würde kein Update ausführen. Der geprüfte Patch filtert deshalb nur die Precache-Liste:

```diff
-const files = (await list(root)).filter((file) => file !== "sw.js");
+const files = (await list(root)).filter((file) => file !== "sw.js").sort();
+// index.html is cached as "./" (Cloudflare Pages answers /index.html with 308 → /);
+// _headers/_redirects are host configuration and never served. All files still feed the hash.
+const HOST_ONLY = ["index.html", "_headers", "_redirects"];
+const precache = files.filter((file) => !HOST_ONLY.includes(file));
 const hash = createHash("sha256");
-for (const file of files.sort())
+for (const file of files)
   hash.update(await readFile(new URL(file, root)));
@@
-const FILES = ${JSON.stringify(["./", ...files.map((file) => `./${file}`)])};
+const FILES = ${JSON.stringify(["./", ...precache.map((file) => `./${file}`)])};
@@
-      if (event.request.mode === 'navigate') return await cache.match(new URL('./index.html', self.registration.scope)) || Response.error();
+      if (event.request.mode === 'navigate') return await cache.match(self.registration.scope) || Response.error();
@@
-console.log(`Offline-Cache ${version}: ${files.length} Dateien`);
+console.log(`Offline-Cache ${version}: ${precache.length} Dateien`);
```

Lokaler Test mit dem Patch (Scratch-Worktree auf `35389e3`, Build `Offline-Cache 2103fdf53f8324: 16 Dateien`):
- `npm test`: 98/98.
- `npm run test:e2e`: **100 bestanden, 2 fehlgeschlagen.**

Beide Fehlschläge betreffen `QA-DEVICES.spec.js:362` ([mobile] und [desktop]). Der Test verlangt ausdrücklich `…/wortspiel/index.html` im Precache, was CF-1 bewusst ändert.

**Integrationsbedarf:** Diese Zusicherung **gleichwertig ersetzen, nicht abschwächen**:
- `index.html` ist kein eigener Precache-Eintrag, kein Eintrag ist `redirected`, und `./` ist enthalten.
- Neu: Ein Offline-Tab auf `/wortspiel/index.html` startet die App.

Dazu kommt eine Unit-Prüfung, dass das generierte `FILES` weder `./index.html` noch `./_headers` noch `./_redirects` enthält.

### CF-2: Sicherheits-Header (`frontend/public/_headers`, nur zusammen mit CF-1)

Der Vorschlag ist unverändert gegenüber der früheren Fassung:

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

Online am Preview `preview-cf1-2103fdf` geprüft:
- Alle Header kommen an, auch auf der 308-Antwort.
- `/sw.js` kommt mit `no-cache`, `/assets/*` mit `immutable`.
- `/_headers` wird **nicht** als Datei ausgeliefert, nur das SPA-Fallback-HTML.
- Ohne `_headers` sendet Cloudflare nur `nosniff`, `strict-origin-when-cross-origin` und auf Previews `noindex`.

Grenzen der Prüfung:
- Mikrofon und WebHID unter CSP brauchen echte Hardware und sind offen.
- Der Inline-`onclick` im Startfehler-Pfad (`main.js`) würde unter dieser CSP blockiert. Er liegt im CF-1-Claim des Integrators.
- `X-Robots-Tag: noindex` auf `wortspiel-app.pages.dev` ist eine Entscheidung des Nutzers: sinnvoll, falls später eine eigene Domain kommt, sonst entfernen.

## 5. Preview-Abnahme – **Online-Prüfung der Previews** (2026-10-09)

Gemessen wurde mit Headless-Chromium 141 aus der Cloud-Umgebung über deren HTTPS-Proxy. Das ist eine Online-Prüfung der Previews, **keine Prüfung auf echten Geräten**.

| Preview | Branch-Alias | Deployment | Inhalt |
| --- | --- | --- | --- |
| P1 | `https://preview-35389e3.wortspiel-app.pages.dev` | `47bcc476` | main `35389e3`, **unverändert**, Cache `2cb47ad5b8cf2a` |
| P2 | `https://preview-cf1-2103fdf.wortspiel-app.pages.dev` | `3a24bd2c` | `35389e3` + lokaler CF-1/CF-2-Patch, **nicht committet, kein Produktionskandidat**, Cache `2103fdf53f8324` |
| P3 | `https://preview-swupdate.wortspiel-app.pages.dev` | zuletzt `6e62bc2d` | SW-Update-Test: abwechselnd P1- und P2-Build auf demselben Alias |

Hinweis: Cloudflare zeigt bei P2 und P3 als Quelle `35389e3`, weil Direct Upload keinen Patch-Stand kennt. Der Patch-Stand ist in der Commit-Nachricht des Deployments und im Branch-Namen vermerkt.

| Prüfpunkt | P1 main | P2 CF-1/CF-2 |
| --- | --- | --- |
| Quelle = geprüfter SHA, Node 22, Cache-Hash wie lokal | ja: alle 18 Dateien online **byte-identisch** (sha256) zum lokalen Build; `wortspiel-2cb47ad5b8cf2a` | Cache `wortspiel-2103fdf53f8324` = lokaler Patch-Build |
| HTTPS | HTTP/2 200; `http://` → 301 `https://` | wie P1 |
| Header (`curl -sI`) | `cache-control: public, max-age=0, must-revalidate` (auch `sw.js`), `nosniff`, `strict-origin-when-cross-origin`, `noindex`; **keine CSP**; `/index.html` → 308 `/` | volle CF-2-Header (s. o.) |
| SW-Installation, „Offline bereit“ | ja; 18 Cache-Einträge, **1 `redirected` (`/index.html`)** | ja; 17 Einträge, 0 `redirected` |
| Offline-Reload | ja | ja |
| Neuer Tab offline `/` und `/?from=homescreen` | ja | ja |
| Neuer Tab offline `/index.html` | **FEHLER `net::ERR_FAILED` (CF-1)** | ja |
| Manifest | `application/manifest+json`; `start_url`/`scope` = Preview-Wurzel | ja |
| Icons | 192×192 PNG, 512×512 PNG maskable, SVG, apple-touch-icon: alle erreichbar und mit korrektem Typ | ja |
| Lizenz | `licenses/Manrope-OFL.txt` erreichbar | ja |
| Fremdrequests | 0 | 0 |
| Klassisch / Frei erklären / Pantomime: je eine Karte gewertet | ok, keine Konsolenfehler | ok; **0 CSP-Verstöße**, keine Konsolenfehler, Sicherung-Download funktioniert |
| Import einer **auf GitHub Pages erzeugten** Sicherung | 3 von 3 Karten der Gruppe übernommen, Re-Export identisch | 3 von 3, Meldung „3 zusätzliche Karten in den Speicher übernommen.“, 0 CSP-Verstöße |

**SW-Update über zweites Deployment (P3, persistentes Browserprofil):**
1. Alias mit dem P1-Build: SW installiert, 2 Karten gesehen. Danach Browser-Neustart **offline**: Partie pausiert, 2 gesehene Karten erhalten.
2. Derselbe Alias neu deployt mit dem P2-Build. `registration.update()` aktiviert den neuen Worker. Der alte Cache `…2cb47ad5b8cf2a` wird entfernt, nur `…2103fdf53f8324` bleibt. Alle gesehenen Karten bleiben erhalten. Offline laufen danach `/` **und** `/index.html`.

Es gab drei Läufe, ehrlich protokolliert:
- **Lauf 1:** Ohne Warten auf die Alias-Umstellung blieb der alte Worker 15 s aktiv. Bei einem späteren Aufruf desselben Profils übernahm der neue Worker sofort.
- **Lauf 2:** Das Prüfskript las den Zwischenstand mit beiden Caches als Fehler. Der Endzustand war korrekt.
- **Lauf 3:** Mit Warten auf die Alias-Umstellung und korrigierter Bedingung **vollständig grün**.

Folgerung: Nach einem Deployment kann der Alias einige Sekunden lang noch den alten `sw.js` liefern. Das Update kommt dann beim nächsten Aufruf. Kein Kartenverlust in einem der Läufe.

**Origin-Migration:**
- Die Sicherung wurde in einem frischen Testbrowser auf `https://pfarrergraf.github.io/wortspiel/` erzeugt: Gruppe „CF-Migrationstest“, 3 Karten, Schema 1.
- Bestehende Nutzerdaten auf GitHub Pages wurden nicht berührt.
- Geprüft wurde der Import in einen leeren Kontext. Das Zusammenführen mit bereits vorhandener Historie decken die Unit-Tests ab. Online wurde es nicht eigens geprüft.

Weiterhin **offen** (nicht automatisierbar):
- [ ] Installation und Offline-Start auf echten Geräten: Android-Chrome, iOS-Safari (Home-Bildschirm), Tablet, Desktop. Siehe `docs/reviews/QA-DEVICES.md`.
- [ ] Mikrofon/WebHID unter CSP auf echter Hardware.
- [ ] WebKit/Safari-Engine (nicht in der Cloud-Umgebung verfügbar).
- [ ] Wiederholung der Abnahme am **endgültigen Produktions-SHA**, sobald CF-1 auf main ist.

## 6. Originwechsel: Kartenspeicher sicher mitnehmen

Browser-Speicher gehört zur jeweiligen Origin. Spielstände von GitHub Pages erscheinen auf Cloudflare **nicht** automatisch.

1. Auf https://pfarrergraf.github.io/wortspiel/ unter **Kartenspeicher → Sicherung herunterladen** die Datei speichern.
2. Eine **laufende Partie dort zu Ende spielen** oder dort weiterführen. Die Sicherung enthält **nur Gruppen und Kartenhistorien**, keine laufende Partie und keine vollständigen Einstellungen.
3. Auf der Cloudflare-Adresse unter **Kartenspeicher** die Sicherung importieren. Sie wird **zusammengeführt**; vorhandene Historie bleibt erhalten, nichts wird ersetzt.
4. **Dieselben Gruppennamen** verwenden und die Anzahl gesehener Karten in beiden Origins vergleichen.
5. Nichts automatisch löschen oder zurücksetzen. Die GitHub-Pages-Daten bleiben bestehen.

Online geprüft: Abschnitt 5, Import einer GitHub-Pages-Sicherung auf P1 und P2. Eine vollständige Spielstand-Migration ist **nicht** implementiert und wird nicht beworben.

## 7. Rückfall

- GitHub Pages bleibt unter https://pfarrergraf.github.io/wortspiel/ bestehen und liefert aktuell `35389e3` (Cache `2cb47ad5b8cf2a`).
- Gesicherte Alt-Stände: `backup/main-2026-10-09` und `backup/main-2026-10-09-pre-storage`.
- Code-Rücknahme nur per neuem PR mit gezielten Reverts, kein Force-Push auf main.
- Cloudflare: Rollback nur auf ein zuvor geprüftes Produktionsdeployment (*Deployments → Rollback*). Previews bleiben unberührt.
- Projekt, Domain und DNS nur nach gesonderter Freigabe ändern. Vorhandene Previews werden nicht gelöscht; Löschen braucht eine eigene Freigabe.

## 8. Was für die Produktionsfreigabe noch fehlt

1. Der Integrator übernimmt CF-1, inklusive Hash-Korrektur und gleichwertigem Ersatz von `QA-DEVICES.spec.js:362`, und CF-2 nach main. Danach muss die CI grün sein.
2. Preview genau dieses main-SHA hochladen (`--branch preview-<sha>`) und Abschnitt 5 am Preview wiederholen. Dazu gehört ein SW-Update von `35389e3` auf den neuen SHA über denselben Alias.
3. Die gebündelte Freigabe des Nutzers (siehe PR #23) einholen. Erst dann folgt `wrangler pages deploy frontend/dist --project-name wortspiel-app --branch main --commit-hash <sha>`.
4. Den Infodialog „Karten & Datenschutz“ anpassen. Er nennt fest „technische Zugriffsprotokolle des Hosters GitHub Pages“, was auf Cloudflare nicht zutrifft. Das ist Text in `src/features/info.js` und Sache des Integrators.
5. Rechtliches entscheidet der Nutzer. Es gibt **kein Impressum und keine eigenständige Datenschutzseite**. Hier werden keine Angaben erfunden.
