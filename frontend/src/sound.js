// Offline signals: notes are data so themes and tests can reuse the same player.
const note = (frequency, duration, offset = 0, type = "sine", level = 0.12, endFrequency = frequency) =>
  Object.freeze({ frequency, endFrequency, duration, offset, type, level });

export const SOUNDS = Object.freeze({
  correct: Object.freeze([note(660, 0.13), note(990, 0.2, 0.1)]),
  skip: Object.freeze([note(620, 0.16, 0, "triangle", 0.1, 220)]),
  taboo: Object.freeze([note(130, 0.24, 0, "sawtooth", 0.08, 90)]),
  tick: Object.freeze([note(600, 0.055, 0, "sine", 0.06)]),
  countdown: Object.freeze([note(440, 0.12, 0, "triangle", 0.1)]),
  turnEnd: Object.freeze([note(440, 0.65, 0, "sine", 0.14), note(660, 0.5, 0, "sine", 0.05)]),
  win: Object.freeze([note(523, 0.16), note(659, 0.16, 0.16), note(784, 0.16, 0.32), note(1047, 0.42, 0.48)]),
  click: Object.freeze([note(800, 0.045, 0, "triangle", 0.05)]),
});

const aliases = { end: "turnEnd", "turn-end": "turnEnd" };
const volumeOf = (settings) => Number.isFinite(settings.volume)
  ? Math.max(0, Math.min(1, settings.volume)) : 0.8;

export function soundNotes(kind, detail = {}) {
  kind = Object.hasOwn(aliases, kind) ? aliases[kind] : kind;
  if (kind === "tick") {
    const seconds = Math.ceil(detail.remaining / 1000);
    const frequency = 600 + (10 - Math.max(1, Math.min(10, seconds || 10))) * 45;
    return [{ ...SOUNDS.tick[0], frequency, endFrequency: frequency }];
  }
  if (kind === "countdown" && detail.step === 0) return SOUNDS.correct;
  return Object.hasOwn(SOUNDS, kind) ? SOUNDS[kind] : [];
}

export function createSoundEngine({
  getSettings = () => ({}),
  createContext = () => {
    const Audio = globalThis.AudioContext || globalThis.webkitAudioContext;
    return Audio ? new Audio() : null;
  },
} = {}) {
  let audio = null, unlocked = false;
  const active = new Set();

  function context() {
    try {
      audio ||= createContext();
      return audio;
    } catch { return null; }
  }

  function stop() {
    for (const oscillator of active) {
      try { oscillator.stop(); } catch { /* Already ended. */ }
    }
    active.clear();
  }

  // Must run synchronously inside a real pointer/keyboard gesture (iOS).
  function unlock() {
    unlocked = true;
    const target = context();
    if (!target || target.state !== "suspended") return;
    try { Promise.resolve(target.resume()).catch(() => {}); } catch { /* Unsupported or blocked. */ }
  }

  function play(kind, detail = {}) {
    const settings = getSettings() || {};
    if (!unlocked || settings.sound === false || !volumeOf(settings)) return false;
    if (kind === "tick" && settings.tick === false) return false;
    const notes = soundNotes(kind, detail);
    if (!notes.length) return false;
    const target = context();
    if (!target || target.state === "suspended" || target.state === "closed") return false;
    try {
      for (const tone of notes) {
        const oscillator = target.createOscillator(), gain = target.createGain();
        const start = target.currentTime + tone.offset, end = start + tone.duration;
        oscillator.type = tone.type;
        oscillator.frequency.setValueAtTime(tone.frequency, start);
        if (tone.endFrequency !== tone.frequency)
          oscillator.frequency.exponentialRampToValueAtTime(tone.endFrequency, end);
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.linearRampToValueAtTime(tone.level * volumeOf(settings), start + 0.005);
        gain.gain.exponentialRampToValueAtTime(0.0001, end);
        oscillator.connect(gain);
        gain.connect(target.destination);
        oscillator.onended = () => {
          active.delete(oscillator);
          oscillator.disconnect();
          gain.disconnect();
        };
        active.add(oscillator);
        oscillator.start(start);
        oscillator.stop(end + 0.01);
      }
      return true;
    } catch {
      stop();
      return false;
    }
  }

  return { play, unlock, stop, sync() {
    const settings = getSettings() || {};
    if (settings.sound === false || !volumeOf(settings)) stop();
  } };
}

export function installSoundEvents({ engine, on, getSession }) {
  let previousPhase = null;
  const ticked = new Set();
  const unsubscribers = [
    on("render", () => {
      engine.sync();
      const phase = getSession()?.phase ?? null;
      // Initial load of a saved finished game must remain quiet.
      if (phase === "finished" && previousPhase && previousPhase !== "finished")
        engine.play("win");
      previousPhase = phase;
      if (!phase || phase === "ready") ticked.clear();
    }),
    on("result", ({ result }) => engine.play(result)),
    on("turn-start", () => { ticked.clear(); engine.play("click"); }),
    on("turn-end", () => engine.play("turnEnd")),
    on("tick", ({ remaining }) => {
      if (getSession()?.phase !== "playing" || !Number.isFinite(remaining) || remaining <= 0 || remaining > 10000)
        return;
      const second = Math.ceil(remaining / 1000);
      if (ticked.has(second)) return;
      ticked.add(second);
      engine.play("tick", { remaining });
    }),
    // E1 supplies step 3, 2, 1, 0 only when its countdown is actually visible.
    on("countdown", (detail) => engine.play("countdown", detail)),
    on("click", () => engine.play("click")),
  ];
  return () => { unsubscribers.forEach((off) => off()); engine.stop(); };
}

let browserEngine;
export const play = (kind, detail) => browserEngine?.play(kind, detail) ?? false;

// Keep pure exports importable in Node without loading DOM views or JSON data.
if (typeof window !== "undefined" && typeof document !== "undefined") {
  Promise.all([import("./app.js"), import("./actions.js"), import("./events.js")])
    .then(([{ ctx, change }, { registerAction }, { on }]) => {
      browserEngine = createSoundEngine({
        getSettings: () => ctx.state?.session?.settings ?? ctx.state?.settings ?? { sound: false },
      });
      installSoundEvents({ engine: browserEngine, on, getSession: () => ctx.state?.session });
      document.addEventListener("pointerdown", browserEngine.unlock, { capture: true });
      document.addEventListener("keydown", browserEngine.unlock, { capture: true });
      registerAction("toggle-sound", () => change((state) => {
        const settings = state.session?.settings ?? state.settings;
        settings.sound = !settings.sound;
        state.settings.sound = settings.sound;
      }));
    });
}
