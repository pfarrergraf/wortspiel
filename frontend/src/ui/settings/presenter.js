import { icon, action } from "../html.js";

export default {
  id: "presenter",
  order: 45,
  render: () =>
    `<div class="speech-setting presenter-setting"><div><span>${icon("arrow")} Presenter</span><small>Fernbedienung für Weiter, Zurück, Überspringen</small></div>${action("presenter-setup", "Einrichten", "small-button", 'aria-label="Presenter einrichten"')}</div>`,
  read: () => ({}),
};
