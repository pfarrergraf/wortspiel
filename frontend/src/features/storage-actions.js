import { ctx, store, change, dialog, toast } from "../app.js";
import { registerAction } from "../actions.js";
import { exportBackup, importBackup, resetGroup } from "../engine.js";
import { persistentStorage } from "../storage.js";
import { escape, action } from "../ui/html.js";
import { isNativeApp, saveBackup, readBackup } from "../native.js";

registerAction("reset-confirm", () =>
  dialog(
    "Kartenspeicher zurücksetzen?",
    `<p>Alle bereits gesehenen Karten von <strong>${escape(ctx.state.settings.group)}</strong> können danach wieder auftauchen. Eine laufende Partie dieser Gruppe wird beendet.</p><p>Andere Gruppen bleiben erhalten. Lade vorher eine Sicherung herunter, wenn du den Speicher behalten möchtest.</p>`,
    `${action("reset-group", "Ja, Speicher zurücksetzen", "button danger")}${action("close-dialog", "Abbrechen")}`,
  ),
);

registerAction("reset-group", async () => {
  const done = await change((s) => resetGroup(s, s.settings.group));
  if (done) toast("Kartenspeicher dieser Gruppe zurückgesetzt.");
});

registerAction("export", async () => {
  let snapshot;
  try { snapshot = await store.snapshot(); }
  catch (error) { toast(error.message); return; }
  const text = JSON.stringify(exportBackup(snapshot), null, 2);
  const name = `wortspiel-speicher-${new Date().toISOString().slice(0, 10)}.json`;
  if (isNativeApp()) {
    try {
      const result = await saveBackup(text, name);
      if (!result.cancelled) toast("Sicherung für alle Gruppen gespeichert.");
    } catch (error) { toast(error.message || "Sicherung konnte nicht gespeichert werden."); }
    return;
  }
  const blob = new Blob([text], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob),
    link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast("Sicherung für alle Gruppen heruntergeladen.");
});

async function mergeBackup(backup) {
  let added = 0;
  const done = await change((s) => { added = importBackup(s, backup); });
  if (done) toast(`${added} zusätzliche Karten in den Speicher übernommen.`);
}

registerAction("import", async () => {
  if (!isNativeApp()) { document.querySelector("#backup-input").click(); return; }
  try {
    const result = await readBackup();
    if (!result.cancelled) await mergeBackup(result.backup);
  } catch (error) { toast(error.message || "Sicherung konnte nicht geöffnet werden."); }
});

document.addEventListener("change", async (event) => {
  if (event.target.id !== "backup-input") return;
  const file = event.target.files[0];
  if (!file) return;
  try {
    if (file.size > 5 * 1024 * 1024)
      throw new Error("Die Sicherung ist zu groß (maximal 5 MB).");
    const backup = JSON.parse(await file.text());
    await mergeBackup(backup);
  } catch (error) {
    toast(error.message);
  }
});

registerAction("persist", async () => {
  try {
    toast(
      (await persistentStorage())
        ? "Der Browser schützt euren Speicher vor automatischem Entfernen. Eine Sicherung bleibt sinnvoll."
        : "Der Browser hat den Speicherschutz nicht zugesagt. Bitte nutze eine Sicherungsdatei.",
    );
  } catch {
    toast(
      "Speicherschutz ist hier nicht verfügbar. Bitte sichere den Kartenspeicher als Datei.",
    );
  }
});
