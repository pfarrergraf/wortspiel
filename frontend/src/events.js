// Tiny event bus so features (sound, haptics, wake lock, …) can react to the
// game without editing app.js. Events:
//   render      { view }            after every full render
//   result      { result }          after a scored card was saved
//   turn-start  {}                  after a turn started and its first card is reserved
//   turn-end    { reason }          "timer" | "manual" | "exhausted"
//   pause / resume {}
//   tick        { remaining }       every 150 ms while a turn is running
const listeners = new Map();

export function on(event, fn) {
  if (!listeners.has(event)) listeners.set(event, new Set());
  listeners.get(event).add(fn);
  return () => listeners.get(event).delete(fn);
}

export function emit(event, detail = {}) {
  for (const fn of listeners.get(event) || []) {
    try {
      fn(detail);
    } catch (error) {
      console.error(error);
    }
  }
}
