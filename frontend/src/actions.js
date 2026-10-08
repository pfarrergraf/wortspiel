// Registry for [data-action] buttons. Ids ending in ":" match as prefixes
// (e.g. "preset:" handles "preset:youth").
const exact = new Map();
const prefixes = [];

export function registerAction(id, handler) {
  if (id.endsWith(":")) prefixes.push([id, handler]);
  else {
    if (exact.has(id)) throw new Error(`Action already registered: ${id}`);
    exact.set(id, handler);
  }
}

export function findAction(id) {
  return exact.get(id) || prefixes.find(([prefix]) => id.startsWith(prefix))?.[1];
}

export function installActions() {
  document.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-action]");
    if (!button || button.disabled) return;
    event.preventDefault();
    const id = button.dataset.action;
    await findAction(id)?.(id, button, event);
  });
}
