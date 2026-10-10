# INFO-01 – Projekt, Impressum und freiwillige Unterstützung

- Agent: ChatGPT/Codex, Integrator; Status: aktiv, 2026-10-10.
- Branch/Worktree: v2/INFO-01-community / /workspace/wortspiel-INFO-01.
- Basis: main 2eedbea10b83dc75d47831c40be2286e10a068b3; Rückfall backup/main-2026-10-10-pre-core.
- Nutzerauftrag: neuer Name (genauer Name noch zu klären), Gemeindebezug/Jugendarbeit, kostenloses Spiel, freiwillige Spenden mit Banking-QR, rechtliche Informationen, vereinfachte Gruppenauswahl.
- Dieses Paket: eigenständig erreichbare Informationsseiten und Unterstützung, keine Speicherung/Spielregeln verändern. App-Name und Gruppenauswahl bleiben gesonderte Integrationsaufgaben nach Klärung.
- Exklusive Dateien: frontend/src/ui/chrome.js, frontend/src/styles/chrome.css nur Footer; frontend/src/features/info.js nur Navigation zu Informationsseiten (CF-1-Hostinghinweis nicht überschreiben); neue frontend/public/projekt.html, impressum.html, datenschutz.html, unterstuetzen.html, projekt-info.css, projekt-info.js, spenden-jugendarbeit.svg, spenden-jugendarbeit.png; eigene frontend/tests/browser/INFO-01.spec.js; docs/claims/INFO-01.md, docs/reviews/INFO-01.md.
- Bestehende engine.js/storage.js/app.js/main.js/settings/Lockfiles sowie Claude-Konto-/Deployment-/QA-Dateien nicht bearbeiten. CF-1-Info-Dialog bleibt separat erhalten.
- Quellen: https://kirchengemeinde-oberlahnstein.ekhn.de/impressum, /ansprechpartner, /spenden; Abruf 2026-10-10. Offizieller Vertreter Kerstin Graf; Projektkontakt Benjamin Graf. Finalen Betreiber-/Verantwortlichen-Text vom Nutzer abnehmen lassen, keine rechtliche Vertretung erfinden.
- Akzeptanz: Footerzugänge auf Smartphone/Desktop; Seiten auch ohne JS und bei kaputtem Spielstand erreichbar; QR ist offline lokal und enthält verifizierte offizielle IBAN/BIC/Empfänger, keinen Betrag, Zweck Spende Jugendarbeit; manueller Überweisungsweg für dasselbe Smartphone; keine Zahlung/Anmeldung/Tracking/externen QR-Dienste; vorhandener SW cached die lokalen Dateien.
- Pflicht: Produktionsbuild, bestehende Unit/Kartenprüfung, Browsernavigation/320px/Offline/Speicherunverändert; QR unabhängig dekodieren und IBAN-Prüfsumme prüfen. Echte Banking-App und finale rechtliche Veröffentlichung bleiben Abnahme des Nutzers.
- Claude behält Cloudflare-Konto/Pages-Preview; neuer Name/Adresse als eigener konkreter GitHub-Auftrag, keine Änderungen desselben UI-/Kernbereichs durch Claude.

Fortsetzung 2026-10-10: Nutzer bestätigt ludeverbis, ausschließlich Pfarrer Benjamin Graf als Anbieter und Gemeindekonto für Jugendarbeit; fordert Wrangler-Browseranmeldung und Fortsetzung durch Codex an. Umsetzung im exklusiven Integratorpaket BRAND-01; ältere fehlende Bestätigungen oben beschreiben den ursprünglichen Stand.
