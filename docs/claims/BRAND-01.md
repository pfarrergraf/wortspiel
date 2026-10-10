# BRAND-01 – ludeverbis und bestätigter Anbieter

- Agent: ChatGPT/Codex, alleiniger Integrator; Start 2026-10-10.
- Branch: `v2/BRAND-01-ludeverbis`; Basis INFO-01 `8775a50`, gemeinsamer main `bcb47b3`.
- Nutzer bestätigt den Namen **ludeverbis (Spiel mit Wörtern)**, ausschließlich **Pfarrer Benjamin Graf** als Anbieter/Kontakt und das Gemeindekonto für Spenden an die Jugendarbeit. Wrangler-Browseranmeldung ausdrücklich angefordert.
- Exklusiv: öffentliches Branding in frontend/index.html, public/manifest.webmanifest, src/ui/chrome.js, card.js, install-hint.js, features/info.js; ausschließlich sichtbare Fehlermeldungen in engine.js/storage.js; Informationsseiten und eigene INFO-01-Tests; vorhandene Branding-Erwartungen in C8/E3/presenter-Browsertests; README und aktuelle Integrations-/Reviewdokumentation.
- Keine Änderung an Schema, Storage-/Presenter-/Hint-/Backup-/Cache-/Karten-IDs, Paketquellen, bestehenden Partien, GPL-Attribution, Lockfiles oder Spielregeln. Ältere Dokumente behalten ihre historischen Namen.
- Integration: normaler Merge in INFO-01 / PR #27 nach Tests und genauer CI; kein Force-Push, Quellen bleiben erhalten. Cloudflare separat: Kontobestand prüfen, fertigen main als Preview abnehmen, erst danach die erforderliche einmalige konkrete Produktionsfreigabe einholen. Keine DNS-Änderung.
- Prüfung: Unit/Kartencheck/Build, Info/Branding/Schmalbildschirm/Presenter/Offline/Migration. Windows-Persistentprofile bei langen Worktreepfaden mit kurzem Playwright-Ausgabepfad prüfen.
