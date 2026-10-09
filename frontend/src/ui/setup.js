import { ctx } from "../app.js";
import { cards, categories, pantomimeCategories, tabooCardCount } from "../data.js";
import { GAME_MODES, isPantomime, PANTOMIME, configureGameMode } from "../rules/pantomime.js";

// In pantomime the level filter works through the points on each word.
const PANTOMIME_LEVELS = {
  easy: "Nur 1-Punkt-Wörter: eine klare Geste genügt, z. B. schlafen oder Fahrrad fahren.",
  medium: "1- und 2-Punkt-Wörter: dazu Begriffe, die mehrere Gesten brauchen, z. B. Zahnarzt.",
  all: "Alle Wörter bis 3 Punkte, auch ganze Geschichten wie Rotkäppchen.",
};

// The pantomime selection; null in older saves means every category.
export const pantomimeSelection = (settings) =>
  settings.pantomimeSelected ?? pantomimeCategories.map((c) => c.id);
import {
  availableCards,
  cycle,
  groupId,
  matchesSettings,
  DIFFICULTIES,
  PRESETS,
} from "../engine.js";
import { escape, icon, action, colors } from "./html.js";
import { sections } from "./settings/index.js";

export function categoryCounts(categoryId, settings, seen = {}) {
  const pool = cards.filter(
    (c) => c.categories.includes(categoryId) && matchesSettings(c, settings),
  );
  return {
    total: pool.length,
    fresh: pool.filter((c) => !Object.hasOwn(seen, c.id)).length,
  };
}

// Switching to pantomime starts with every level, so the point scale counts.
export function readSettings(changedField) {
  const { state } = ctx;
  const form = document.querySelector("#setup-form");
  if (!form) return state.settings;
  const data = new FormData(form);
  const settings = sections.reduce(
    (settings, section) => ({ ...settings, ...section.read(data, settings) }),
    {
      ...state.settings,
      group: String(data.get("group")).trim(),
      teams: data.getAll("team").map((team) => String(team).trim()),
      // Each mode shows only its own categories; keep the other selection.
      selected: form.querySelector('input[name="category"]')
        ? data.getAll("category")
        : state.settings.selected,
      pantomimeSelected: form.querySelector('input[name="pantomimeCategory"]')
        ? data.getAll("pantomimeCategory")
        : (state.settings.pantomimeSelected ?? null),
      difficulty: String(data.get("difficulty")),
      gameMode: String(data.get("gameMode") || "taboo"),
    },
  );
  return configureGameMode(settings, state.settings, changedField);
}

