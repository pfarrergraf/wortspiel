import { on } from "../events.js";
import { ctx } from "../app.js";

// A presentation-only wizard: all editable values remain in the existing form.
// No game data, saved cards or session schema is changed.
let step = 0;
const names = ["Spielart", "Zielgruppe", "Teams", "Themen", "Losspielen"];
function update() {
  const form = document.getElementById("setup-form");
  if (!form) return;
  form.dataset.wizardStep = String(step);
  const progress = document.getElementById("wizard-progress");
  if (progress) progress.textContent = `Schritt ${step + 1} von 5 · ${names[step]}`;
  const back = document.getElementById("wizard-back");
  const next = document.getElementById("wizard-next");
  if (back) back.disabled = step === 0;
  if (next) {
    next.textContent = step === 4 ? "Einstellungen prüfen" : "Weiter";
    next.hidden = step === 4;
  }
}
on("render", ({view}) => { if (view === "setup") update(); });
document.addEventListener("click", event => {
  if (!event.target.closest(".mobile-quickstart")) return;
  const id = event.target.id;
  if (id === "wizard-back") step = Math.max(0, step - 1);
  else if (id === "wizard-next") step = Math.min(4, step + 1);
  else return;
  update();
  document.getElementById("wizard-progress")?.scrollIntoView({block:"start",behavior:"instant"});
});
document.addEventListener("change", event => {
  if (event.target.matches('#setup-form input[name="gameMode"]') && event.target.value === "free") {
    const select = document.querySelector('#setup-form select[name="tabooMode"]');
    if (select) select.value = "none";
  }
  if (event.target.matches('#setup-form input[name="gameMode"]') && event.target.value === "taboo") {
    const select = document.querySelector('#setup-form select[name="tabooMode"]');
    if (select) select.value = "classic";
  }
});
