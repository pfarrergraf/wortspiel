import { Capacitor, registerPlugin } from "@capacitor/core";

export const isNativeApp = () => Capacitor.isNativePlatform();
export const Documents = registerPlugin("LudeverbisDocuments");

export async function saveBackup(text, name) {
  return Documents.save({ text, name, mime: "application/json" });
}

export async function readBackup() {
  const result = await Documents.open();
  if (result.cancelled) return { cancelled: true };
  return { cancelled: false, backup: JSON.parse(result.text) };
}
