import { on } from "../events.js";
import { ctx, change } from "../app.js";
import { registerAction } from "../actions.js";
import { readSettings } from "../ui/setup.js";

const names = ["Spielart", "Schwierigkeit", "Teams", "Themen", "Spielstart"];

function placeInstallHint() {
  const form = document.querySelector("#setup-form");
  const hint = document.querySelector(".ios-install-hint");
  if (!form || !hint) return;
  const phone = matchMedia("(max-width: 743px), (max-width: 950px) and (max-height: 500px)").matches;
  const compact = phone && !Number.isInteger(ctx.setupWizardStep) && !ctx.setupExpanded;
  const anchor = compact ? form : document.querySelector(".section-tabs");
  if (anchor && hint.previousElementSibling !== anchor) anchor.after(hint);
}

function filterCategories() {
  const query = ctx.categoryQuery.trim().toLocaleLowerCase("de");
  document.querySelectorAll(".category").forEach((label) => {
    label.hidden = !label.querySelector("strong").textContent.toLocaleLowerCase("de").includes(query);
  });
}

function update() {
  const form = document.querySelector("#setup-form");
  if (!form) return;
  const step = ctx.setupWizardStep;
  const guided = Number.isInteger(step);
  form.closest("main").classList.add("setup-page");
  form.closest("main").classList.toggle("compact-setup", !guided && !ctx.setupExpanded);
  document.querySelector(".mobile-quickstart").hidden = !guided;
  document.querySelector("#wizard-progress").textContent = `Schritt ${(step ?? 0) + 1} von 5 · ${names[step ?? 0]}`;
  form.querySelectorAll("[data-setup-step]").forEach((section) => {
    section.hidden = guided && Number(section.dataset.setupStep) !== step;
  });
  for (const panel of form.querySelectorAll(".panel"))
    panel.hidden = guided && !panel.querySelector("[data-setup-step]:not([hidden])");
  document.querySelector('[data-action="wizard-back"]').disabled = step === 0;
  document.querySelector('[data-action="wizard-next"]').hidden = step === 4;
  filterCategories();
  // The hint's render subscriber may run after this one. Keep visual and
  // keyboard order identical when it adds the optional installation note.
  queueMicrotask(placeInstallHint);
}

window.addEventListener("resize", placeInstallHint);

function show(step, push = true) {
  ctx.setupWizardStep = step;
  ctx.setupExpanded = true;
  if (push) history.pushState({ wortspielWizard: step }, "", location.href);
  update();
  document.querySelector(step == null ? "#setup-form" : ".mobile-quickstart")?.scrollIntoView({ block: "start" });
}

on("render", update);
registerAction("wizard-open", () => show(0));
registerAction("wizard-all", () => show(null));
function compact(push = true) {
  ctx.setupWizardStep = null;
  ctx.setupExpanded = false;
  if (push) history.pushState({ wortspielSetupCompact: true }, "", location.href);
  update();
  document.querySelector(".quick-start")?.scrollIntoView({ block: "start" });
}
registerAction("setup-compact", () => compact());
registerAction("wizard-back", () => {
  if (ctx.setupWizardStep > 0) show(ctx.setupWizardStep - 1);
});
registerAction("wizard-next", async () => {
  if (ctx.setupWizardStep === 2) {
    for (const input of document.querySelectorAll('#setup-form input[name="group"], #setup-form input[name="team"]'))
      if (!input.reportValidity()) return;
  }
  if (!await change((state) => { state.settings = readSettings(); }, null, false)) return;
  show(Math.min(4, ctx.setupWizardStep + 1));
});

// Hidden controls stay enabled so FormData keeps every setting. Before native
// validation focuses an invalid required field, reveal the appropriate step.
document.addEventListener("invalid", (event) => {
  if (!event.target.closest("#setup-form")) return;
  const section = event.target.closest("[data-setup-step]");
  if (section) show(ctx.setupWizardStep != null ? Number(section.dataset.setupStep) : null, false);
}, true);

window.addEventListener("popstate", (event) => {
  if (ctx.view !== "setup") return;
  const step = event.state?.wortspielWizard;
  if (Number.isInteger(step) && step >= 0 && step <= 4) show(step, false);
  else if (event.state?.wortspielWizard === null) show(null, false);
  else compact(false);
});

document.addEventListener("input", (event) => {
  if (event.target.id !== "category-search") return;
  ctx.categoryQuery = event.target.value;
  filterCategories();
});
