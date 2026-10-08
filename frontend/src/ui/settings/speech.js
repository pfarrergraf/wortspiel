import { icon, action } from "../html.js";

export default {
  id: "speech",
  order: 40,
  render: (settings) =>
    `<div class="speech-setting"><div><span>${icon("mic")} Lokal zuhören</span><small>Experimentell · optional · ohne Cloud</small></div>${action("speech-settings", settings.speech ? "An" : "Prüfen", `small-button ${settings.speech ? "enabled" : ""}`, 'aria-label="Lokale Spracherkennung einstellen"')}</div>`,
  // Speech is switched only through its explicit dialog, never by the form.
  read: () => ({}),
};
