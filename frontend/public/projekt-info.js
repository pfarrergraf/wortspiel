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
