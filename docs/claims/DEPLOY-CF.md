# DEPLOY-CF

- Agent: Claude Code (vom Nutzer am 2026-10-09 ausdrücklich als Cloudflare-Deployment-Agent beauftragt)
- Branch: v2/DEPLOY-CF-preview (PR #23)
- Basis-SHA: 9c1d9d68a673e02f3e91b234a867e05a1de433b1; Fortsetzung auf main 35389e3c96a2442a9a3e38fc929e6136cde1c3c2 (per Merge-Commit übernommen)
- Start: 2026-10-09
- Exklusive Dateien:
  - `docs/cloudflare-deployment.md`
  - `docs/claims/DEPLOY-CF.md`
- Nicht berührt: Service-Worker-Generator, `frontend/public/`, Tests, Workflows, Kernmodule, Lockfiles, dist.
  CF-1/CF-2 (inkl. Regressionstest) gehören laut `docs/claims/CF-1.md` exklusiv dem Integrator (`v2/CF-1-offline`);
  deshalb kein eigener `v2/DEPLOY-CF-swfix`-PR. Befunde und geprüfter Patch stehen als Integrationsbedarf in der Doku.
- Kontoaktionen mit Freigabe des Nutzers (Sitzung 2026-10-09): Pages-Projekt `wortspiel-app` (Direct Upload,
  Produktionsbranch main) angelegt; nur Preview-Deployments. Kein Produktionsdeployment, keine Domain/DNS,
  keine weiteren Token, keine Kosten, nichts gelöscht.
- Grenze: Produktion (`--branch main`), Domains/DNS, neue Berechtigungen, Kosten und Löschungen nur nach neuer ausdrücklicher Freigabe.
