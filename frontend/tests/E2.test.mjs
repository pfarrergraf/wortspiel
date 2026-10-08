import test from "node:test";
import assert from "node:assert/strict";
import { createWakeLockController } from "../src/wakelock.js";

const settle = () => new Promise((resolve) => setImmediate(resolve));
const deferred = () => {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};

class Sentinel extends EventTarget {
  released = false;
  releases = 0;
  async release() {
    this.releases++;
    this.systemRelease();
  }
  systemRelease() {
    this.released = true;
    this.dispatchEvent(new Event("release"));
  }
}

function harness({ phase = "ready", visible = true, request } = {}) {
  const page = new EventTarget();
  page.visibilityState = visible ? "visible" : "hidden";
  const requests = [];
  let renderListener;
  const session = { phase, current: "de:apfel", deadline: 61000, scores: [0, 0] };
  const controller = createWakeLockController({
    document: page,
    getPhase: () => session.phase,
    wakeLock: {
      request(type) {
        assert.equal(type, "screen");
        const lock = new Sentinel();
        requests.push(lock);
        return request ? request(lock) : Promise.resolve(lock);
      },
    },
    subscribeRender(fn) { renderListener = fn; return () => { renderListener = null; }; },
  });
  return {
    controller, requests, session,
    render() { renderListener?.(); },
    phase(value) { session.phase = value; renderListener?.(); },
    visibility(value) { page.visibilityState = value; page.dispatchEvent(new Event("visibilitychange")); },
  };
}

test("wake lock is acquired only while playing and visible, and kept across renders", async () => {
  const h = harness();
  for (const phase of ["ready", "paused", "summary", "finished", undefined]) h.phase(phase);
  assert.equal(h.requests.length, 0);
  h.phase("playing");
  h.render();
  h.render();
  await settle();
  h.render();
  assert.equal(h.requests.length, 1);
  const before = structuredClone(h.session);
  h.visibility("hidden");
  await settle();
  assert.equal(h.requests[0].releases, 1);
  assert.deepEqual(h.session, before);
  h.visibility("visible");
  await settle();
  assert.equal(h.requests.length, 2);
  h.controller.dispose();
});

test("pause, turn end and removed sessions each release the lock", async () => {
  for (const phase of ["paused", "summary", "finished", "ready", undefined]) {
    const h = harness({ phase: "playing" });
    await settle();
    h.phase(phase);
    h.render();
    await settle();
    assert.equal(h.requests[0].releases, 1);
    assert.equal(h.requests.length, 1);
    h.controller.dispose();
  }
});

test("returning to a visible paused game never resumes or acquires", async () => {
  const h = harness({ phase: "playing" });
  await settle();
  h.visibility("hidden");
  h.phase("paused");
  h.visibility("visible");
  await settle();
  assert.equal(h.requests.length, 1);
  assert.equal(h.session.phase, "paused");
  assert.equal(h.session.deadline, 61000);
  h.phase("playing");
  await settle();
  assert.equal(h.requests.length, 2);
  h.controller.dispose();
});

test("a game opened in a hidden document waits for visibility", async () => {
  const h = harness({ phase: "playing", visible: false });
  h.render();
  await settle();
  assert.equal(h.requests.length, 0);
  h.visibility("visible");
  await settle();
  assert.equal(h.requests.length, 1);
  h.controller.dispose();
});

test("late acquisition after pause is released without a second request", async () => {
  const request = deferred();
  const h = harness({ phase: "playing", request: () => request.promise });
  h.render();
  h.phase("paused");
  request.resolve(h.requests[0]);
  await settle();
  assert.equal(h.requests.length, 1);
  assert.equal(h.requests[0].releases, 1);
  h.controller.dispose();
});

test("rapid hide/show invalidates a pending request and reacquires after releasing it", async () => {
  const first = deferred();
  let calls = 0;
  const h = harness({ phase: "playing", request: (lock) => ++calls === 1 ? first.promise : Promise.resolve(lock) });
  h.visibility("hidden");
  h.visibility("visible");
  h.render();
  assert.equal(h.requests.length, 1);
  first.resolve(h.requests[0]);
  await settle();
  assert.equal(h.requests[0].releases, 1);
  assert.equal(h.requests.length, 2);
  assert.equal(h.requests[1].released, false);
  h.controller.dispose();
});

