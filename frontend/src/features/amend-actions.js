import { ctx, change, dialog } from "../app.js";
import { registerAction } from "../actions.js";
import { cards } from "../data.js";
import { amendTurn, RESULTS } from "../engine.js";
import { action, escape, icon } from "../ui/html.js";
import { resultLabel } from "../ui/summary.js";

// Lets the moderator correct a turn after it ended: a mistyped result, or a
// card the team guessed in the very last second.
// "amend:<turn>:<position>" opens the choice, "amend:<turn>:<position>:<result>" applies it.
registerAction("amend:", (id) => {
  const [, turn, position, result] = id.split(":");
  const at = position === "open" ? "open" : Number(position);
  if (result)
    return change((s) => amendTurn(s, cards, Number(turn), at, result));
  const session = ctx.state.session;
  const entry = session?.turns[Number(turn)]?.log[at];
  if (!entry) return;
  dialog(
    `Wertung für „${escape(entry.word)}“ ändern`,
    `<p>Aktuell: <strong>${resultLabel(entry.result, session.settings)}</strong>. Die Punkte des Teams werden sofort angepasst. Die Karte bleibt im Kartenspeicher.</p>`,
    RESULTS.map((option) =>
      action(
        `amend:${turn}:${position}:${option}`,
        `${icon(option === "correct" ? "check" : option === "taboo" ? "close" : "skip")} ${resultLabel(option, session.settings)}`,
        option === entry.result ? "button primary" : "button secondary",
        option === entry.result ? 'aria-current="true"' : "",
      ),
    ).join(""),
  );
});
