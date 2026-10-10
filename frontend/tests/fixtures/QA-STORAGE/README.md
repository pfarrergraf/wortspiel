# Historical schema-1 regression fixtures

Synthetic games generated with the actual historical engine implementations, not real user data. Fixed clock 1750000000000, revision 41, three teams, three groups, a completed turn and a paused second turn. No regenerating fixtures from the current engine during tests.

- `legacy-v1.json` and `legacy-v1-backup.json`: engine and card source from commit `b926e30`; no v2 settings or per-card mode log fields. Historical initialState/createSession/startTurn/recordResult/finishTurn/nextTurn/pause/ensureGroup/exportBackup functions produced these files.
- `legacy-v2-retired.json`: engine/rule modules/card source from `6de6340`; legacy free explanation (`tabooMode: none`, no explicit free game mode). The current card was deliberately set to the then-active `de:samariter`, now retired but still resolvable, and durably reserved. Tests cover continued scoring of this original card.
- `legacy-v2-pantomime.json`: same historical modules and pantomime source; own `de:pantomime:*` IDs and 1–3-point rules.
- Additional family and youth groups include original explanation and pantomime IDs. Current tests verify every fixture ID against both current pools.

The generator and exact historical module snapshots are additionally retained in the execution audit directory `/workspace/wortspiel-audit/fixture-generators/`. These JSON fixtures are committed, so tests do not depend on that directory or on network/Git access. The playing-round case derives only its phase/deadline from the v1 fixture to test safe pause at browser startup.
