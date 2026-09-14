import Dexie from 'dexie';
import { useEffect, useRef, useState } from 'react';

/** Normalize anything thrown into a real Error (Directive 16). */
export function toError(err: unknown): Error {
  return err instanceof Error ? err : new Error(String(err));
}

export interface LiveQueryState<T> {
  result: T;
  error: Error | null;
  /**
   * Directive 17 item 3: has a successful emission ever arrived?
   * `result` is seeded with `defaultResult` and is therefore never
   * `undefined` — callers cannot tell "not loaded yet" from "loaded an
   * empty/default value" by looking at `result` alone. This flag is the
   * honest signal: false until the first `next`, true forever after
   * (a resubscription keeps the last result, so it keeps this flag too;
   * an error before any success leaves it false).
   */
  hasFirstResult: boolean;
}

/**
 * Directive 16: error-capturing replacement for `useLiveQuery`.
 *
 * The stock `useLiveQuery` from dexie-react-hooks **throws** when the querier
 * rejects — even when a `defaultResult` was provided. A failed query therefore
 * detonates the whole render tree up to the nearest ErrorBoundary, which for a
 * dashboard means one broken table kills every widget on screen, and the user
 * gets a crash panel instead of a retry.
 *
 * This wrapper subscribes to the very same `Dexie.liveQuery` observable (so
 * live reactivity on DB writes is unchanged) but routes the error callback
 * into state instead of a render throw:
 *
 *   - `result` starts at `defaultResult` and keeps its last good value while
 *     an error is pending (stale data beats a flash of empties).
 *   - `error` is `null` until a subscription fails, and is cleared again both
 *     by a successful emission and by a resubscription (a resubscription IS
 *     the retry — see the `retryToken` pattern in `useHomeData`).
 *   - `hasFirstResult` flips to `true` on the first successful emission and
 *     stays `true` (Directive 17 item 3).
 *
 * Signature mirrors `useLiveQuery(querier, deps, defaultResult)` so call sites
 * convert mechanically.
 */
export function useLiveQuerySafe<T>(
  querier: () => T | Promise<T>,
  deps: readonly unknown[],
  defaultResult: T
): LiveQueryState<T> {
  const [state, setState] = useState<LiveQueryState<T>>({
    result: defaultResult,
    error: null,
    hasFirstResult: false,
  });

  // Keep the querier fresh across renders without resubscribing — same trick
  // the library itself uses internally.
  const querierRef = useRef(querier);
  querierRef.current = querier;

  useEffect(() => {
    // Optimistically clear the error on (re)subscription: the fresh
    // subscription is the retry. Result is kept until the next emission.
    setState(prev => (prev.error !== null ? { ...prev, error: null } : prev));

    const subscription = Dexie.liveQuery(() => querierRef.current()).subscribe({
      next: value => setState({ result: value, error: null, hasFirstResult: true }),
      error: err => setState(prev => ({
        result: prev.result,
        error: toError(err),
        hasFirstResult: prev.hasFirstResult,
      })),
    });

    // Dexie's subscribe returns a function in some versions and a
    // Subscription object in others — handle both, as dexie-react-hooks does.
    return () => {
      const s = subscription as (() => void) | { unsubscribe(): void };
      if (typeof s === 'function') s();
      else s.unsubscribe();
    };
    // The dependency array is supplied by the caller on purpose, mirroring
    // the `useLiveQuery(querier, deps, …)` contract — this hook cannot know
    // which values the querier closes over.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return state;
}
