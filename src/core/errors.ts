import { recordException } from './crashlytics';

/**
 * Safe error logger for non-blocking asynchronous calls (e.g. background sync, audit logging).
 * Forwards errors directly to Crashlytics without throwing or silent swallows.
 */
export function silentFail(context: string) {
  return (error: unknown) => {
    recordException(`[Silent] ${context}`, error instanceof Error ? error : new Error(String(error)));
  };
}

/**
 * Silent ignore utility for known, benign rejections (e.g. user canceled share modal).
 */
export function ignore(_err?: unknown) {
  /* Intentional no-op */
  return () => {};
}
