const KEY = "wortspiel.state.v1";
const DB_NAME = "wortspiel";
const LOCK_PREFIX = `${KEY}.lock:`;
const PENDING_KEY = `${KEY}.pending`;

export class StorageConflictError extends Error {
  constructor() {
    super("Der Spielstand hat sich inzwischen geändert. Bitte prüfe die angezeigte Karte und wiederhole die Aktion. Es wurde nichts gewertet.");
    this.name = "StorageConflictError";
  }
}

export class StorageMirrorPendingError extends Error {
  constructor() {
    super("Der neueste Spielstand ist in der Datenbank gesichert, aber die lokale Kopie ist noch nicht aktuell. Bitte öffne einen Tab mit funktionierendem Datenbankspeicher, bevor du hier weiterspielst. Euer Kartenspeicher bleibt erhalten.");
    this.name = "StorageMirrorPendingError";
  }
}

function pendingRevision() {
  let serialized;
  try { serialized = localStorage.getItem(PENDING_KEY); } catch {
    throw new Error("Die Schreibkoordination braucht Website-Speicher. Bitte erlaube ihn und lade die Seite erneut. Die gespeicherten Spielstände bleiben erhalten.");
  }
  if (serialized === null) return null;
  let revision;
  try { revision = JSON.parse(serialized).revision; } catch { /* Do not discard an unknown journal. */ }
  if (!Number.isSafeInteger(revision) || revision < 0)
    throw new Error("Die Schreibmarkierung ist nicht lesbar. Die gespeicherten Spielstände bleiben unverändert erhalten.");
  return revision;
}

function extendsHistory(candidate, previous) {
  return Object.entries(previous.groups).every(([id, group]) => {
    const next = candidate.groups[id];
    if (!next) return false;
    const previousReset = Number.isFinite(group.resetAt) ? group.resetAt : 0;
    const nextReset = Number.isFinite(next.resetAt) ? next.resetAt : 0;
    // A pre-reset branch must never resurrect cards from the former history.
    if (nextReset < previousReset) return false;
    // An explicitly confirmed reset is the only legitimate history truncation.
    if (nextReset > previousReset) return true;
    return Object.keys(group.seen).every((card) => Object.hasOwn(next.seen, card));
  });
}

function chooseState(saved, local, fallback) {
  if (saved !== undefined && !valid(saved))
    throw new Error("Der vorhandene Datenbank-Spielstand hat ein unbekanntes Format. Er bleibt unverändert gespeichert.");
  const conflicting = valid(saved) && local && (local.revision > saved.revision
    ? !extendsHistory(local, saved)
    : !extendsHistory(saved, local));
  if (conflicting) {
    const error = new Error("Die Datenbank und die lokale Kopie enthalten unterschiedliche Kartenhistorien. Beide Spielstände bleiben unverändert erhalten; bitte sichere beide Kopien vor einer Reparatur.");
    error.name = "StorageLineageError";
    throw error;
  }
  const current = local && local.revision >= fallback.revision ? local : fallback;
  return valid(saved) && saved.revision >= current.revision ? saved : current;
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
    Number.isSafeInteger(state.revision) && state.revision >= 0 &&
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
    this.state = chooseState(saved, local, fallback);
    return this.update(() => {});
  }

  async snapshot() {
    // Backups must remain read-only, including when storage is full. Read the
    // durable root rather than exporting a UI snapshot that missed a tab event.
    let saved;
    if (this.db) saved = await new Promise((resolve, reject) => {
      const request = this.db.transaction("state").objectStore("state").get(KEY);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const current = chooseState(saved, readLocal(), this.state);
    if (!this.db) {
      const pending = pendingRevision();
      if (pending !== null && current.revision < pending) throw new StorageMirrorPendingError();
    }
    return structuredClone(current);
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
      // Never bypass cross-backend coordination, even with a usable database.
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
    const previousPending = pendingRevision();
    if (!this.db && previousPending !== null && current.revision < previousPending)
      throw new StorageMirrorPendingError();
    const check = (basis) => {
      if (basis.revision === Number.MAX_SAFE_INTEGER)
        throw new Error("Der Revisionszähler des Spielstands ist ausgeschöpft. Der gespeicherte Stand bleibt unverändert erhalten; bitte sichere ihn vor einer Reparatur.");
      if (expectedRevision !== undefined && basis.revision !== expectedRevision) {
        this.state = basis;
        throw new StorageConflictError();
      }
    };
    if (this.db) {
      let marked = false;
      try {
        next = await new Promise((resolve, reject) => {
          const tx = this.db.transaction("state", "readwrite");
          this.transaction = tx;
          const store = tx.objectStore("state");
          const request = store.get(KEY);
          let result;
          request.onsuccess = () => {
            try {
              const saved = request.result;
              const basis = chooseState(saved, local, current);
              check(basis);
              result = structuredClone(basis);
              change(result);
              result.revision++;
              // Persist intent BEFORE a database commit can leave the local
              // mirror behind (quota, process exit, missed completion callback).
              // A local-only writer must not fork that stale mirror.
              localStorage.setItem(PENDING_KEY, JSON.stringify({ revision: result.revision }));
              marked = true;
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
      } catch (error) {
        // An aborted attempt does not leave a new journal, but a previous
        // unmirrored commit must remain fenced until its snapshot is recovered.
        if (marked && previousPending === null)
          try { localStorage.removeItem(PENDING_KEY); } catch { /* Fail closed. */ }
        throw error;
      }
      try {
        localStorage.setItem(KEY, JSON.stringify(next));
        localStorage.removeItem(PENDING_KEY);
      } catch {
        /* IndexedDB is durable; retain its journal until the mirror recovers. */
      }
    } else {
      try {
        check(current);
        next = structuredClone(current);
        change(next);
        next.revision++;
        localStorage.setItem(KEY, JSON.stringify(next));
        // A remaining marker at or below our basis was already fully mirrored.
        if (previousPending !== null)
          try { localStorage.removeItem(PENDING_KEY); } catch { /* Snapshot is already durable; the marker is no newer. */ }
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
