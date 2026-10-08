// Vibration where supported (Android). D3 extends this; iOS ignores it.
import { on } from "./events.js";

on("result", ({ result }) => {
  if (result === "taboo") navigator.vibrate?.(100);
});
