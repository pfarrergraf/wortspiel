import { AGE_GROUPS } from "../../rules/audience.js";
import { TABOO_MODES } from "../../rules/taboo.js";

// E4: age group and taboo level for kids and young teens.
export default {
  id: "audience",
  order: 5,
  render: (settings) =>
    `<div class="settings-row audience-settings"><label>Altersgruppe<select name="ageGroup" aria-label="Altersgruppe">${AGE_GROUPS.map((g) => `<option value="${g.id ?? ""}" ${(settings.ageGroup ?? null) === g.id ? "selected" : ""}>${g.name}</option>`).join("")}</select></label><label>Tabu-Stufe<select name="tabooMode" aria-label="Tabu-Stufe" aria-describedby="taboo-note">${TABOO_MODES.map((m) => `<option value="${m.id}" ${(settings.tabooMode ?? "classic") === m.id ? "selected" : ""}>${m.name}</option>`).join("")}</select></label></div><p class="field-note" id="taboo-note">${TABOO_MODES.find((m) => m.id === (settings.tabooMode ?? "classic")).description}</p>`,
  read: (data) => ({
    ageGroup: data.get("ageGroup") ? Number(data.get("ageGroup")) : null,
    tabooMode: String(data.get("tabooMode") || "classic"),
  }),
};
