import { ctx, store, change, dialog, toast } from "../app.js";
import { registerAction } from "../actions.js";
import { exportBackup, importBackup, resetGroup } from "../engine.js";
import { persistentStorage } from "../storage.js";
import { escape, action } from "../ui/html.js";

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
  const blob = new Blob([JSON.stringify(exportBackup(snapshot), null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob),
    link = document.createElement("a");
  link.href = url;
  link.download = `wortspiel-speicher-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast("Sicherung für alle Gruppen heruntergeladen.");
});

registerAction("import", () => document.querySelector("#backup-input").click());

document.addEventListener("change", async (event) => {
  if (event.target.id !== "backup-input") return;
  const file = event.target.files[0];
  if (!file) return;
  try {
    if (file.size > 5 * 1024 * 1024)
      throw new Error("Die Sicherung ist zu groß (maximal 5 MB).");
    const backup = JSON.parse(await file.text());
    let added = 0;
    const done = await change((s) => {
      added = importBackup(s, backup);
    });
    if (done) toast(`${added} zusätzliche Karten in den Speicher übernommen.`);
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
