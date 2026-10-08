export default {
  id: "rounds",
  order: 10,
  render: (settings) =>
    `<div class="settings-row"><label>Rundenzeit<select name="seconds" aria-label="Rundenzeit">${[30, 45, 60, 90, 120, 180].map((n) => `<option value="${n}" ${settings.seconds === n ? "selected" : ""}>${n} Sekunden</option>`).join("")}</select></label><label>Runden pro Team<select name="cycles" aria-label="Runden pro Team">${[1, 2, 3, 5, 7, 10, 20].map((n) => `<option value="${n}" ${settings.cycles === n ? "selected" : ""}>${n} ${n === 1 ? "Runde" : "Runden"}</option>`).join("")}</select></label></div>`,
  read: (data) => ({
    seconds: Number(data.get("seconds")),
    cycles: Number(data.get("cycles")),
  }),
};
