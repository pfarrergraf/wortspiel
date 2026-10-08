// Direct connection to Logitech presenters (e.g. Spotlight) via WebHID and
// HID++ 2.0. Their pointer button sends no key or mouse event; with feature
// 0x1B04 (REPROG_CONTROLS_V4) a control can be "diverted" so the device
// reports its presses to us instead. Diversion is temporary: it ends when the
// device reconnects or sleeps, so it is re-applied on every (re)connect.
// Chrome/Edge only, experimental, device-local. Pure logic is exported for tests.

export const LOGITECH = 0x046d;
const LONG = 0x11;
const SHORT = 0x10;
const SW_ID = 0x0b;
const REPROG = 0x1b04;
const INDICES = [0xff, 1, 2, 3, 4, 5, 6];

export function cidsFromEvent(params) {
  const cids = [];
  for (let i = 0; i + 1 < 8; i += 2) {
    const cid = (params[i] << 8) | params[i + 1];
    if (cid) cids.push(cid);
  }
  return cids;
}

export const hexCid = (cid) => `0x${cid.toString(16).toUpperCase().padStart(4, "0")}`;

export class HidppPresenter {
  constructor(device, { onPress = () => {}, onLog = () => {}, timeout = 1000 } = {}) {
    this.device = device;
    this.onPress = onPress;
    this.onLog = onLog;
    this.timeout = timeout;
    this.pending = [];
    this.pressed = new Set();
    this.diverted = new Set();
    this.index = null;
    this.feature = null;
    this.controls = [];
    this.listener = (event) => this.receive(event);
    device.addEventListener("inputreport", this.listener);
  }

  async request(index, feature, fn, params = []) {
    const data = new Uint8Array(19);
    data[0] = index;
    data[1] = feature;
    data[2] = (fn << 4) | SW_ID;
    data.set(params.slice(0, 16), 3);
    const reply = new Promise((resolve, reject) => {
      const entry = { index, feature, fn, resolve, reject };
      entry.timer = setTimeout(() => {
        this.pending = this.pending.filter((p) => p !== entry);
        reject(new Error("Keine Antwort vom Gerät."));
      }, this.timeout);
      this.pending.push(entry);
    });
    await this.device.sendReport(LONG, data);
    return reply;
  }

  receive(event) {
    if (event.reportId !== LONG && event.reportId !== SHORT) return;
    const d = new Uint8Array(event.data.buffer, event.data.byteOffset, event.data.byteLength);
    const [index, feature, fnsw] = d;
    const settle = (match, ok, value) => {
      const entry = this.pending.find(match);
      if (!entry) return false;
      clearTimeout(entry.timer);
      this.pending = this.pending.filter((p) => p !== entry);
      ok ? entry.resolve(value) : entry.reject(new Error(`HID++-Fehler ${value}`));
      return true;
    };
    // HID++ 2.0 error (0xFF) or HID++ 1.0 error (0x8F) for one of our requests.
    if (feature === 0xff || feature === 0x8f) {
      settle((p) => p.index === index && p.feature === d[2], false, d[4] ?? d[3]);
      return;
    }
    if ((fnsw & 0x0f) === SW_ID) {
      settle((p) => p.index === index && p.feature === feature && p.fn === fnsw >> 4, true, d.slice(3));
      return;
    }
    // HID++ 1.0 "device connection" notification from a receiver: re-divert.
    if (event.reportId === SHORT && feature === 0x41) {
      this.onLog("Presenter neu verbunden.");
      setTimeout(() => this.reapply().catch(() => {}), 500);
      return;
    }
    if (index === this.index && feature === this.feature && fnsw >> 4 === 0) {
      const now = new Set(cidsFromEvent(d.slice(3)));
      for (const cid of now) if (!this.pressed.has(cid)) this.onPress(cid);
      this.pressed = now;
    }
  }

