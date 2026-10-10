import { ctx } from "../app.js";
import { cards, categories, pantomimeCategories, noisesCategories, tabooCardCount, pantomimeCardCount, noisesCardCount } from "../data.js";
import { GAME_MODES, isPantomime, configureGameMode } from "../rules/pantomime.js";
import { isNoises } from "../rules/noises.js";
import { isMixed, uniqueMixedCards } from "../rules/play-modes.js";

// In pantomime the level filter works through the points on each word.
const PANTOMIME_LEVELS = {
  easy: "Nur 1-Punkt-Wörter: eine klare Geste genügt, z. B. schlafen oder Fahrrad fahren.",
  medium: "1- und 2-Punkt-Wörter: dazu Begriffe, die mehrere Gesten brauchen, z. B. Zahnarzt.",
  all: "Alle Wörter bis 3 Punkte, auch ganze Geschichten wie Rotkäppchen.",
};

// The pantomime selection; null in older saves means every category.
export const pantomimeSelection = (settings) =>
  settings.pantomimeSelected ?? pantomimeCategories.map((c) => c.id);
export const noisesSelection = settings => settings.noisesSelected ?? noisesCategories.map(c => c.id);
export const setupCategories = settings => isMixed(settings) ? [...categories, ...pantomimeCategories, ...noisesCategories] : isPantomime(settings) ? pantomimeCategories : isNoises(settings) ? noisesCategories : categories;
export const selectionField = id => id.startsWith("pm-") ? "pantomimeSelected" : id.startsWith("ns-") ? "noisesSelected" : "selected";
const inputFor = id => id.startsWith("pm-") ? "pantomimeCategory" : id.startsWith("ns-") ? "noisesCategory" : "category";
const modeShort = { taboo: "Verbotene Wörter", free: "Frei", pantomime: "Pantomime", noises: "Geräusche", mixed: "Gemischt" };
const modeSymbol = { taboo: "💬", free: "🗣️", pantomime: "🎭", noises: "🔊", mixed: "🔀" };
const compactNote = { taboo: "Mit Worten erklären, ohne die verbotenen Wörter zu sagen.", free: "Mit Worten erklären, ohne das Lösungswort zu sagen.", pantomime: "Mit Gesten vorspielen, ohne Worte und Geräusche.", noises: "Geräusche nachmachen, ohne Wörter und Gesten.", mixed: "Vier Darstellungsarten. Die Karte zeigt deine Aufgabe." };
const NOISE_LEVELS = { easy: "Vertraute Geräusche, z. B. Kuh, Hahn und Katze.", medium: "Leichte Geräusche plus mehr Einzelheiten, z. B. Specht oder Waschmaschine.", all: "Alle Geräusche, auch komplexe Folgen wie Funkgerät oder quietschende Zugbremsen." };
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

export const compactSetupSummary = (settings, remaining) =>
  `${remaining.toLocaleString("de-DE")} ungespielte Karten · ${settings.seconds} Sekunden · ${settings.cycles} ${settings.cycles === 1 ? "Runde" : "Runden"} pro Team`;

