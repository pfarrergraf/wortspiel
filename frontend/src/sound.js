// Synthesised sound signals. D1 replaces this with the full sound engine;
// keep reacting to game events instead of being called from other modules.
import { ctx, change } from "./app.js";
import { registerAction } from "./actions.js";
import { on } from "./events.js";

const enabled = () =>
  ctx.state.session?.settings.sound ?? ctx.state.settings.sound;

let audio;
export function play(kind) {
  if (!enabled()) return;
  try {
    audio ||= new (window.AudioContext || window.webkitAudioContext)();
    audio.resume();
    const oscillator = audio.createOscillator(),
      gain = audio.createGain();
    oscillator.connect(gain);
    gain.connect(audio.destination);
    oscillator.frequency.setValueAtTime(
      kind === "correct"
        ? 660
        : kind === "taboo"
          ? 180
          : kind === "end"
            ? 440
            : 340,
      audio.currentTime,
    );
    if (kind === "correct")
      oscillator.frequency.exponentialRampToValueAtTime(
        990,
        audio.currentTime + 0.12,
      );
    gain.gain.setValueAtTime(0.08, audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.22);
    oscillator.start();
    oscillator.stop(audio.currentTime + 0.24);
  } catch {
    /* Sounds never block play. */
  }
}

on("result", ({ result }) => play(result));
on("turn-end", ({ reason }) => {
  if (reason === "timer") play("end");
});

registerAction("toggle-sound", () =>
  change((s) => {
    s.session.settings.sound = !s.session.settings.sound;
    s.settings.sound = s.session.settings.sound;
  }),
);
