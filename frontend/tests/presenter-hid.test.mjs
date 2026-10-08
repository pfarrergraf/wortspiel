import test from "node:test";
import assert from "node:assert/strict";
import { HidppPresenter, cidsFromEvent } from "../src/presenter-hid.js";

// Simulates a Logitech presenter behind a receiver in slot 1 that speaks
// HID++ 2.0 with feature 0x1B04 at index 9 and three controls.
function fakeSpotlight() {
  const listeners = new Set();
  const controls = [
    { cid: 0x00d7, flags: 0x20 }, // next (divertable)
    { cid: 0x00da, flags: 0x20 }, // back (divertable)
    { cid: 0x00f0, flags: 0x20 }, // pointer (divertable)
    { cid: 0x0050, flags: 0x00 }, // not divertable
  ];
  const diverted = new Set();
  const emit = (reportId, bytes) => {
    const data = new DataView(Uint8Array.from(bytes).buffer);
    for (const fn of listeners) fn({ reportId, data });
  };
  return {
    diverted,
    addEventListener: (type, fn) => listeners.add(fn),
    removeEventListener: (type, fn) => listeners.delete(fn),
    press: (...cids) => emit(0x11, [1, 9, 0x00, ...cids.flatMap((c) => [c >> 8, c & 0xff]), ...Array(16).fill(0)].slice(0, 19)),
    reconnect: () => emit(0x10, [1, 0x41, 0x04, 0x00, 0x00, 0x00]),
    async sendReport(reportId, data) {
      const [index, feature, fnsw, ...p] = data;
      const fn = fnsw >> 4;
      const reply = (params) => queueMicrotask(() => emit(0x11, [index, feature, fnsw, ...params, ...Array(16).fill(0)].slice(0, 19)));
      if (index !== 1) return queueMicrotask(() => emit(0x10, [index, 0x8f, feature, fnsw, 0x08, 0]));
      if (feature === 0 && fn === 0) return reply([p[0] === 0x1b && p[1] === 0x04 ? 9 : 0]);
      if (feature === 9 && fn === 0) return reply([controls.length]);
      if (feature === 9 && fn === 1) {
        const c = controls[p[0]];
        return reply([c.cid >> 8, c.cid & 0xff, 0, 0, c.flags]);
      }
      if (feature === 9 && fn === 3) {
        const cid = (p[0] << 8) | p[1];
        if (p[2] & 0x02) (p[2] & 0x01 ? diverted.add(cid) : diverted.delete(cid));
        return reply(p.slice(0, 5));
      }
      return queueMicrotask(() => emit(0x11, [index, 0xff, feature, fnsw, 0x02]));
    },
  };
}

test("finds the presenter slot and the divertable controls", async () => {
  const device = fakeSpotlight();
  const hid = new HidppPresenter(device, { timeout: 50 });
  await hid.setup();
  assert.equal(hid.index, 1);
  assert.equal(hid.feature, 9);
  assert.deepEqual(hid.divertable(), [0x00d7, 0x00da, 0x00f0]);
});

test("learning diverts all, then only the learned button stays diverted and reports presses once", async () => {
  const device = fakeSpotlight();
  const presses = [];
  const hid = new HidppPresenter(device, { timeout: 50, onPress: (cid) => presses.push(cid) });
  await hid.setup();
  await hid.divertOnly(hid.divertable());
  assert.deepEqual([...device.diverted].sort(), [0x00d7, 0x00da, 0x00f0]);
  device.press(0x00f0);
  device.press(0x00f0); // held: same report again, no second press
  device.press(); // released
  assert.deepEqual(presses, [0x00f0]);
  await hid.divertOnly([0x00f0]);
  assert.deepEqual([...device.diverted], [0x00f0]);
  device.press(0x00f0);
  assert.deepEqual(presses, [0x00f0, 0x00f0]);
});

