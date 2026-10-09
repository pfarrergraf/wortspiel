const KEY = "wortspiel.state.v1";
const DB_NAME = "wortspiel";
const LOCK_PREFIX = `${KEY}.lock:`;

export class StorageConflictError extends Error {
  constructor() {
    super("Der Spielstand hat sich inzwischen geändert. Bitte prüfe die angezeigte Karte und wiederhole die Aktion. Es wurde nichts gewertet.");
    this.name = "StorageConflictError";
  }
}

function readLocal() {
  let serialized;
  try {
    serialized = localStorage.getItem(KEY);
  } catch {
    return null; // IndexedDB may still be available with localStorage denied.
  }
  if (serialized === null) return null;
  let state;
  try { state = JSON.parse(serialized); } catch { /* Preserve the original bytes. */ }
  if (!valid(state)) throw new Error("Der vorhandene Spielstand kann nicht gelesen werden. Er bleibt unverändert gespeichert; bitte bewahre eine Kopie auf, bevor du den Speicher reparierst.");
  return state;
}

function valid(state) {
  return (
    state?.schema === 1 &&
    Number.isInteger(state.revision) &&
    state.groups && typeof state.groups === "object" && !Array.isArray(state.groups) &&
    state.settings && typeof state.settings === "object" && !Array.isArray(state.settings)
  );
}

export class Storage {
  constructor() {
    this.db = null;
    this.mode = "browser";
    this.owner = crypto.randomUUID?.() ?? Array.from(crypto.getRandomValues(new Uint32Array(4)), (n) => n.toString(16).padStart(8, "0")).join("");
    this.lockKey = `${LOCK_PREFIX}${this.owner}`;
    this.lockTimeout = 5000;
    this.queue = Promise.resolve();
    globalThis.addEventListener?.("pagehide", () => {
      // Abort before releasing: an IndexedDB write must not outlive its lock.
      try { this.transaction?.abort(); } catch { /* Already completed. */ }
      try { localStorage.removeItem(this.lockKey); } catch { /* No local access. */ }
    });
  }

