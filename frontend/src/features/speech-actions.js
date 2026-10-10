import { ctx, change, dialog, toast } from "../app.js";
import { registerAction } from "../actions.js";
import { on } from "../events.js";
import { cards } from "../data.js";
import { pause } from "../engine.js";
import { visibleTaboo } from "../rules/taboo.js";
import { presentationMode, presentationSettings } from "../rules/play-modes.js";
import { LocalSpeech, findSpeechMatches } from "../speech.js";
import { action } from "../ui/html.js";
import { speechView } from "../ui/game.js";

const feedback = (text) => {
  const target = document.querySelector("#speech-feedback");
  if (target) target.textContent = text;
};

const speech = new LocalSpeech(
  (text) => {
    if (ctx.state.session?.phase !== "playing" || !["taboo", "free"].includes(presentationMode(ctx.state.session))) return;
    const card = cards.find((c) => c.id === ctx.state.session.current);
    if (!card) return;
    const matches = findSpeechMatches(text, { ...card, taboo: visibleTaboo(card, presentationSettings(ctx.state.session)) });
    feedback(
      matches.taboo.length
        ? `Gehört: „${matches.taboo.join(", ")}“. Prüft selbst, wer das gesagt hat; wertet mit den Spieltasten.`
        : matches.guessed
          ? "Lösungswort gehört! Bestätigt den Treffer mit „Erraten“."
          : `Gehört: „${text.slice(0, 120)}“`,
    );
  },
  (status) => {
    speechView.status = status;
    feedback(status);
  },
);

const wanted = () =>
  ctx.view === "game" &&
  ctx.state.session?.phase === "playing" &&
  ["taboo", "free"].includes(presentationMode(ctx.state.session)) &&
  ctx.state.session.settings.speech;

let speechStarting = false;
async function syncSpeech() {
  if (!wanted() || document.hidden) {
    speech.stop();
    return;
  }
  if (speech.running || speechStarting) return;
  speechStarting = true;
  try {
    await speech.start();
    if (!wanted()) speech.stop();
  } catch (error) {
    speechView.status = error.message;
    feedback(speechView.status);
  } finally {
    speechStarting = false;
  }
}
on("render", syncSpeech);
document.addEventListener("visibilitychange", () => {
  if (document.hidden) speech.stop();
});

async function speechSettings() {
  if (ctx.state.session?.phase === "playing") await change((s) => pause(s));
  const status = await LocalSpeech.availability();
  const active = ctx.state.session?.settings.speech ?? ctx.state.settings.speech;
  dialog(
    "Zuhören, wenn ihr möchtet.",
    `<p>Die lokale Spracherkennung verarbeitet Sprache auf eurem Gerät. Sie ist experimentell und braucht einen passenden Browser mit deutschem Sprachpaket. Es gibt keinen automatischen Wechsel zu einem Cloud-Dienst.</p><p>Sie gibt Hinweise auf gehörte Wörter. Wer gesprochen hat, kann sie nicht unterscheiden. Die Wertung bleibt deshalb bei euch und den Spieltasten.</p><div class="speech-availability"><strong>${status === "available" ? "Auf diesem Gerät verfügbar." : status === "downloadable" || status === "downloading" ? "Ein deutsches Sprachpaket wird benötigt." : "Auf diesem Gerät derzeit nicht verfügbar."}</strong><p>${status === "available" ? "Du kannst das Mikrofon für eure Runden aktivieren." : status === "downloadable" || status === "downloading" ? "Das einmalige Laden benötigt eine Internetverbindung und Speicherplatz." : "Ihr könnt mit allen Spieltasten weiterspielen."}</p></div><p class="fine-print">Cloud-Transkription mit Passwort und Kostenbegrenzung folgt als separate Erweiterung. In dieser Version entstehen keine Cloud-Transkriptionskosten.</p>`,
    `${active ? action("speech-off", "Zuhören ausschalten") : status === "available" ? action("speech-on", "Lokal zuhören aktivieren", "button primary") : ["downloadable", "downloading"].includes(status) ? action("speech-install", "Sprachpaket laden", "button primary") : ""}${action("close-dialog", "Schließen")}`,
  );
}

registerAction("speech-settings", speechSettings);
registerAction("toggle-speech", speechSettings);

for (const id of ["speech-on", "speech-off"])
  registerAction(id, async () => {
    await change((s) => {
      s.settings.speech = id === "speech-on";
      if (s.session) s.session.settings.speech = id === "speech-on";
    });
    toast(
      id === "speech-on"
        ? "Lokales Mikrofon ist aktiviert und hört während der Runde zu."
        : "Mikrofon ausgeschaltet.",
    );
  });

registerAction("speech-install", async (id, button) => {
  button.disabled = true;
  button.textContent = "Sprachpaket wird geladen …";
  try {
    toast(
      (await LocalSpeech.install())
        ? "Sprachpaket bereit."
        : "Das Sprachpaket konnte nicht geladen werden.",
    );
  } catch {
    toast("Das Sprachpaket konnte nicht geladen werden.");
  }
  await speechSettings();
});
