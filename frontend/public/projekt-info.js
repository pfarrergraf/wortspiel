document.querySelectorAll("[data-copy-value]").forEach((button) => {
  button.hidden = typeof navigator.clipboard?.writeText !== "function";
  button.addEventListener("click", async () => {
    const status = document.querySelector("#copy-status");
    try {
      await navigator.clipboard.writeText(button.dataset.copyValue);
      status.textContent = `${button.dataset.copyLabel} kopiert.`;
    } catch {
      status.textContent = "Bitte markiere und kopiere die Angaben aus den Kontodaten.";
    }
  });
});

// The native bridge is injected on bundled informational pages as well.
if (globalThis.Capacitor?.isNativePlatform?.()) {
  const documents = globalThis.Capacitor.registerPlugin("LudeverbisDocuments");
  document.querySelectorAll('a[download]').forEach(link => {
    link.addEventListener("click", async event => {
      event.preventDefault();
      const status = document.querySelector("#copy-status");
      try {
        const blob = await (await fetch(link.href)).blob();
        const base64 = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result).split(",")[1]);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
        const result = await documents.save({ name: link.download, text: base64, mime: "image/png" });
        if (status && !result.cancelled) status.textContent = "QR-Bild gespeichert.";
      } catch { if (status) status.textContent = "QR-Bild konnte nicht gespeichert werden. Die Kontodaten stehen weiterhin hier."; }
    });
  });
}
