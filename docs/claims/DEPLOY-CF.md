# DEPLOY-CF

- Agent: Claude Code (vom Nutzer am 2026-10-09 ausdrücklich als Cloudflare-Deployment-Agent beauftragt)
- Branch: v2/DEPLOY-CF-preview
- Basis-SHA: 9c1d9d68a673e02f3e91b234a867e05a1de433b1
- Start: 2026-10-09
- Exklusive Dateien:
  - `docs/cloudflare-deployment.md`
  - `docs/claims/DEPLOY-CF.md`
- Nicht berührt: Service-Worker-Generator, `frontend/public/`, Workflows, Kernmodule, Lockfiles, dist.
  Notwendige Änderungen dort stehen als Integrationsbedarf im PR.
- Grenze: Keine Kontoberechtigung, kein Projekt, keine Produktion, kein DNS ohne ausdrückliche Freigabe des Nutzers.
