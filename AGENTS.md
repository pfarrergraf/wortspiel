# Wortspiel

The active application is the offline web game in `frontend/`. The Python files and `instructions.md` in the original local folder are older prototypes and a generic playbook. Preserve them; do not use their technology stack for this web app.

Use `frontend/src/engine.js` for pure game rules, `storage.js` for transactional state, `speech.js` for explicit local speech, and `main.js` for the German interface. Keep the app static and deployable to GitHub Pages under a relative base URL. There is no backend or cloud transcription in the current version.

Never automatically expire or reset group card history. Reserve exposed cards durably before displaying them. New games, category changes and updates must preserve stable card IDs. Reset requires an explicit in-app confirmation and affects only its chosen group. Undo repairs scoring but keeps exposed cards reserved. Import merges histories and must validate data before writing.

Microphone processing is optional and off by default. Require explicit local processing with no cloud fallback. Never infer who spoke, award points or deduct penalties from transcripts alone. Never put passwords or provider credentials into the public client.

After changing game or storage behavior, run `npm test` in `frontend`. After changing the interface or offline assets, build with `npm run build`, then run relevant Playwright tests with `npm run test:e2e`. Local tests use installed Chrome; CI uses Chromium. Keep dependencies and production font/icon assets self contained for offline play. Preserve GPL notices and attribution.

## Parallel v2 work (Claude Code and Codex)

Work follows `docs/plan-v2.md`. Before starting a task, claim it with `docs/claims/<ID>.md` on a branch `v2/<ID>-<slug>`; skip IDs that are already claimed. Touch only the files the plan assigns to your task and list anything else under "Integrationsbedarf" in the PR. Never commit `frontend/src/data/cards.json`, `package.json`, `package-lock.json`, `frontend/dist/` or `docs/plan-v2.md`; the integrator does that.

Architecture: `src/app.js` holds shared state (`ctx`), `change()`, `render()`, dialogs and the timer. Views live in `src/ui/`, behaviour registers itself from `src/features/` via `registerAction()` (`src/actions.js`) and reacts to game events via `on()` (`src/events.js`: render, result, turn-start, turn-end, pause, resume, tick). New settings are modules in `src/ui/settings/` added with one line to its `index.js`. Pure rule extensions live in `src/rules/`. Styles are partials in `src/styles/`, imported in cascade order by `styles/index.css`. Card packs live in `frontend/data/packs/` and are checked with `npm run cards:check`.