export function setup() {
  const { state } = ctx;
  const settings = state.settings;
  const group = state.groups[groupId(settings.group)];
  const available = availableCards(cards, settings, group?.seen);
  const pantomime = isPantomime(settings);
  const shown = pantomime ? pantomimeCategories : categories;
  const chosen = pantomime ? pantomimeSelection(settings) : settings.selected;
  const inputName = pantomime ? "pantomimeCategory" : "category";
  return `<section class="hero"><div class="hero-copy"><span class="eyebrow"><span class="tiny-star">✦</span> DEINE RUNDE. EURE WÖRTER.</span><h1>Alles sagen.<br><span>Fast alles.</span><svg viewBox="0 0 300 22" aria-hidden="true"><path d="M5 14Q140-4 291 12M16 20Q160 5 280 18" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round"/></svg></h1><p>Erklärt den Begriff. Umgeht die verbotenen Wörter.<br>Und findet heraus, wer um die Ecke denken kann.</p><div class="hero-facts"><span>${icon("clock")} 30–180 Sekunden</span><span>${icon("sparkle")} 2–6 Teams</span><span>${icon("lock")} Ohne Anmeldung</span></div></div>
    <div class="hero-art" aria-hidden="true"><span class="art-star">✦</span><span class="art-circle"></span><div class="back-card"></div><div class="sample-card"><span class="sample-label">ERKLÄR MAL …</span><strong>Gute Laune</strong><span class="sample-rule">Diese Wörter sind tabu</span><ul><li>Lachen</li><li>Glück</li><li>Freude</li><li>Spaß</li><li>Grinsen</li></ul><span class="sample-bottom">Psst. Das geht auch anders.</span></div><span class="art-badge">Kopf an.<br>Handy weiter.</span></div></section>
    <nav class="section-tabs" aria-label="Spielbereiche"><button class="tab active" data-action="setup">${icon("play")} Spiel vorbereiten</button><button class="tab" data-action="storage">${icon("lock")} Kartenspeicher <span class="count-badge">${Object.keys(group?.seen || {}).length}</span></button></nav>
    ${state.session ? `<div class="resume-banner"><div><strong>Eure Partie ist gespeichert.</strong><span>${escape(state.session.settings.group)} · Runde ${Math.min(cycle(state.session), state.session.settings.cycles)}</span></div>${action("continue", `Partie fortsetzen ${icon("arrow")}`)}</div>` : ""}
    <section class="quick-start panel" aria-label="Schnellstart"><div><h2>Eure nächste Runde</h2><p>${escape((state.session?.settings ?? settings).group)} · ${escape((state.session?.settings ?? settings).teams.join(" & "))}</p><span class="quick-available">${available.length.toLocaleString("de-DE")} ungespielte Karten in der aktuellen Auswahl</span></div><div class="quick-start-actions">${action("replay", state.session ? "Nochmal spielen" : "Letzte Einstellungen verwenden", "button primary")}${action("wizard-open", "Neue Partie vorbereiten")}${action("wizard-all", "Spiel anpassen")}</div></section>
    <nav class="mobile-quickstart" aria-label="Vorbereitung in fünf Schritten" hidden><span id="wizard-progress" aria-live="polite"></span><div class="wizard-controls">${action("wizard-back", "Zurück", "button")}${action("wizard-next", "Weiter", "button primary")}${action("wizard-all", "Alle Einstellungen", "text-button")}</div></nav>
    <form id="setup-form" class="setup-grid"><section class="panel category-panel"><div class="section-heading" data-setup-step="3"><span class="step">01</span><div><h2>Was kommt auf die Karten?</h2><p>Wählt eure Themen. Mischt, was euch gefällt.</p></div><span class="small-tag">${(pantomime ? cards.length - tabooCardCount : tabooCardCount).toLocaleString("de-DE")} ${pantomime ? "Wörter" : "Karten"}</span></div>
      <div class="game-mode-settings" data-setup-step="0"><span class="field-label">Spielmodus</span><div class="game-mode-options">${GAME_MODES.map((m) => `<label class="game-mode ${(settings.gameMode ?? "taboo") === m.id ? "selected" : ""}"><input type="radio" name="gameMode" value="${m.id}" ${(settings.gameMode ?? "taboo") === m.id ? "checked" : ""}><strong>${m.id === PANTOMIME ? "🎭" : "💬"} ${escape(m.name)}</strong><span>${escape(m.description)}</span></label>`).join("")}</div></div>
      <div class="difficulty-settings" data-setup-step="1"><span class="field-label">Schnellauswahl für eure Gruppe</span><div class="preset-buttons">${PRESETS.map((p) => action(`preset:${p.id}`, p.name, "small-button")).join("")}</div><label for="difficulty">Schwierigkeitsgrad</label><select id="difficulty" name="difficulty" aria-describedby="difficulty-note">${DIFFICULTIES.map((d) => `<option value="${d.id}" ${settings.difficulty === d.id ? "selected" : ""}>${d.name}</option>`).join("")}</select><p id="difficulty-note">${pantomime ? PANTOMIME_LEVELS[settings.difficulty] || "" : DIFFICULTIES.find((d) => d.id === settings.difficulty)?.description || ""}</p><small>Eine Einschätzung nach Bekanntheit, keine feste Altersgrenze. Themen und Stufe könnt ihr frei anpassen.</small></div>
      ${pantomime ? `<div class="pantomime-pool" data-setup-step="3">${icon("sparkle")}<p><strong>Punkte nach Schwierigkeit:</strong> ★ 1 Punkt für eine klare Geste, ★★ 2 Punkte für mehrere Gesten, ★★★ 3 Punkte für ganze Geschichten. Eure Tabu-Themen bleiben gespeichert.</p></div>` : ""}<label class="category-search" data-setup-step="3">Themen suchen<input type="search" id="category-search" value="${escape(ctx.categoryQuery)}" placeholder="Zum Beispiel Natur" autocomplete="off"></label><div class="category-tools" data-setup-step="3"><span id="selection-count">${chosen.length} von ${shown.length} ausgewählt</span><button type="button" data-action="all-categories">Alle auswählen</button><button type="button" data-action="no-categories">Alle abwählen</button></div>
      <div class="category-grid" data-setup-step="3">${shown
        .map((category) => {
          const { total, fresh } = categoryCounts(
            category.id,
            settings,
            group?.seen,
          );
          return `<label class="category ${category.color} ${chosen.includes(category.id) ? "selected" : ""}"><input type="checkbox" name="${inputName}" value="${category.id}" ${chosen.includes(category.id) ? "checked" : ""}><span class="category-check">${icon("check")}</span><span class="category-emoji">${category.emoji}</span><strong>${escape(category.name)}</strong><span>${fresh} von ${total} ungespielt</span></label>`;
        })
        .join(
          "",
        )}</div><div class="memory-note" data-setup-step="3">${icon("lock")}<p><strong>Eine Karte. Einmal gesehen.</strong> Euer Kartenspeicher bleibt auch nach einer neuen Partie erhalten.</p></div></section>
    <section class="panel settings-panel"><div class="section-heading" data-setup-step="2"><span class="step coral">02</span><div><h2>Eure Spielrunde</h2><p>Ein Gerät. Alle zusammen.</p></div></div>
      <label class="field-label" data-setup-step="2" for="group-name">Gruppe <span>für euren Kartenspeicher</span></label><input class="text-input" data-setup-step="2" id="group-name" name="group" maxlength="60" value="${escape(settings.group)}" list="groups" required autocomplete="off"><datalist id="groups">${Object.values(
        state.groups,
      )
        .map((g) => `<option value="${escape(g.name)}"></option>`)
        .join("")}</datalist>
      <div class="field-heading" data-setup-step="2"><span>Teams</span><span>2 bis 6</span></div><div class="team-inputs" data-setup-step="2">${settings.teams.map((team, index) => `<div class="team-input"><span class="team-marker ${colors[index]}">${index + 1}</span><input aria-label="Name Team ${index + 1}" name="team" value="${escape(team)}" maxlength="30" required>${settings.teams.length > 2 ? action(`remove-team:${index}`, icon("close"), "remove-team", `aria-label="Team ${index + 1} entfernen"`) : ""}</div>`).join("")}</div>${settings.teams.length < 6 ? action("add-team", `${icon("plus")} Team hinzufügen`, "text-button add-team", 'data-setup-step="2"') : ""}
      ${sections.map((section) => `<div data-setup-step="${section.id === "audience" ? 1 : 4}">${section.render(settings, ctx)}</div>`).join("\n      ")}
      <div class="start-area" data-setup-step="4"><span><strong id="available-count">${available.length.toLocaleString("de-DE")}</strong> ungespielte Karten für euch</span><button type="submit" class="button primary start-button">Los geht’s ${icon("arrow")}</button><small>Erraten ${pantomime ? "+1 bis +3" : "+1"} · ${settings.cycles} Runden für jedes Team</small></div></section></form>`;
}
