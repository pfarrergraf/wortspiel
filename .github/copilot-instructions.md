# Wortspiel web application

The active application is the static offline game in frontend/. Follow AGENTS.md and the current docs/plan-v2.md before changing it. Older Python files, instructions.md and bootstrap.ps1 are preserved prototypes, not the application's stack. The previous desktop instructions are archived in docs/history/copilot-instructions-desktop.md.

Rules belong in src/engine.js and src/rules/, transactional storage in src/storage.js, shared state and mutations in src/app.js, German views in src/ui/ and actions in src/features/. Preserve schema 1, card IDs, group histories and session settings. Reserve every exposed card durably before display. Undo and later scoring corrections never release exposed IDs. Imports validate before mutation and merge histories. No automatic reset or expiry.

Keep microphone processing explicit, optional and local, with no cloud fallback or automatic transcript scoring. Keep the client free of credentials. Build with a relative base URL and self-contained offline assets, preserving GPL notices and attribution.

Claim work on its own branch before implementation. Codex is the main integrator. Run npm test after game/storage changes and npm run build plus relevant npm run test:e2e after UI/offline changes; local tests use installed Chrome and CI uses Chromium. Never commit dist. Check cards with npm run cards:check and preserve released metadata when appending pack sources.
