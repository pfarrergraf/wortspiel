const KEY = "wortspiel.state.v1";
const DB_NAME = "wortspiel";

function valid(state) {
  return (
    state?.schema === 1 &&
    Number.isInteger(state.revision) &&
    state.groups &&
    state.settings
  );
}

export class Storage {
  constructor() {
    this.db = null;
    this.mode = "browser";
  }

  async open(fallback) {
    let local = null;
    try {
      local = JSON.parse(localStorage.getItem(KEY));
    } catch {
      /* Try IndexedDB. */
    }
    try {
      this.db = await new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, 1);
        request.onupgradeneeded = () =>
          request.result.createObjectStore("state");
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
        request.onblocked = () =>
          reject(new Error("Der Speicher ist in einem anderen Tab blockiert."));
      });
      this.db.onversionchange = () => this.db.close();
    } catch {
      this.mode = "local";
    }
    let saved = null;
    if (this.db) {
      try {
        saved = await new Promise((resolve, reject) => {
          const request = this.db
            .transaction("state")
            .objectStore("state")
            .get(KEY);
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });
      } catch {
        this.db.close();
        this.db = null;
        this.mode = "local";
      }
    }
    let chosen = valid(saved) ? saved : fallback;
    if (valid(local) && (!valid(saved) || local.revision > saved.revision))
      chosen = local;
    this.state = chosen;
    return this.update(() => {});
  }

  async update(change) {
    let next;
    if (this.db) {
      next = await new Promise((resolve, reject) => {
        const tx = this.db.transaction("state", "readwrite");
        const store = tx.objectStore("state");
        const request = store.get(KEY);
        let result;
        request.onsuccess = () => {
          try {
            const saved = request.result;
            const basis =
              valid(saved) && saved.revision >= this.state.revision
                ? saved
                : this.state;
            result = structuredClone(basis);
            change(result);
            result.revision++;
            store.put(result, KEY);
          } catch (error) {
            reject(error);
            tx.abort();
          }
        };
        tx.oncomplete = () => resolve(result);
        tx.onerror = () =>
          reject(
            tx.error ||
              new Error("Der Kartenspeicher konnte nicht gespeichert werden."),
          );
        tx.onabort = () =>
          reject(tx.error || new Error("Speichern abgebrochen."));
      });
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
      } catch {
        /* IndexedDB is durable. */
      }
    } else {
      let basis = this.state;
      try {
        const saved = JSON.parse(localStorage.getItem(KEY));
        if (valid(saved) && saved.revision > basis.revision) basis = saved;
        next = structuredClone(basis);
        change(next);
        next.revision++;
        localStorage.setItem(KEY, JSON.stringify(next));
      } catch (error) {
        throw new Error(
          `Speichern nicht möglich: ${error.message}. Bitte erlaube Website-Speicher.`,
        );
      }
    }
    this.state = next;
    return next;
  }
}

export async function persistentStorage() {
  if (!navigator.storage?.persist) return false;
  return navigator.storage.persist();
}
