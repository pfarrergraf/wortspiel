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

export class StorageLineageError extends Error {
  constructor() {
    super("Die gespeicherten Kopien enthalten unterschiedliche Spielverläufe. Beide bleiben unverändert erhalten; bitte sichere sie vor einer Reparatur.");
    this.name = "StorageLineageError";
  }
}

// Compact consistency fingerprints, not authentication or a security boundary.
// The metadata is additive to schema 1 and contains no duplicate game payload.
function fingerprint(state, gameOnly = false) {
  const { _storage, ...payload } = state;
  if (gameOnly) delete payload.revision;
  const text = JSON.stringify(payload);
  let a = 2166136261, b = 2654435769;
  for (let i = 0; i < text.length; i++) {
    a = Math.imul(a ^ text.charCodeAt(i), 16777619);
    b = Math.imul(b ^ text.charCodeAt(i), 2246822507);
  }
  return `${text.length}:${(a >>> 0).toString(16)}:${(b >>> 0).toString(16)}`;
}

function proof(state) {
  const metadata = state._storage;
  return metadata?.version === 1 && typeof metadata.database === "string" &&
    metadata.digest === fingerprint(state) ? metadata : null;
}

function sameGame(a, b) {
  // Legacy clients had no difficulty field. Its omission has an explicit
  // existing migration; it is not proof of a different score/round/history.
  const comparable = (state, other) => {
    const copy = { ...state, settings: { ...state.settings } };
    if ((state.settings.difficulty === undefined || other.settings.difficulty === undefined) &&
        [state.settings.difficulty, other.settings.difficulty].every(value => value === undefined || value === "easy"))
      delete copy.settings.difficulty;
    if (state.session && other.session) {
      copy.session = { ...state.session, settings: { ...state.session.settings } };
      if ((state.session.settings.difficulty === undefined || other.session.settings.difficulty === undefined) &&
          [state.session.settings.difficulty, other.session.settings.difficulty].every(value => value === undefined || value === "all"))
        delete copy.session.settings.difficulty;
    }
    return copy;
  };
  return fingerprint(comparable(a, b), true) === fingerprint(comparable(b, a), true);
}

function legacyDifficultyChange(candidate, previous) {
  // A carried checkpoint identifies the exact source of the documented old
  // migration. No category, point, turn, history or other setting may differ.
  if (candidate._storage?.version !== 1 || candidate._storage.digest !== fingerprint(previous)) return false;
  const projected = structuredClone(previous);
  let omitted = false;
  if (candidate.settings.difficulty === undefined && previous.settings.difficulty !== undefined) {
    if (previous.settings.difficulty !== "easy") return false;
    delete projected.settings.difficulty; omitted = true;
  }
  if (candidate.session && previous.session && candidate.session.settings.difficulty === undefined &&
      previous.session.settings.difficulty !== undefined) {
    // A single omitted session field means the historical `all` pool only.
    // Preserve the existing full pre-difficulty migration (both fields absent)
    // only when the carried checkpoint proves this exact otherwise unchanged source.
    const fullLegacyMigration = omitted && candidate.settings.difficulty === undefined;
    if (previous.session.settings.difficulty !== "all" && !fullLegacyMigration) return false;
    delete projected.session.settings.difficulty; omitted = true;
  }
  projected.revision = candidate.revision;
  return omitted && fingerprint(projected) === fingerprint(candidate);
}

function follows(candidate, previous) {
  if (!extendsHistory(candidate, previous)) return false;
  if (sameGame(candidate, previous)) return true;
  if (legacyDifficultyChange(candidate, previous)) return true;
  const metadata = proof(candidate), prior = fingerprint(previous);
  return Boolean(metadata && (metadata.database === prior || metadata.mirror === prior));
}

