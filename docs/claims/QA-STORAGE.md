# QA-STORAGE – Legacy-Spielstände und konkurrierende Tabs

- Status: aktiv, ChatGPT/Codex (Integrator)
- Issue: #21
- Branch: v2/QA-STORAGE-safety
- Worktree: /workspace/wortspiel-QA-STORAGE
- Basis-SHA: 9c1d9d68a673e02f3e91b234a867e05a1de433b1
- Rückfall: backup/main-2026-10-09-pre-storage auf dem Basis-SHA
- Start: 2026-10-09
- Exklusive Dateien: frontend/src/storage.js, frontend/src/engine.js, frontend/src/app.js, frontend/src/main.js, frontend/src/features/game-actions.js, frontend/src/features/setup-actions.js, frontend/src/features/storage-actions.js; neue frontend/tests/QA-STORAGE.test.mjs, frontend/tests/browser/QA-STORAGE.spec.js, frontend/tests/fixtures/QA-STORAGE/, docs/reviews/QA-STORAGE.md; AGENTS.md, docs/agent-handoffs.md, docs/architecture.md, docs/plan-v2.md, docs/integration-status.md, docs/release-checklist.md.
- Claude-Code-Bereiche ausdrücklich ausgeschlossen: QA-DEVICES/QA-A11Y-Dateien, deren Claims/Reviews, NOISE-01, A15-REVIEW und Cloudflare-Deployment-Dateien/Hostingkonfiguration.
- Keine Lockfile-, Karten-ID-, Schema- oder Speicher-Reset-Änderungen.
- Akzeptanz: Legacy-Runden/Teams/Wertungen/Historien bleiben erhalten; parallele Reservierungen und verspätete Wertungen abgesichert, IndexedDB sowie localStorage mit/ohne Web Locks; bestehende Backups weiterhin importierbar; vollständige Sicherung mindestens als kompatibler Entwurf dokumentiert; Tests/Build/CI und separater PR.

- Zusätzlicher Integrationsbedarf aus Claude PR #22: exklusiv frontend/tests/browser/pantomime.spec.js (vor Erstzählung auf fertiges Setup warten; keine Assertion ändern).
