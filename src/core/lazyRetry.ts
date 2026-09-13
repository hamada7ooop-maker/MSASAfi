import { ComponentType, lazy, LazyExoticComponent } from 'react';

/**
 * Robust lazy component loader with automatic retry on dynamic import failure.
 * Fixes stale chunk / Vite HMR dynamic import caching issues.
 */
// `ComponentType<any>` is deliberate and matches React's own typings for
// lazy(). `unknown` does not work here: component props are contravariant, so
// `ComponentType<unknown>` rejects every component that declares props. This
// is the one place the escape hatch is the correct answer rather than a
// shortcut.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function lazyWithRetry<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T } | Record<string, T>>,
  namedExport?: string
): LazyExoticComponent<T> {
  return lazy(async () => {
    let pageHasBeenForceRefreshed = false;
    try {
      pageHasBeenForceRefreshed = JSON.parse(
        window.sessionStorage.getItem('masarifi_chunk_retry') || 'false'
      );
    } catch {
      pageHasBeenForceRefreshed = false;
    }

    try {
      const module = await factory();
      window.sessionStorage.setItem('masarifi_chunk_retry', 'false');
      
      const component =
        namedExport && namedExport in module
          ? (module as Record<string, T>)[namedExport]
          : 'default' in module
          ? module.default
          : Object.values(module)[0];

      return { default: component as T };
    } catch (error) {
      if (!pageHasBeenForceRefreshed) {
        // Assume outdated chunks in cache — trigger a single hard refresh
        window.sessionStorage.setItem('masarifi_chunk_retry', 'true');
        window.location.reload();
        return new Promise(() => {}); // Keep pending until reload
      }
      throw error;
    }
  });
}