export function categoryCounts(categoryId, settings, seen = {}) {
  const pool = cards.filter(
    (c) => c.categories.includes(categoryId) && matchesSettings(c, settings),
  );
  return {
    total: isMixed(settings) ? uniqueMixedCards(pool, cards).length : pool.length,
    fresh: isMixed(settings) ? uniqueMixedCards(pool, cards, seen).length : pool.filter((c) => !Object.hasOwn(seen, c.id)).length,
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
      noisesSelected: form.querySelector('input[name="noisesCategory"]')
        ? data.getAll("noisesCategory")
        : (state.settings.noisesSelected ?? null),
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
  const noises = isNoises(settings);
  const mixed = isMixed(settings);
  const shown = setupCategories(settings);
  const chosen = mixed ? [...settings.selected, ...pantomimeSelection(settings), ...noisesSelection(settings)] : pantomime ? pantomimeSelection(settings) : noises ? noisesSelection(settings) : settings.selected;
  return `    <nav class="section-tabs" aria-label="Spielbereiche"><button class="tab active" data-action="setup">${icon("play")} Spiel vorbereiten</button><button class="tab" data-action="storage">${icon("lock")} Kartenspeicher <span class="count-badge">${Object.keys(group?.seen || {}).length}</span></button></nav>
    ${state.session ? `<div class="resume-banner"><div><strong>Eure Partie ist gespeichert.</strong><span>${escape(state.session.settings.group)} · Runde ${Math.min(cycle(state.session), state.session.settings.cycles)}</span></div>${action("continue", `Partie fortsetzen ${icon("arrow")}`)}</div>` : ""}
    <section class="quick-start panel" aria-label="Schnellstart"><div><h2>Eure nächste Runde</h2><p class="replay-settings">${escape((state.session?.settings ?? settings).group)} · ${escape((state.session?.settings ?? settings).teams.join(" & "))}</p><p class="current-settings">${escape(settings.group)} · ${escape(settings.teams.join(" & "))}</p><span class="quick-available">${available.length.toLocaleString("de-DE")} ungespielte Karten in der aktuellen Auswahl</span></div><div class="quick-start-actions">${action("replay", state.session ? "Nochmal spielen" : "Letzte Einstellungen verwenden", "button primary")}${action("wizard-open", "Neue Partie vorbereiten")}${action("wizard-all", "Spiel anpassen")}${action("setup-compact", "Einstellungen schließen", "button close-setup")}</div></section>
    <nav class="mobile-quickstart" aria-label="Vorbereitung in fünf Schritten" hidden><span id="wizard-progress" aria-live="polite"></span><div class="wizard-controls">${action("wizard-back", "Zurück", "button")}${action("wizard-next", "Weiter", "button primary")}${action("wizard-all", "Alle Einstellungen", "text-button")}</div></nav>
    <form id="setup-form" class="setup-grid"><section class="panel category-panel"><div class="game-mode-settings mode-landing ${ctx.startMotionPaused ? "motion-paused" : ""}" data-setup-step="0"><div class="start-title"><h1>Ludeverbis<span>Spiele mit Wörtern</span></h1>${action("toggle-start-motion", icon(ctx.startMotionPaused ? "play" : "pause"), "orbit-motion", `aria-label="${ctx.startMotionPaused ? "Animation fortsetzen" : "Animation anhalten"}" aria-pressed="${Boolean(ctx.startMotionPaused)}"`)}</div><span class="field-label wheel-label">Wähle deine Spielart</span><div class="game-mode-options mode-wheel"><div class="orbit-ring" aria-hidden="true"></div><span class="wheel-center" aria-hidden="true">✦</span>${GAME_MODES.map((m) => `<label class="game-mode choice-${m.id} ${(settings.gameMode ?? "taboo") === m.id ? "selected" : ""}"><input type="radio" name="gameMode" value="${m.id}" aria-label="${escape(modeShort[m.id])}" ${(settings.gameMode ?? "taboo") === m.id ? "checked" : ""}><span class="choice-symbol" aria-hidden="true">${modeSymbol[m.id]}</span><strong>${escape(modeShort[m.id])}</strong><span class="mode-description">${escape(m.description)}</span></label>`).join("")}</div><p class="compact-mode-note">${escape(compactNote[settings.gameMode ?? "taboo"] || "")}</p></div>
      <div class="section-heading" data-setup-step="3"><span class="step">01</span><div><h2>Was kommt auf die Karten?</h2><p>Wählt eure Themen. Mischt, was euch gefällt.</p></div><span class="small-tag">${(mixed ? uniqueMixedCards(cards.filter(card => card.retired !== true), cards).length : pantomime ? pantomimeCardCount : noises ? noisesCardCount : tabooCardCount).toLocaleString("de-DE")} ${pantomime || noises || mixed ? "Wörter" : "Karten"}</span></div>
      <div class="difficulty-settings" data-setup-step="1"><span class="field-label">Schnellauswahl für eure Gruppe</span><div class="preset-buttons">${PRESETS.map((p) => action(`preset:${p.id}`, p.name, "small-button")).join("")}</div><label for="difficulty">Schwierigkeitsgrad</label><select id="difficulty" name="difficulty" aria-describedby="difficulty-note">${DIFFICULTIES.map((d) => `<option value="${d.id}" ${settings.difficulty === d.id ? "selected" : ""}>${d.name}</option>`).join("")}</select><p id="difficulty-note">${pantomime ? PANTOMIME_LEVELS[settings.difficulty] || "" : noises ? NOISE_LEVELS[settings.difficulty] || "" : DIFFICULTIES.find((d) => d.id === settings.difficulty)?.description || ""}</p><small>Die Schwierigkeit richtet sich nach der Bekanntheit der Begriffe. Themen und Stufe könnt ihr frei anpassen.</small></div>
      <div class="compact-start"><button type="submit" class="button primary">Los geht’s ${icon("arrow")}</button><p>${compactSetupSummary(settings, available.length)}</p></div>
      ${noises || mixed ? `<div class="pantomime-pool" data-setup-step="3"><span aria-hidden="true">${noises ? "🔊" : "🔀"}</span><p>${noises ? "Ein eigener Pool mit konkreten Geräuschen. Ohne Wörter, Gesten oder Gegenstände; jeder Treffer gibt 1 Punkt." : "Vier Darstellungsarten werden zufällig gemischt. Nur passende Begriffe werden gewählt; Symbol, Farbe und Text zeigen die Aufgabe. Gleiche Wörter werden zusammengefasst. Jeder Treffer gibt 1 Punkt."}</p></div>` : ""}${pantomime ? `<div class="pantomime-pool" data-setup-step="3">${icon("sparkle")}<p><strong>Punkte nach Schwierigkeit:</strong> ★ 1 Punkt für eine klare Geste, ★★ 2 Punkte für mehrere Gesten, ★★★ 3 Punkte für ganze Geschichten. Eure Erklärungsthemen bleiben gespeichert.</p></div>` : ""}<label class="category-search" data-setup-step="3">Themen suchen<input type="search" id="category-search" value="${escape(ctx.categoryQuery)}" placeholder="Zum Beispiel Natur" autocomplete="off"></label><div class="category-tools" data-setup-step="3"><span id="selection-count">${chosen.length} von ${shown.length} ausgewählt</span><button type="button" data-action="all-categories">Alle auswählen</button><button type="button" data-action="no-categories">Alle abwählen</button></div>
      <div class="category-grid" data-setup-step="3">${shown
        .map((category) => {
          const { total, fresh } = categoryCounts(
            category.id,
            settings,
            group?.seen,
          );
          return `<label class="category ${category.color} ${chosen.includes(category.id) ? "selected" : ""}"><input type="checkbox" name="${inputFor(category.id)}" value="${category.id}" ${chosen.includes(category.id) ? "checked" : ""}><span class="category-check">${icon("check")}</span><span class="category-emoji">${category.emoji}</span><strong>${escape(category.name)}${mixed ? `<small class="category-pool">${category.id.startsWith("ns-") ? "Geräusche" : category.id.startsWith("pm-") ? "Pantomime" : "Verbotene Wörter / Frei"}</small>` : ""}</strong><span>${fresh} von ${total} ungespielt</span></label>`;
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