  async open(fallback) {
    const local = readLocal();
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
    let saved;
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
        if (!local) throw new Error("Der vorhandene Datenbankspeicher konnte nicht gelesen werden. Er bleibt erhalten; bitte versuche es erneut, bevor du eine neue Partie beginnst.");
      }
    }
    if (saved !== undefined && !valid(saved))
      throw new Error("Der vorhandene Datenbank-Spielstand hat ein unbekanntes Format. Er bleibt unverändert gespeichert.");
    let chosen = valid(saved) ? saved : fallback;
    if (valid(local) && (!valid(saved) || local.revision > saved.revision))
      chosen = local;
    this.state = chosen;
    return this.update(() => {});
  }

  update(change, { expectedRevision } = {}) {
    const operation = this.queue.then(() => this.withLock(() => this.write(change, expectedRevision)));
    this.queue = operation.catch(() => {});
    return operation;
  }

  async withLock(operation) {
    if (globalThis.navigator?.locks?.request) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(new Error("Der Kartenspeicher wird von einem anderen Tab verwendet. Bitte schließe andere Wortspiel-Tabs und versuche es erneut. Euer Speicher bleibt erhalten.")), this.lockTimeout);
      try {
        return await navigator.locks.request(KEY, { mode: "exclusive", signal: controller.signal }, () => {
          clearTimeout(timeout); // Never expire an already acquired writer lock.
          return operation();
        });
      } finally { clearTimeout(timeout); }
    }
    return this.withFallbackLock(operation);
  }

  async withFallbackLock(operation) {
    // Lamport's bakery: each writer owns its own register, avoiding an unsafe
    // read/set lease on one shared key. Tickets never expire while a tab may
    // still resume writing. A stalled writer causes an error, never a reset.
    const tickets = () => {
      const entries = [];
      // Snapshot names: length/key iteration can skip a writer when another
      // tab removes a lower-index key during enumeration.
      for (const key of Object.keys(localStorage)) {
        if (!key.startsWith(LOCK_PREFIX) || key === this.lockKey) continue;
        const entry = JSON.parse(localStorage.getItem(key));
        if (!entry) continue; // A completed writer removed its own register.
        if (typeof entry.choosing !== "boolean" || !Number.isSafeInteger(entry.number) || entry.number < (entry.choosing ? 0 : 1))
          throw new Error("Die Speichersperre ist beschädigt. Der Kartenspeicher bleibt erhalten.");
        entries.push({ ...entry, key });
      }
      return entries;
    };
    try {
      localStorage.setItem(this.lockKey, JSON.stringify({ choosing: true, number: 0 }));
    } catch (error) {
      // IndexedDB remains usable when the browser disallows localStorage.
      if (this.db) return operation();
      throw new Error(`Speichern nicht möglich: ${error.message}. Bitte erlaube Website-Speicher.`);
    }
    try {
      const number = Math.max(0, ...tickets().map((entry) => entry.number)) + 1;
      if (!Number.isSafeInteger(number)) throw new Error("Die Speichersperre ist nicht verfügbar.");
      localStorage.setItem(this.lockKey, JSON.stringify({ choosing: false, number }));
      const started = Date.now();
      while (true) {
        if (!localStorage.getItem(this.lockKey)) throw new Error("Der Speicherzugriff wurde unterbrochen. Bitte wiederhole die Aktion.");
        const waiting = tickets().some((entry) => entry.choosing || entry.number < number || (entry.number === number && entry.key < this.lockKey));
        if (!waiting) break;
        if (Date.now() - started >= this.lockTimeout)
          throw new Error("Der Kartenspeicher wird von einem anderen Tab verwendet. Bitte schließe andere Wortspiel-Tabs und versuche es erneut. Euer Speicher bleibt erhalten.");
        await new Promise((resolve) => setTimeout(resolve, 20));
      }
      return await operation();
    } finally {
      try { localStorage.removeItem(this.lockKey); } catch { /* Do not misreport a committed write if access was revoked. */ }
    }
  }

  async write(change, expectedRevision) {
    let next;
    const local = readLocal();
    const current = local && local.revision > this.state.revision ? local : this.state;
    const check = (basis) => {
      if (expectedRevision !== undefined && basis.revision !== expectedRevision) {
        this.state = basis;
        throw new StorageConflictError();
      }
    };
    if (this.db) {
      next = await new Promise((resolve, reject) => {
        const tx = this.db.transaction("state", "readwrite");
        this.transaction = tx;
        const store = tx.objectStore("state");
        const request = store.get(KEY);
        let result;
        request.onsuccess = () => {
          try {
            const saved = request.result;
            if (saved !== undefined && !valid(saved))
              throw new Error("Der vorhandene Datenbank-Spielstand hat ein unbekanntes Format. Er bleibt unverändert gespeichert.");
            const basis =
              valid(saved) && saved.revision >= current.revision
                ? saved
                : current;
            check(basis);
            result = structuredClone(basis);
            change(result);
            result.revision++;
            store.put(result, KEY);
          } catch (error) {
            reject(error);
            tx.abort();
          }
        };
        tx.oncomplete = () => {
          this.transaction = null;
          resolve(result);
        };
        tx.onerror = () =>
          reject(
            tx.error ||
              new Error("Der Kartenspeicher konnte nicht gespeichert werden."),
          );
        tx.onabort = () => {
          this.transaction = null;
          reject(tx.error || new Error("Speichern abgebrochen."));
        };
      });
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
      } catch {
        /* IndexedDB is durable. */
      }
    } else {
      try {
        check(current);
        next = structuredClone(current);
        change(next);
        next.revision++;
        localStorage.setItem(KEY, JSON.stringify(next));
      } catch (error) {
        if (error instanceof StorageConflictError) throw error;
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
