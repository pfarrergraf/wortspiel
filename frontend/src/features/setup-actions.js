import { ctx, change, dialog } from "../app.js";
import { registerAction } from "../actions.js";
import { cards, categories, pantomimeCategories } from "../data.js";
import { isPantomime } from "../rules/pantomime.js";
import {
  applyPreset,
  availableCards,
  createSession,
  groupId,
} from "../engine.js";
import { action } from "../ui/html.js";
import { categoryCounts, readSettings } from "../ui/setup.js";

document.addEventListener("submit", async (event) => {
  if (event.target.id !== "setup-form") return;
  event.preventDefault();
  const settings = readSettings();
  if (ctx.state.session && ctx.state.session.phase !== "finished") {
    await change((s) => {
      s.settings = settings;
    });
    dialog(
      "Neue Partie beginnen?",
      "<p>Die laufende Partie wird beendet. Bereits gesehene Karten bleiben im Kartenspeicher.</p>",
      `${action("replace-game", "Neue Partie starten", "button primary")}${action("close-dialog", "Abbrechen")}`,
    );
  } else
    await change(
      (s) => {
        s.settings = settings;
        createSession(s, cards, categories);
      },
      () => {
        ctx.view = "game";
        window.scrollTo(0, 0);
      },
    );
});

// Text inputs save without a repaint so typing keeps focus; only counts update.
document.addEventListener("change", async (event) => {
  if (!event.target.closest("#setup-form")) return;
  const settings = readSettings();
  const textInput = event.target.matches(
    'input[name="team"], input[name="group"]',
  );
  await change(
    (s) => {
      s.settings = settings;
    },
    () => {
      if (!textInput || !document.querySelector("#available-count")) return;
      const group = ctx.state.groups[groupId(settings.group)];
      document.querySelector("#available-count").textContent = availableCards(
        cards,
        settings,
        group?.seen,
      ).length.toLocaleString("de-DE");
      document.querySelectorAll(".category").forEach((label) => {
        const { total, fresh } = categoryCounts(
          label.querySelector("input").value,
          settings,
          group?.seen,
        );
        label.lastElementChild.textContent = `${fresh} von ${total} ungespielt`;
      });
    },
    !textInput,
  );
});

for (const id of ["all-categories", "no-categories"])
  registerAction(id, () => {
    const settings = readSettings();
    const pantomime = isPantomime(settings);
    const ids = (pantomime ? pantomimeCategories : categories).map((c) => c.id);
    return change((s) => {
      s.settings = {
        ...settings,
        [pantomime ? "pantomimeSelected" : "selected"]:
          id === "all-categories" ? ids : [],
      };
    });
  });

registerAction("preset:", (id) => {
  const settings = readSettings();
  return change((s) => {
    s.settings = settings;
    applyPreset(s.settings, id.split(":")[1], categories);
  });
});

registerAction("add-team", () => {
  const settings = readSettings();
  return change((s) => {
    s.settings = settings;
    if (settings.teams.length < 6)
      settings.teams.push(`Team ${settings.teams.length + 1}`);
  });
});
registerAction("remove-team:", (id) => {
  const settings = readSettings();
  return change((s) => {
    s.settings = settings;
    if (settings.teams.length > 2)
      settings.teams.splice(Number(id.split(":")[1]), 1);
  });
});
