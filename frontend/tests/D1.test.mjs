import test from "node:test";
import assert from "node:assert/strict";
import { SOUNDS, soundNotes, createSoundEngine, installSoundEvents, play } from "../src/sound.js";

class FakeParam {
  calls = [];
  setValueAtTime(...args) { this.calls.push(["set", ...args]); }
  linearRampToValueAtTime(...args) { this.calls.push(["linear", ...args]); }
  exponentialRampToValueAtTime(...args) { this.calls.push(["exponential", ...args]); }
}
class FakeNode {
  connections = [];
  disconnects = 0;
  connect(node) { this.connections.push(node); }
  disconnect() { this.disconnects++; }
}
class FakeOscillator extends FakeNode {
  frequency = new FakeParam();
  starts = [];
  stops = [];
  start(time) { this.starts.push(time); }
  stop(time) { this.stops.push(time); }
}
class FakeAudioContext {
  currentTime = 20;
  state = "suspended";
  destination = {};
  oscillators = [];
  gains = [];
  resumes = 0;
  resume() { this.resumes++; this.state = "running"; return Promise.resolve(); }
  createOscillator() {
    const node = new FakeOscillator();
    this.oscillators.push(node);
    return node;
  }
  createGain() {
    const node = new FakeNode();
    node.gain = new FakeParam();
    this.gains.push(node);
    return node;
  }
}
function fixture(settings = {}) {
  const audio = new FakeAudioContext();
  let creations = 0;
  const engine = createSoundEngine({ getSettings: () => settings, createContext: () => { creations++; return audio; } });
  return { audio, engine, settings, creations: () => creations };
}
function eventFixture(initialPhase = "ready") {
  let session = initialPhase ? { phase: initialPhase } : null;
  const listeners = new Map(), played = [];
  let syncs = 0, stops = 0;
  const engine = { play: (...args) => played.push(args), sync: () => syncs++, stop: () => stops++ };
  const on = (name, fn) => {
    if (!listeners.has(name)) listeners.set(name, new Set());
    listeners.get(name).add(fn);
    return () => listeners.get(name).delete(fn);
  };
  const off = installSoundEvents({ engine, on, getSession: () => session });
  return {
    played, off, listeners,
    syncs: () => syncs, stops: () => stops,
    phase: (phase) => { session = phase ? { phase } : null; },
    emit: (name, detail = {}) => { for (const fn of listeners.get(name) || []) fn(detail); },
  };
}

test("offline sound mapping is immutable data with bounded notes for every cue", () => {
  assert.deepEqual(Object.keys(SOUNDS), ["correct", "skip", "taboo", "tick", "countdown", "turnEnd", "win", "click"]);
  assert.ok(Object.isFrozen(SOUNDS));
  for (const [kind, notes] of Object.entries(SOUNDS)) {
    assert.ok(Object.isFrozen(notes), kind);
    for (const tone of notes) {
      assert.ok(Object.isFrozen(tone));
      assert.ok(tone.frequency > 0 && tone.endFrequency > 0);
      assert.ok(tone.offset >= 0 && tone.duration > 0 && tone.duration < 1);
      assert.ok(tone.level > 0 && tone.level <= 0.2);
    }
  }
  assert.equal(SOUNDS.correct.length, 2);
  assert.equal(SOUNDS.win.length, 4);
});

test("end aliases, countdown go cue and rising timer pitch use pure mappings", () => {
  assert.equal(soundNotes("end"), SOUNDS.turnEnd);
  assert.equal(soundNotes("turn-end"), SOUNDS.turnEnd);
  assert.equal(soundNotes("countdown", { step: 0 }), SOUNDS.correct);
  assert.equal(soundNotes("countdown", { step: 3 }), SOUNDS.countdown);
  const pitches = Array.from({ length: 10 }, (_, i) => soundNotes("tick", { remaining: (10 - i) * 1000 })[0].frequency);
  assert.ok(pitches.every((pitch, i) => i === 0 || pitch > pitches[i - 1]));
  assert.equal(SOUNDS.tick[0].frequency, 600);
  assert.deepEqual(soundNotes("missing"), []);
  assert.deepEqual(soundNotes("toString"), []);
});

test("audio is lazy, unlocked by a gesture and shared across all cues", () => {
  const { engine, audio, creations } = fixture();
  assert.equal(engine.play("correct"), false);
  assert.equal(creations(), 0);
  engine.unlock();
  engine.unlock();
  assert.equal(creations(), 1);
  assert.equal(audio.resumes, 1);
  for (const kind of Object.keys(SOUNDS)) assert.equal(engine.play(kind), true, kind);
  assert.equal(creations(), 1);
  assert.equal(audio.oscillators.length, Object.values(SOUNDS).reduce((n, notes) => n + notes.length, 0));
});

