import { readJsonStorage } from "./storage";

/**
 * Versioned localStorage/sessionStorage helpers.
 * On schema mismatch, delete the key and return fallback — never throw.
 */

export interface VersionedPayload<T> {
  v: number;
  data: T;
}

export function readVersionedStorage<T>(
  storage: Storage | null | undefined,
  key: string,
  schemaVersion: number,
  fallback: T,
  validate?: (value: unknown) => value is T,
): T {
  if (!storage) return fallback;
  try {
    const raw = storage.getItem(key);
    if (!raw) return fallback;

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      storage.removeItem(key);
      return fallback;
    }

    // Legacy unversioned blob — drop if shape is wrong
    if (
      parsed &&
      typeof parsed === "object" &&
      "v" in parsed &&
      "data" in parsed
    ) {
      const envelope = parsed as VersionedPayload<unknown>;
      if (envelope.v !== schemaVersion) {
        storage.removeItem(key);
        return fallback;
      }
      if (validate && !validate(envelope.data)) {
        storage.removeItem(key);
        return fallback;
      }
      return envelope.data as T;
    }

    // Unversioned legacy: accept only if validate passes, else wipe
    if (validate) {
      if (validate(parsed)) return parsed;
      storage.removeItem(key);
      return fallback;
    }

    return readJsonStorage(raw, fallback, validate);
  } catch {
    try {
      storage?.removeItem(key);
    } catch {
      /* ignore */
    }
    return fallback;
  }
}

export function writeVersionedStorage<T>(
  storage: Storage | null | undefined,
  key: string,
  schemaVersion: number,
  data: T,
): void {
  if (!storage) return;
  try {
    const payload: VersionedPayload<T> = { v: schemaVersion, data };
    storage.setItem(key, JSON.stringify(payload));
  } catch {
    /* quota / private */
  }
}