test("resuming while release is pending waits for that release", async () => {
  const h = harness({ phase: "playing" });
  await settle();
  const release = deferred();
  h.requests[0].release = () => { h.requests[0].releases++; return release.promise; };
  h.phase("paused");
  h.phase("playing");
  h.render();
  assert.equal(h.requests.length, 1);
  h.requests[0].systemRelease();
  release.resolve();
  await settle();
  assert.equal(h.requests.length, 2);
  h.controller.dispose();
});

test("system release clears the sentinel and a later render can reacquire", async () => {
  const h = harness({ phase: "playing" });
  await settle();
  h.requests[0].systemRelease();
  await settle();
  assert.equal(h.requests.length, 1);
  h.render();
  await settle();
  assert.equal(h.requests.length, 2);
  h.controller.dispose();
});

test("request denial is silent and retries only after a new activation", async () => {
  const h = harness({ phase: "playing", request: () => Promise.reject(new Error("Denied")) });
  await settle();
  for (let i = 0; i < 10; i++) h.render();
  await settle();
  assert.equal(h.requests.length, 1);
  h.visibility("hidden");
  h.visibility("visible");
  await settle();
  assert.equal(h.requests.length, 2);
  h.controller.dispose();
});

test("synchronous request errors and release rejections never break the game", async () => {
  const throwing = harness({ phase: "playing", request() { throw new Error("Unavailable"); } });
  await settle();
  throwing.render();
  assert.equal(throwing.requests.length, 1);
  throwing.controller.dispose();
  const h = harness({ phase: "playing" });
  await settle();
  h.requests[0].release = () => Promise.reject(new Error("Release denied"));
  h.phase("paused");
  await settle();
  assert.equal(h.session.phase, "paused");
  h.phase("playing");
  await settle();
  assert.equal(h.requests.length, 2);
  h.controller.dispose();
});

test("unsupported wake lock stays silent, including documents absent in Node", () => {
  const page = new EventTarget();
  page.visibilityState = "visible";
  for (const wakeLock of [undefined, null, {}, { request: null }]) {
    for (const document of [undefined, page]) {
      const controller = createWakeLockController({ getPhase: () => "playing", document, wakeLock, subscribeRender: () => {} });
      assert.doesNotThrow(() => controller.sync());
      controller.dispose();
    }
  }
});

test("an old rejection after hide/show cannot suppress the new request", async () => {
  const first = deferred();
  let calls = 0;
  const h = harness({ phase: "playing", request: (lock) => ++calls === 1 ? first.promise : Promise.resolve(lock) });
  h.visibility("hidden");
  h.visibility("visible");
  first.reject(new Error("Document was hidden"));
  await settle();
  assert.equal(h.requests.length, 2);
  assert.equal(h.requests[1].released, false);
  h.controller.dispose();
});

test("a sentinel already released on arrival does not cause a retry loop", async () => {
  const h = harness({ phase: "playing", request(lock) { lock.systemRelease(); return Promise.resolve(lock); } });
  await settle();
  h.render();
  h.render();
  await settle();
  assert.equal(h.requests.length, 1);
  h.controller.dispose();
});

test("late release events from an old sentinel cannot clear a newer lock", async () => {
  const h = harness({ phase: "playing" });
  await settle();
  // Simulate a release promise settling before the browser's release event.
  const old = h.requests[0];
  old.release = async () => { old.releases++; old.released = true; };
  h.phase("paused");
  await settle();
  h.phase("playing");
  await settle();
  assert.equal(h.requests.length, 2);
  old.dispatchEvent(new Event("release"));
  h.render();
  await settle();
  assert.equal(h.requests.length, 2);
  assert.equal(h.requests[1].released, false);
  h.controller.dispose();
});

test("dispose removes subscriptions and releases pending or held locks exactly once", async () => {
  const h = harness({ phase: "playing" });
  await settle();
  h.controller.dispose();
  h.controller.dispose();
  h.visibility("hidden");
  h.visibility("visible");
  h.render();
  await settle();
  assert.equal(h.requests.length, 1);
  assert.equal(h.requests[0].releases, 1);
  const request = deferred();
  const late = harness({ phase: "playing", request: () => request.promise });
  late.controller.dispose();
  request.resolve(late.requests[0]);
  await settle();
  assert.equal(late.requests[0].releases, 1);
  assert.equal(late.requests.length, 1);
});
