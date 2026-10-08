import { on } from "./events.js";

// The injected dependencies keep lifecycle and request races testable without
// loading the DOM-based app. Nothing here changes a session or resumes a turn.
export function createWakeLockController({
  getPhase,
  document: page = globalThis.document,
  wakeLock = globalThis.navigator?.wakeLock,
  subscribeRender = (listener) => on("render", listener),
}) {
  let sentinel = null;
  let pending = false;
  let releasing = false;
  let disposed = false;
  let wanted = false;
  let generation = 0;
  let deniedGeneration = -1;
  const desired = () => !disposed && page?.visibilityState === "visible" && getPhase() === "playing";

  async function release(lock) {
    if (lock.released) return;
    try {
      await lock.release();
    } catch {
      // Browser or system policy may deny either acquisition or release.
    }
  }

  async function releaseHeld() {
    const held = sentinel;
    sentinel = null;
    releasing = true;
    await release(held);
    releasing = false;
    sync();
  }

  async function acquire(requestGeneration) {
    try {
      const lock = await wakeLock.request("screen");
      if (requestGeneration !== generation || !desired()) {
        // A pause/hidden transition invalidates even a request that resolves
        // after a later resume. Release it before requesting a fresh lock.
        await release(lock);
      } else if (lock.released) {
        deniedGeneration = generation;
      } else {
        sentinel = lock;
        lock.addEventListener("release", () => {
          if (sentinel === lock) sentinel = null;
          // Retry on a later render or visibility transition, never in a
          // loop if the system keeps releasing the lock (e.g. low battery).
        }, { once: true });
      }
    } catch {
      if (requestGeneration === generation) deniedGeneration = generation;
    } finally {
      pending = false;
      if (requestGeneration !== generation) sync();
    }
  }

  function sync() {
    const next = desired();
    if (next !== wanted) {
      wanted = next;
      generation++;
    }
    if (!wanted) {
      if (sentinel) void releaseHeld();
      return;
    }
    if (sentinel?.released) sentinel = null;
    if (sentinel || pending || releasing || deniedGeneration === generation || typeof wakeLock?.request !== "function") return;
    pending = true;
    void acquire(generation);
  }

  const unsubscribe = subscribeRender(sync);
  page?.addEventListener("visibilitychange", sync);
  sync();

  return {
    sync,
    dispose() {
      if (disposed) return;
      disposed = true;
      unsubscribe?.();
      page?.removeEventListener("visibilitychange", sync);
      sync();
    },
  };
}

// main.js only needs to import this module. Defer the app import so Node tests
// can use the controller without importing UI/data modules or browser globals.
if (typeof window !== "undefined" && typeof document !== "undefined") {
  void import("./app.js").then(({ ctx }) => {
    createWakeLockController({ getPhase: () => ctx.state?.session?.phase });
  });
}
