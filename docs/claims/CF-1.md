# CF-1 – Offline-Redirect und Cloudflare-Header

- Agent: ChatGPT/Codex (Integrator)
- Status: aktiv, Integrationsbedarf aus Claude PR #23
- Branch/Worktree: v2/CF-1-offline / /workspace/wortspiel-CF-1
- Basis: 37358ba3a9b6581bf2146d0585ac290d05bdafde, enthält QA-STORAGE PR #24; main-Integration erst nach dessen grüner Integration.
- Start: 2026-10-09
- Exklusive Dateien: frontend/scripts/service-worker.mjs, frontend/public/_headers, frontend/src/main.js (nur Startup-CSP-Handler), frontend/tests/CF-1.test.mjs, frontend/tests/browser/CF-1.spec.js, docs/claims/CF-1.md, docs/reviews/CF-1.md.
- Claude-Dateien nicht ändern: docs/cloudflare-deployment.md, DEPLOY-CF-Claim, QA-DEVICES/QA-A11Y-Tests/Reviews. main.js gehört ohnehin dem Codex-Kernbereich; keine parallele Claude-Bearbeitung.
- Akzeptanz: 308 index.html → Scope-Root online/offline verträglich; nicht umgeleiteter HTML-Cachealias, keine Hostkonfig-Fetches; HTML/Header-Änderungen invalidieren Cache; sichere lokale CSP/HTTP-Header und bedienbarer Startup-Fehlerpfad; Github-Unterpfad/Offline/SW-Update erhalten.
- Ports: eigener Preview PW_PORT=4212, lokaler Wrangler-Simulator 4213. Kein Konto-/Projekt-/Preview-/Produktions-/DNS-Zugriff und keine neue Berechtigung in diesem Paket.

- Koordinationsdokumente nach abgeschlossenem QA-STORAGE-Schreibpaket ebenfalls exklusiv bei Codex: docs/plan-v2.md, docs/integration-status.md, docs/agent-handoffs.md, docs/release-checklist.md, docs/architecture.md. Keine Übernahme von Claude-Dateien.