function localBasis(local, cached) {
  if (!local) return cached;
  if (sameGame(local, cached)) return local.revision >= cached.revision ? local : cached;
  if (local.revision <= cached.revision || !extendsHistory(local, cached))
    throw new StorageLineageError();
  if (follows(local, cached)) return local;
  const metadata = proof(local), previous = proof(cached);
  // A verified newer checkpoint or coordinated local descendant is authoritative.
  // Legacy clients changing a carried marker cannot pass its payload fingerprint.
  if (metadata && (metadata.database === metadata.digest ||
      previous?.database === metadata.database)) return local;
  throw new StorageLineageError();
}

function mark(next, basis, database, local) {
  const digest = fingerprint(next);
  next._storage = database
    ? { version: 1, digest, database: digest, mirror: fingerprint(local ?? basis) }
    : { version: 1, digest, database: proof(basis)?.database ?? fingerprint(basis) };
}

function pendingRevision() {
  let serialized;
  try { serialized = localStorage.getItem(PENDING_KEY); } catch {
    throw new Error("Die Schreibkoordination braucht Website-Speicher. Bitte erlaube ihn und lade die Seite erneut. Die gespeicherten Spielstände bleiben erhalten.");
  }
  if (serialized === null) return null;
  let marker;
  try { marker = JSON.parse(serialized); } catch { /* Do not discard an unknown journal. */ }
  const keys = marker && typeof marker === "object" && !Array.isArray(marker) ? Object.keys(marker) : [];
  const known = marker?.version === 1
    ? keys.length === 2 && keys.includes("version") && keys.includes("revision")
    : marker?.version === undefined && keys.length === 1 && keys.includes("revision");
  if (!known || !Number.isSafeInteger(marker.revision) || marker.revision < 0)
    throw new Error("Die Schreibmarkierung ist nicht lesbar. Die gespeicherten Spielstände bleiben unverändert erhalten.");
  return marker.revision;
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

function chooseState(saved, local, fallback, initial = false) {
  if (saved !== undefined && !valid(saved))
    throw new Error("Der vorhandene Datenbank-Spielstand hat ein unbekanntes Format. Er bleibt unverändert gespeichert.");
  // A freshly constructed default is not a competing persisted replica.
  if (initial && !local && valid(saved)) return saved;
  // Compare persisted replicas directly; a newer RAM cache must not hide a
  // conflicting older local replica with additional history.
  const current = local ?? fallback;
  if (!valid(saved)) return current;
  const winner = saved.revision >= current.revision ? saved : current;
  const older = winner === saved ? current : saved;
  if (!follows(winner, older)) throw new StorageLineageError();
  return winner;
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
    (state._storage === undefined || state._storage?.version === 1) &&
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
    this.state = chooseState(saved, local, fallback, true);
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
    const local = readLocal();
    if (!this.db) {
      const pending = pendingRevision();
      if (pending !== null) throw new StorageMirrorPendingError();
    }
    const current = this.db ? chooseState(saved, local, this.state) : localBasis(local, this.state);
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
      const timeout = setTimeout(() => controller.abort(new Error("Der Kartenspeicher wird von einem anderen Tab verwendet. Bitte schließe andere ludeverbis-Tabs und versuche es erneut. Euer Speicher bleibt erhalten.")), this.lockTimeout);
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
          throw new Error("Der Kartenspeicher wird von einem anderen Tab verwendet. Bitte schließe andere ludeverbis-Tabs und versuche es erneut. Euer Speicher bleibt erhalten.");
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
    const previousPending = pendingRevision();
    if (!this.db && previousPending !== null)
      throw new StorageMirrorPendingError();
    const current = this.db ? this.state : localBasis(local, this.state);
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
              mark(result, basis, true, local);
              // Persist intent BEFORE a database commit can leave the local
              // mirror behind (quota, process exit, missed completion callback).
              // A local-only writer must not fork that stale mirror.
              localStorage.setItem(PENDING_KEY, JSON.stringify({ version: 1, revision: result.revision }));
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
        mark(next, current, false);
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
