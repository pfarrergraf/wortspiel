// Setup sections in the "Eure Spielrunde" panel. To add a setting, create a
// module exporting { id, order, render(settings), read(formData, settings) }
// and add ONE import line plus its name in the list below.
import audience from "./audience.js";
import rounds from "./rounds.js";
import rules from "./rules.js";
import sound from "./sound.js";
import speech from "./speech.js";
import presenter from "./presenter.js";

export const sections = [audience, rounds, rules, sound, speech, presenter].sort(
  (a, b) => a.order - b.order,
);
