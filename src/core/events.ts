/**
 * Lightweight event dispatcher for cross-module notifications without circular dependencies.
 */
type Listener = () => Promise<unknown> | unknown;
const refreshListeners = new Set<Listener>();

export function onNotificationRefresh(listener: Listener): () => void {
  refreshListeners.add(listener);
  return () => {
    refreshListeners.delete(listener);
  };
}

export async function triggerNotificationRefresh(): Promise<void> {
  const promises: Promise<unknown>[] = [];
  for (const fn of refreshListeners) {
    try {
      const res = fn();
      if (res && typeof (res as Promise<unknown>).then === 'function') {
        promises.push(res as Promise<unknown>);
      }
    } catch {
      // safe fallback
    }
  }
  if (promises.length > 0) {
    await Promise.allSettled(promises);
  }
}
