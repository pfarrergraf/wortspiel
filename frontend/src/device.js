// Input modality and orientation detection (plan-v2 C7).
//
// Sets data-input="touch|mouse|pen" and data-orientation="portrait|landscape"
// on <html> so that CSS can size targets by how the user is actually
// interacting, not only by viewport width (Surface tablet mode, iPad with a
// trackpad, touch laptops). Only feature and media queries are used, never
// the user agent.
//
// This module never calls render() and never touches game state: resizing,
// rotating or detaching a keyboard must keep the timer and current card.

// Mouse movement needs to cover this distance (px) before we switch to
// "mouse", so that a jittery trackpad or synthetic events after a tap do not
// flip the layout back and forth.
export const MOUSE_DISTANCE = 6;
// Ignore mouse movement this soon (ms) after a touch or pen contact. Browsers
// may emit compatibility mouse events right after a tap.
export const TOUCH_GRACE_MS = 500;

/** Map a PointerEvent.pointerType to an input modality (or null if unknown). */
export function inputFromPointerType(type) {
  if (type === "touch" || type === "pen" || type === "mouse") return type;
  return null;
}

/**
 * Initial modality from media queries. `coarse` is (any-pointer: coarse),
 * `fine` is (pointer: fine), i.e. whether the primary pointer is precise.
 * A touch laptop with a trackpad reports a fine primary pointer, so it starts
 * as "mouse"; a Surface in tablet mode reports no fine primary pointer.
 */
export function inputFromMedia({ coarse, fine }) {
  if (fine) return "mouse";
  if (coarse) return "touch";
  return "mouse";
}

export function orientationFromMedia(portrait) {
  return portrait ? "portrait" : "landscape";
}

/**
 * Pure reducer for pointer events. Returns the new modality or null when the
 * event should not change it. `memo` keeps the last mouse position and the
 * time of the last touch/pen contact between calls.
 */
export function nextInput(memo, event, now) {
  const type = inputFromPointerType(event.pointerType);
  if (!type) return null;
  if (type !== "mouse") {
    memo.contactAt = now;
    memo.mouse = null;
    return type;
  }
  if (event.type === "pointerdown") {
    if (now - (memo.contactAt ?? -Infinity) < TOUCH_GRACE_MS) return null;
    return "mouse";
  }
  if (now - (memo.contactAt ?? -Infinity) < TOUCH_GRACE_MS) return null;
  const last = memo.mouse;
  memo.mouse = { x: event.clientX, y: event.clientY };
  if (!last) return null;
  memo.distance = (memo.distance ?? 0) + Math.hypot(event.clientX - last.x, event.clientY - last.y);
  if (memo.distance < MOUSE_DISTANCE) return null;
  memo.distance = 0;
  return "mouse";
}

function watch(query, listener) {
  const list = window.matchMedia?.(query);
  if (!list) return null;
  if (list.addEventListener) list.addEventListener("change", listener);
  else list.addListener?.(listener);
  return list;
}

export function installDevice(root = document.documentElement) {
  const set = (name, value) => {
    if (value && root.dataset[name] !== value) root.dataset[name] = value;
  };
  const coarse = window.matchMedia?.("(any-pointer: coarse)");
  const fine = window.matchMedia?.("(pointer: fine)");
  const fromMedia = () =>
    set("input", inputFromMedia({ coarse: !!coarse?.matches, fine: !!fine?.matches }));
  fromMedia();
  // Surface keyboard detached/attached, external mouse plugged in.
  watch("(any-pointer: coarse)", fromMedia);
  watch("(pointer: fine)", fromMedia);

  const portrait = watch("(orientation: portrait)", (event) =>
    set("orientation", orientationFromMedia(event.matches)),
  );
  set("orientation", orientationFromMedia(portrait ? portrait.matches : innerHeight >= innerWidth));

  const memo = {};
  const onPointer = (event) => set("input", nextInput(memo, event, event.timeStamp || Date.now()));
  const options = { capture: true, passive: true };
  window.addEventListener("pointerdown", onPointer, options);
  window.addEventListener("pointermove", onPointer, options);
  return () => {
    window.removeEventListener("pointerdown", onPointer, options);
    window.removeEventListener("pointermove", onPointer, options);
  };
}

if (typeof window !== "undefined" && typeof document !== "undefined") installDevice();