test("synthesis schedules envelopes, frequency sweep, connections and node cleanup", () => {
  const { engine, audio } = fixture();
  engine.unlock();
  engine.play("skip");
  const oscillator = audio.oscillators[0], gain = audio.gains[0], tone = SOUNDS.skip[0];
  assert.equal(oscillator.type, "triangle");
  assert.deepEqual(oscillator.frequency.calls, [["set", 620, 20], ["exponential", 220, 20.16]]);
  assert.deepEqual(gain.gain.calls, [["set", 0.0001, 20], ["linear", tone.level * 0.8, 20.005], ["exponential", 0.0001, 20.16]]);
  assert.deepEqual(oscillator.connections, [gain]);
  assert.deepEqual(gain.connections, [audio.destination]);
  assert.deepEqual(oscillator.starts, [20]);
  assert.deepEqual(oscillator.stops, [20.17]);
  oscillator.onended();
  assert.equal(oscillator.disconnects, 1);
  assert.equal(gain.disconnects, 1);
  engine.stop();
  assert.equal(oscillator.stops.length, 1, "finished nodes are removed from active set");
});

test("volume defaults to 0.8, clamps bounds and mute/tick switches suppress cues", () => {
  const { engine, audio, settings } = fixture();
  engine.unlock();
  for (const [volume, expected] of [[undefined, 0.8], [NaN, 0.8], [0.25, 0.25], [3, 1]]) {
    settings.volume = volume;
    engine.play("click");
    assert.equal(audio.gains.at(-1).gain.calls[1][1], SOUNDS.click[0].level * expected);
  }
  const count = audio.oscillators.length;
  settings.volume = 0;
  assert.equal(engine.play("correct"), false);
  settings.volume = -1;
  assert.equal(engine.play("correct"), false);
  settings.volume = 0.8;
  settings.sound = false;
  assert.equal(engine.play("correct"), false);
  settings.sound = true;
  settings.tick = false;
  assert.equal(engine.play("tick", { remaining: 1000 }), false);
  assert.equal(audio.oscillators.length, count);
  assert.equal(engine.play("turnEnd"), true);
});

test("muting on render stops active and future scheduled fanfare notes", () => {
  const { engine, audio, settings } = fixture();
  engine.unlock();
  engine.play("win");
  settings.sound = false;
  engine.sync();
  assert.ok(audio.oscillators.every((node) => node.stops.length === 2 && node.stops[1] === undefined));
  engine.sync();
  assert.ok(audio.oscillators.every((node) => node.stops.length === 2));
});

test("unsupported, blocked or broken audio never interrupts gameplay", async () => {
  for (const createContext of [() => null, () => { throw new Error("unavailable"); }]) {
    const engine = createSoundEngine({ createContext });
    assert.doesNotThrow(() => engine.unlock());
    assert.equal(engine.play("correct"), false);
  }
  const audio = new FakeAudioContext();
  audio.resume = () => Promise.reject(new Error("gesture denied"));
  const engine = createSoundEngine({ createContext: () => audio });
  engine.unlock();
  await Promise.resolve();
  assert.equal(engine.play("correct"), false, "suspended audio must not queue stale sounds");
  audio.state = "running";
  audio.createOscillator = () => { throw new Error("audio failed"); };
  assert.equal(engine.play("correct"), false);
  assert.equal(play("correct"), false, "Node import does not initialize browser runtime");
});

test("event bridge maps results, every turn-end reason, start, countdown and click", () => {
  const f = eventFixture();
  for (const result of ["correct", "skip", "taboo"]) f.emit("result", { result });
  for (const reason of ["timer", "manual", "exhausted"]) f.emit("turn-end", { reason });
  f.emit("turn-start");
  f.emit("countdown", { step: 3 });
  f.emit("countdown", { step: 0 });
  f.emit("click");
  assert.deepEqual(f.played.map(([kind]) => kind), ["correct", "skip", "taboo", "turnEnd", "turnEnd", "turnEnd", "click", "countdown", "countdown", "click"]);
  assert.deepEqual(f.played[7][1], { step: 3 });
});

test("timer sounds at most once per remaining second in the last ten seconds of play", () => {
  const f = eventFixture("playing");
  for (const remaining of [60000, 10001, 10000, 9999, 9500, 9001, 9000, 8500, 1000, 999, 0, -1, NaN])
    f.emit("tick", { remaining });
  assert.deepEqual(f.played.map(([, detail]) => detail.remaining), [10000, 9000, 1000]);
  f.phase("paused");
  f.emit("tick", { remaining: 8000 });
  f.phase("playing");
  f.emit("tick", { remaining: 9000 });
  assert.equal(f.played.length, 3, "pause/resume does not replay the same second");
  f.emit("turn-start");
  f.emit("tick", { remaining: 10000 });
  assert.equal(f.played.at(-1)[0], "tick", "new turn resets throttling");
});

test("win plays once on a finished transition, never on reload or rerender", () => {
  const f = eventFixture("finished");
  f.emit("render");
  f.emit("render");
  assert.deepEqual(f.played, []);
  f.phase(null);
  f.emit("render");
  f.phase("ready");
  f.emit("render");
  f.phase("playing");
  f.emit("render");
  f.phase("summary");
  f.emit("render");
  f.phase("finished");
  f.emit("render");
  f.emit("render");
  assert.deepEqual(f.played, [["win"]]);
  assert.equal(f.syncs(), 8);
  f.off();
  assert.equal(f.stops(), 1);
  assert.ok([...f.listeners.values()].every((listeners) => listeners.size === 0));
  f.emit("result", { result: "correct" });
  assert.deepEqual(f.played, [["win"]]);
});
