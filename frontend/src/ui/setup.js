import { ctx } from "../app.js";
import { cards, categories } from "../data.js";
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

export function readSettings() {
  const { state } = ctx;
  const form = document.querySelector("#setup-form");
  if (!form) return state.settings;
  const data = new FormData(form);
  return sections.reduce(
    (settings, section) => ({ ...settings, ...section.read(data, settings) }),
    {
      ...state.settings,
      group: String(data.get("group")).trim(),
      teams: data.getAll("team").map((team) => String(team).trim()),
      selected: data.getAll("category"),
      difficulty: String(data.get("difficulty")),
    },
  );
}

export function setup() {
  const { state } = ctx;
  const settings = state.settings;
  const group = state.groups[groupId(settings.group)];
  const available = availableCards(cards, settings, group?.seen);
  return `<section class="hero"><div class="hero-copy"><span class="eyebrow"><span class="tiny-star">✦</span> DEINE RUNDE. EURE WÖRTER.</span><h1>Alles sagen.<br><span>Fast alles.</span><svg viewBox="0 0 300 22" aria-hidden="true"><path d="M5 14Q140-4 291 12M16 20Q160 5 280 18" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round"/></svg></h1><p>Erklärt den Begriff. Umgeht die verbotenen Wörter.<br>Und findet heraus, wer um die Ecke denken kann.</p><div class="hero-facts"><span>${icon("clock")} 30–180 Sekunden</span><span>${icon("sparkle")} 2–6 Teams</span><span>${icon("lock")} Ohne Anmeldung</span></div></div>
    <div class="hero-art" aria-hidden="true"><span class="art-star">✦</span><span class="art-circle"></span><div class="back-card"></div><div class="sample-card"><span class="sample-label">ERKLÄR MAL …</span><strong>Gute Laune</strong><span class="sample-rule">Diese Wörter sind tabu</span><ul><li>Lachen</li><li>Glück</li><li>Freude</li><li>Spaß</li><li>Grinsen</li></ul><span class="sample-bottom">Psst. Das geht auch anders.</span></div><span class="art-badge">Kopf an.<br>Handy weiter.</span></div></section>
    <nav class="section-tabs" aria-label="Spielbereiche"><button class="tab active" data-action="setup">${icon("play")} Spiel vorbereiten</button><button class="tab" data-action="storage">${icon("lock")} Kartenspeicher <span class="count-badge">${Object.keys(group?.seen || {}).length}</span></button></nav>
    ${state.session ? `<div class="resume-banner"><div><strong>Eure Partie ist gespeichert.</strong><span>${escape(state.session.settings.group)} · Runde ${Math.min(cycle(state.session), state.session.settings.cycles)}</span></div>${action("continue", `Partie fortsetzen ${icon("arrow")}`)}</div>` : ""}
    <form id="setup-form" class="setup-grid"><section class="panel category-panel"><div class="section-heading"><span class="step">01</span><div><h2>Was kommt auf die Karten?</h2><p>Wählt eure Themen. Mischt, was euch gefällt.</p></div><span class="small-tag">${cards.length.toLocaleString("de-DE")} Karten</span></div>
      <div class="difficulty-settings"><span class="field-label">Schnellauswahl für eure Gruppe</span><div class="preset-buttons">${PRESETS.map((p) => action(`preset:${p.id}`, p.name, "small-button")).join("")}</div><label for="difficulty">Schwierigkeitsgrad</label><select id="difficulty" name="difficulty" aria-describedby="difficulty-note">${DIFFICULTIES.map((d) => `<option value="${d.id}" ${settings.difficulty === d.id ? "selected" : ""}>${d.name}</option>`).join("")}</select><p id="difficulty-note">${DIFFICULTIES.find((d) => d.id === settings.difficulty)?.description || ""}</p><small>Eine Einschätzung nach Bekanntheit, keine feste Altersgrenze. Themen und Stufe könnt ihr frei anpassen.</small></div>
      <div class="category-tools"><span id="selection-count">${settings.selected.length} von ${categories.length} ausgewählt</span><button type="button" data-action="all-categories">Alle auswählen</button><button type="button" data-action="no-categories">Alle abwählen</button></div>
      <div class="category-grid">${categories
        .map((category) => {
          const { total, fresh } = categoryCounts(
            category.id,
            settings,
            group?.seen,
          );
          return `<label class="category ${category.color} ${settings.selected.includes(category.id) ? "selected" : ""}"><input type="checkbox" name="category" value="${category.id}" ${settings.selected.includes(category.id) ? "checked" : ""}><span class="category-check">${icon("check")}</span><span class="category-emoji">${category.emoji}</span><strong>${escape(category.name)}</strong><span>${fresh} von ${total} ungespielt</span></label>`;
        })
        .join(
          "",
        )}</div><div class="memory-note">${icon("lock")}<p><strong>Eine Karte. Einmal gesehen.</strong> Euer Kartenspeicher bleibt auch nach einer neuen Partie erhalten.</p></div></section>
    <section class="panel settings-panel"><div class="section-heading"><span class="step coral">02</span><div><h2>Eure Spielrunde</h2><p>Ein Gerät. Alle zusammen.</p></div></div>
      <label class="field-label" for="group-name">Gruppe <span>für euren Kartenspeicher</span></label><input class="text-input" id="group-name" name="group" maxlength="60" value="${escape(settings.group)}" list="groups" required autocomplete="off"><datalist id="groups">${Object.values(
        state.groups,
      )
        .map((g) => `<option value="${escape(g.name)}"></option>`)
        .join("")}</datalist>
      <div class="field-heading"><span>Teams</span><span>2 bis 6</span></div><div class="team-inputs">${settings.teams.map((team, index) => `<div class="team-input"><span class="team-marker ${colors[index]}">${index + 1}</span><input aria-label="Name Team ${index + 1}" name="team" value="${escape(team)}" maxlength="30" required>${settings.teams.length > 2 ? action(`remove-team:${index}`, icon("close"), "remove-team", `aria-label="Team ${index + 1} entfernen"`) : ""}</div>`).join("")}</div>${settings.teams.length < 6 ? action("add-team", `${icon("plus")} Team hinzufügen`, "text-button add-team") : ""}
      ${sections.map((section) => section.render(settings, ctx)).join("\n      ")}
      <div class="start-area"><span><strong id="available-count">${available.length.toLocaleString("de-DE")}</strong> ungespielte Karten für euch</span><button type="submit" class="button primary start-button">Los geht’s ${icon("arrow")}</button><small>Erraten +1 · ${settings.cycles} Runden für jedes Team</small></div></section></form>`;
}
