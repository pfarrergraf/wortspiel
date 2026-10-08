import { icon } from "../html.js";

export default {
  id: "sound",
  order: 30,
  render: (settings) =>
    `<label class="toggle-row"><span>${icon("volume")} Sounds & Signale</span><input type="checkbox" name="sound" role="switch" ${settings.sound ? "checked" : ""}></label>`,
  read: (data) => ({ sound: data.get("sound") === "on" }),
};