  // Finds the device index and the 0x1B04 feature, then lists the controls.
  async setup() {
    for (const index of INDICES) {
      try {
        const reply = await this.request(index, 0x00, 0, [REPROG >> 8, REPROG & 0xff]);
        if (reply[0]) {
          this.index = index;
          this.feature = reply[0];
          break;
        }
      } catch {
        /* Try the next device slot. */
      }
    }
    if (this.feature == null)
      throw new Error("Der Presenter unterstützt keine umleitbaren Tasten (HID++ 0x1B04).");
    const [count] = await this.request(this.index, this.feature, 0);
    this.controls = [];
    for (let i = 0; i < count; i++) {
      const r = await this.request(this.index, this.feature, 1, [i]);
      const flags = r[4];
      this.controls.push({ cid: (r[0] << 8) | r[1], divertable: Boolean(flags & 0x20) });
    }
    return this.controls;
  }

  async divert(cid, on) {
    // Flags: bit0 divert, bit1 "divert valid".
    await this.request(this.index, this.feature, 3, [cid >> 8, cid & 0xff, on ? 0x03 : 0x02, 0, 0]);
    on ? this.diverted.add(cid) : this.diverted.delete(cid);
  }

  async divertOnly(cids) {
    const wanted = new Set(cids);
    for (const { cid, divertable } of this.controls) {
      if (!divertable) continue;
      if (wanted.has(cid) && !this.diverted.has(cid)) await this.divert(cid, true);
      else if (!wanted.has(cid) && this.diverted.has(cid)) await this.divert(cid, false);
    }
  }

  divertable() {
    return this.controls.filter((c) => c.divertable).map((c) => c.cid);
  }

  async reapply() {
    const cids = [...this.diverted];
    this.diverted.clear();
    for (const cid of cids) await this.divert(cid, true);
  }

  async release() {
    for (const cid of [...this.diverted]) await this.divert(cid, false).catch(() => {});
    this.device.removeEventListener("inputreport", this.listener);
  }
}

const isHidpp = (device) =>
  device.vendorId === LOGITECH &&
  device.collections.some(
    (c) => (c.usagePage & 0xff00) === 0xff00 && c.outputReports?.some((r) => r.reportId === LONG),
  );

// ---- Browser glue (skipped in Node tests) ----
export const hidSupported = () => typeof navigator !== "undefined" && "hid" in navigator;

let presenter = null;
const state = { status: "nicht verbunden", name: "" };
export const hidState = () => ({ ...state, connected: Boolean(presenter) });

async function open(device, { onPress, onLog }) {
  if (!device.opened) await device.open();
  const next = new HidppPresenter(device, { onPress, onLog });
  await next.setup();
  await presenter?.release();
  presenter = next;
  state.status = "verbunden";
  state.name = device.productName || "Logitech-Presenter";
  return next;
}

export async function connectHid(handlers, { ask = true } = {}) {
  if (!hidSupported()) throw new Error("Dieser Browser kann keine Geräte direkt verbinden. Nutze Chrome oder Edge.");
  const devices = ask
    ? await navigator.hid.requestDevice({
        filters: [
          { vendorId: LOGITECH, usagePage: 0xff00 },
          { vendorId: LOGITECH, usagePage: 0xff43 },
        ],
      })
    : await navigator.hid.getDevices();
  const candidates = devices.filter(isHidpp);
  if (!candidates.length) throw new Error("Kein passender Logitech-Presenter gefunden.");
  let lastError;
  for (const device of candidates) {
    try {
      return await open(device, handlers);
    } catch (error) {
      lastError = error;
    }
  }
  state.status = "Fehler";
  throw lastError;
}

export const currentHid = () => presenter;

if (hidSupported()) {
  window.addEventListener("pagehide", () => presenter?.release());
  navigator.hid.addEventListener("disconnect", (event) => {
    if (presenter?.device === event.device) {
      presenter = null;
      state.status = "getrennt";
    }
  });
}
