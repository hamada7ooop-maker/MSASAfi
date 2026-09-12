import { Capacitor } from '@capacitor/core';
import { FirebaseCrashlytics } from '@capacitor-firebase/crashlytics';

interface CrashlyticsPlugin {
  setCrashlyticsCollectionEnabled?: (options: { enabled: boolean }) => Promise<void>;
  setEnabled?: (options: { enabled: boolean }) => Promise<void>;
  recordException: (options: { message: string; stacktrace?: string }) => Promise<void>;
}

const crashlytics = FirebaseCrashlytics as unknown as CrashlyticsPlugin;

/**
 * Initializes Firebase Crashlytics collection on native platforms.
 */
export async function initCrashlytics(): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    try {
      if (typeof crashlytics.setCrashlyticsCollectionEnabled === 'function') {
        await crashlytics.setCrashlyticsCollectionEnabled({ enabled: true });
      } else if (typeof crashlytics.setEnabled === 'function') {
        await crashlytics.setEnabled({ enabled: true });
      }
    } catch (error) {
      recordException('[Crashlytics] Failed to initialize', error);
    }
  }
}

/**
 * Unified crash recording for production Firebase Crashlytics and dev logging.
 */
export function recordException(message: string, error?: Error | unknown): void {
  const stacktrace = error instanceof Error ? error.stack : (typeof error === 'string' ? error : undefined);
  if (Capacitor.isNativePlatform()) {
    const payload: { message: string; stacktrace?: string } = { message };
    if (stacktrace) payload.stacktrace = stacktrace;
    crashlytics.recordException(payload).catch(() => {});
  } else if (import.meta.env.DEV) {
    console.error(`[Crashlytics Dev Log] ${message}`, error);
  }
}

export const logError = recordException;
