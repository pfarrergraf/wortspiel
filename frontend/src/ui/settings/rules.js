export default {
  id: "rules",
  order: 20,
  render: (settings) =>
    `<div class="settings-row rule-settings"><label>Überspringen<select name="skipPenalty"><option value="0" ${settings.skipPenalty === 0 ? "selected" : ""}>Kein Abzug</option><option value="1" ${settings.skipPenalty === 1 ? "selected" : ""}>−1 Punkt</option></select></label><label>Verbotenes Wort<select name="tabooPenalty"><option value="1" ${settings.tabooPenalty === 1 ? "selected" : ""}>−1 Punkt</option><option value="0" ${settings.tabooPenalty === 0 ? "selected" : ""}>Kein Abzug</option></select></label></div>`,
  read: (data) => ({
    skipPenalty: Number(data.get("skipPenalty")),
    tabooPenalty: Number(data.get("tabooPenalty")),
  }),
};
