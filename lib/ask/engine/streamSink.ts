/**
 * Request-scoped stream hooks so completeText can emit tokens
 * without rewriting every handler. Uses AsyncLocalStorage when available.
 */

export type AskStreamHooks = {
  onToken?: (delta: string) => void;
  signal?: AbortSignal;
};

type AlsStore = { hooks: AskStreamHooks };

let als: { run: <T>(store: AlsStore, fn: () => T) => T; getStore: () => AlsStore | undefined } | null =
  null;

try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { AsyncLocalStorage } = require("node:async_hooks") as typeof import("node:async_hooks");
  als = new AsyncLocalStorage<AlsStore>();
} catch {
  als = null;
}

/** Fallback for environments without ALS — single-flight only. */
let fallbackHooks: AskStreamHooks | null = null;

export async function runWithStreamHooks<T>(
  hooks: AskStreamHooks,
  fn: () => Promise<T>,
): Promise<T> {
  if (als) {
    return als.run({ hooks }, fn);
  }
  fallbackHooks = hooks;
  try {
    return await fn();
  } finally {
    fallbackHooks = null;
  }
}

export function getStreamHooks(): AskStreamHooks | null {
  if (als) {
    return als.getStore()?.hooks ?? null;
  }
  return fallbackHooks;
}

export function emitStreamToken(delta: string): void {
  if (!delta) return;
  getStreamHooks()?.onToken?.(delta);
}

export function isStreamAborted(): boolean {
  return Boolean(getStreamHooks()?.signal?.aborted);
}