test("a reconnect notification re-applies the diversion; release restores the buttons", async () => {
  const device = fakeSpotlight();
  const hid = new HidppPresenter(device, { timeout: 50 });
  await hid.setup();
  await hid.divertOnly([0x00f0]);
  device.diverted.clear(); // the device forgot it while sleeping
  device.reconnect();
  await new Promise((resolve) => setTimeout(resolve, 600));
  assert.deepEqual([...device.diverted], [0x00f0]);
  await hid.release();
  assert.deepEqual([...device.diverted], []);
});

test("diverted-button events list up to four control ids", () => {
  assert.deepEqual(cidsFromEvent([0, 0xf0, 0, 0xd7, 0, 0, 0, 0]), [0xf0, 0xd7]);
  assert.deepEqual(cidsFromEvent([0, 0, 0, 0, 0, 0, 0, 0]), []);
});

// Signals as seen from a real Spotlight over Bluetooth (index 0xFF, feature 7):
// raw motion (function 1) while the pointer is held, then a release, but no
// press event with the control id.
function bluetoothSpotlight() {
  const listeners = new Set();
  const diverted = new Set();
  const emit = (bytes) => {
    const data = new DataView(Uint8Array.from([...bytes, ...Array(19).fill(0)].slice(0, 19)).buffer);
    for (const fn of listeners) fn({ reportId: 0x11, data });
  };
  return {
    diverted,
    addEventListener: (type, fn) => listeners.add(fn),
    removeEventListener: (type, fn) => listeners.delete(fn),
    motion: () => emit([0xff, 0x07, 0x10, 0xff, 0xff, 0xff, 0xfe]),
    release: () => emit([0xff, 0x07, 0x00]),
    press: (cid) => emit([0xff, 0x07, 0x00, cid >> 8, cid & 0xff]),
    async sendReport(reportId, data) {
      const [index, feature, fnsw, ...p] = data;
      const fn = fnsw >> 4;
      const reply = (params) => queueMicrotask(() => emit([index, feature, fnsw, ...params]));
      if (index !== 0xff) return queueMicrotask(() => emit([index, 0xff, feature, fnsw, 0x08]));
      if (feature === 0) return reply([7]);
      if (fn === 0) return reply([2]);
      // Next (no motion) and the pointer (additional flag raw XY).
      if (fn === 1) return reply(p[0] === 0 ? [0x00, 0xd7, 0, 0, 0x20, 0, 0, 0, 0x00] : [0x00, 0xf0, 0, 0, 0x20, 0, 0, 0, 0x01]);
      if (fn === 3) {
        const cid = (p[0] << 8) | p[1];
        p[2] & 1 ? diverted.add(cid) : diverted.delete(cid);
        return reply(p.slice(0, 5));
      }
    },
  };
}

test("a pointer click that sends only motion and release counts once per press", async () => {
  const device = bluetoothSpotlight();
  const presses = [];
  const hid = new HidppPresenter(device, { timeout: 50, onPress: (cid) => presses.push(cid) });
  await hid.setup();
  assert.equal(hid.index, 0xff);
  assert.equal(hid.feature, 7);
  await hid.divertOnly([0x00f0]);
  device.release(); // status report right after diverting: no click
  assert.deepEqual(presses, []);
  hid.quietUntil = 0;
  // Short click: some motion, then release.
  device.motion();
  device.motion();
  device.release();
  assert.deepEqual(presses, [0x00f0]);
  // Very short click: release only.
  device.release();
  assert.deepEqual(presses, [0x00f0, 0x00f0]);
  // Hold with a real press event, motion and release: still one press.
  device.press(0x00f0);
  device.motion();
  device.motion();
  device.release();
  assert.deepEqual(presses, [0x00f0, 0x00f0, 0x00f0]);
});

test("while learning with every control diverted, a motion-only click belongs to the raw XY control", async () => {
  const device = bluetoothSpotlight();
  const presses = [];
  const hid = new HidppPresenter(device, { timeout: 50, onPress: (cid) => presses.push(cid) });
  await hid.setup();
  await hid.divertOnly(hid.divertable());
  assert.deepEqual([...device.diverted].sort(), [0x00d7, 0x00f0]);
  hid.quietUntil = 0;
  device.motion();
  device.release();
  assert.deepEqual(presses, [0x00f0]);
});
