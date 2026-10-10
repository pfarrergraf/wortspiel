import { TABOO_MODES } from "../../rules/taboo.js";

// Taboo level is independent of difficulty; legacy age settings stay untouched.
export default {
  id: "audience",
  order: 5,
  render: (settings) =>
    `<div class="settings-row audience-settings"><label>Verbotene Wörter pro Karte<select name="tabooMode" aria-label="Verbotene Wörter pro Karte" aria-describedby="taboo-note">${TABOO_MODES.map((m) => `<option value="${m.id}" ${(settings.tabooMode ?? "classic") === m.id ? "selected" : ""}>${m.name}</option>`).join("")}</select></label></div><p class="field-note" id="taboo-note">${TABOO_MODES.find((m) => m.id === (settings.tabooMode ?? "classic")).description}</p>`,
  read: (data) => ({
    tabooMode: String(data.get("tabooMode") || "classic"),
  }),
};
