# Wortspiel

The active application is the offline web game in `frontend/`. The Python files and `instructions.md` in the original local folder are older prototypes and a generic playbook. Preserve them; do not use their technology stack for this web app.

Use `frontend/src/engine.js` for pure game rules, `storage.js` for transactional state, `speech.js` for explicit local speech, and `main.js` for the German interface. Keep the app static and deployable to GitHub Pages under a relative base URL. There is no backend or cloud transcription in the current version.

Never automatically expire or reset group card history. Reserve exposed cards durably before displaying them. New games, category changes and updates must preserve stable card IDs. Reset requires an explicit in-app confirmation and affects only its chosen group. Undo repairs scoring but keeps exposed cards reserved. Import merges histories and must validate data before writing.

Microphone processing is optional and off by default. Require explicit local processing with no cloud fallback. Never infer who spoke, award points or deduct penalties from transcripts alone. Never put passwords or provider credentials into the public client.

After changing game or storage behavior, run `npm test` in `frontend`. After changing the interface or offline assets, build with `npm run build`, then run relevant Playwright tests with `npm run test:e2e`. Local tests use installed Chrome; CI uses Chromium. Keep dependencies and production font/icon assets self contained for offline play. Preserve GPL notices and attribution.

## Parallel v2 work (Claude Code and Codex)

Work follows `docs/plan-v2.md`. Before starting a task, claim it with `docs/claims/<ID>.md` on a branch `v2/<ID>-<slug>`; skip IDs that are already claimed. Touch only the files the plan assigns to your task and list anything else under "Integrationsbedarf" in the PR. Never commit `frontend/src/data/cards.json`, `package.json`, `package-lock.json`, `frontend/dist/` or `docs/plan-v2.md`; the integrator does that.

Architecture: `src/app.js` holds shared state (`ctx`), `change()`, `render()`, dialogs and the timer. Views live in `src/ui/`, behaviour registers itself from `src/features/` via `registerAction()` (`src/actions.js`) and reacts to game events via `on()` (`src/events.js`: render, result, turn-start, turn-end, pause, resume, tick). New settings are modules in `src/ui/settings/` added with one line to its `index.js`. Pure rule extensions live in `src/rules/`. Styles are partials in `src/styles/`, imported in cascade order by `styles/index.css`. Card packs live in `frontend/data/packs/` and are checked with `npm run cards:check`.

## Integration and release authority (audit 2026-10-09)

ChatGPT/Codex remains the sole main integrator. The user explicitly delegated Cloudflare preparation and, after the required one-time production approval, Cloudflare deployment to Claude Code on 2026-10-09. Claude Code owns isolated tasks with a claim, exclusive files and a PR; prepared prompts in `docs/agent-handoffs.md` do not mean an agent is running. `docs/plan-v2.md` is the current status; the original plan is preserved under `docs/history/`. Do not use old task checkmarks as evidence.

Never experiment directly on main, force-push shared branches, or delete unproven work. Before integrations record the main SHA and push a recovery branch. Inspect PR diffs against current main; copy only missing suitable changes. Close superseded PRs only with linked evidence and retained source branches. Core modules, settings registration, generated cards, pack precedence and lockfiles belong exclusively to the integrator. Never commit dist.

Preserve schema 1, published German and pantomime IDs, group histories and existing session snapshots. Free explaining uses gameMode free / tabooMode none for new setups; legacy taboo / none sessions remain supported. Reconcile settings after reading all form sections. Hidden wizard controls remain enabled and required fields must be revealed before validation. Replay uses the last session's settings; replacement of an unfinished session requires explicit in-app confirmation. Undo restores the scored card's mode and never releases seen IDs. Validate the entire backup before mutating any group.

Card sources use `frontend/data/pack-order.json`: append new packs after existing sources. A new duplicate may add a category, never replace a released card's metadata. Retiring a semantic alias requires an explicit reason; keep its ID and current-session compatibility. Run cards:import from the pinned upstream source, cards:check, unit tests and relevant browser regressions after pack integration.

Local browser testing without Chrome may use installed Chromium via `CI=1`; document this environment difference. CI uses Node 22. Tests/fixtures may be extended, never removed or weakened to hide failures. Review native focus/button behavior before adapting older shortcut tests. Use separate worktrees/builds and PW_PORTs for parallel browser runs.

GitHub Pages stays a fallback. Only main may publish via the Pages workflow; non-main workflow_dispatch is validation only. A green CI is an integration gate, not proof of real-device or full release acceptance. Keep remaining checks explicit in `docs/release-checklist.md`. No stable release tag until mandatory checks pass. New account permissions, first Cloudflare production publication, costs, DNS/domain changes, destructive migration and final legal publication decisions require the user's one-time approval after a concrete preview exists. Do independent authorized work while access is unavailable.

## Active coordination: QA-STORAGE / Claude QA and Cloudflare

Codex owns `v2/QA-STORAGE-safety` / issue #21 and its explicit core-file claim. Claude owns QA-DEVICES (#19 / PR #22), QA-A11Y (#18) when claimed, and DEPLOY-CF (PR #23) with their own files. Coordination and integration requests go through these GitHub issues/PRs; no session is assumed running merely from an old prompt. Before another package check current claims and remote heads. Claude's Cloudflare authorization and hosting files remain his responsibility; Codex integrates required SW/core fixes through separate claims.

UI mutations are fenced by the revision captured when an action is requested; a stale card or session refreshes without scoring. Only our own setup writes leaving the full session unchanged may rebase a queued blur/wizard action. New sessions get an additive identity; old schema-1 sessions without it remain valid. Storage uses exclusive Web Locks or a non-expiring bakery ticket fallback, never a lease that can expire under a suspended writer. Unknown/malformed saved snapshots must not be overwritten with defaults. Coordination tickets contain no game data; timeout never clears history or another writer's ticket.

A persistent `wortspiel.state.v1.pending` revision fences a stale local fallback before an IndexedDB commit can outlive its mirror. Never remove that marker as a shortcut: restore the readable database mirror instead. Journal/ticket access failure must abort before database mutation; never bypass cross-backend coordination. Exports read an authoritative, read-only snapshot. Preserve both pre-existing divergent histories rather than trusting revision alone.

Schema-1 `_storage` metadata fingerprints the complete payload and anchors database/local ancestry without duplicating it. It is consistency metadata, not authentication. A legacy fork with equal history but different scores/session is not safe merely because its revision is higher. Never clear a pending database marker from a local-only writer, even when the local counter reaches it. Preserve unknown future marker versions. Known historical omission of difficulty retains its existing migration; do not weaken that regression test.
