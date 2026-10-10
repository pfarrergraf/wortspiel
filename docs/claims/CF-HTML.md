# CF-HTML – Cloudflare-Infoseiten offline

- Agent: ChatGPT/Codex, Integrator, 2026-10-10; Branch v2/CF-HTML-offline, Basis f6dfe2d / INFO-01.
- Befund am echten ludeverbis-Preview: Pages leitet *.html auf extensionlose Pfade um. Cache.addAll speichert dabei redirected Responses; Chrome lehnt sie als Offline-Navigation mit ERR_FAILED ab. Core-Start/index bleibt korrekt.
- Exklusiv: frontend/scripts/service-worker.mjs; neue CF-HTML Unit-/Browserregression und Simulator; INFO-01 ausschließlich erlaubte kanonische URL-Erwartung; eigene Claim/Reviewdatei. Integrator darf zentralen SW bearbeiten, keine Claude-Datei verändern.
- Auftrag: jede lokale HTML-Datei als nicht umgeleitete Response und unter beiden veröffentlichten Pfaden offline bereitstellen; echte Pages-308-Simulation/Root-/Query-/Infos-/Banking-QR-Prüfung. Historien/Sessions unberührt.
- Nutzer hat Zusammenführung, Namen/Anbieter/Infos und Cloudflare-Preview autorisiert; erste Produktion bleibt nach konkreter Preview-Abnahme freizugeben. Normaler Merge über PR #27, exakte CI, Quellbranches erhalten.
