import { Capacitor } from '@capacitor/core';
import { FirebaseCrashlytics } from '@capacitor-firebase/crashlytics';
import { sanitizeCrashPayload } from './crashSanitizer';

/**
 * Masarifi — crash reporting.
 *
 * ## Current state: STAGED, NOT ACTIVE
 *
 * Audit note "production blindness": this module has 34 direct callers and
 * receives every one of the 171 `silentFail` sites via core/errors.ts, and the
 * comment there promises delivery "without silent swallows". In reality
 * nothing was ever delivered, because three things were missing at once:
 *
 *   1. `apply plugin: 'com.google.gms.google-services'` — absent from
 *      android/app/build.gradle (only the buildscript classpath is present).
 *   2. `google-services.json` — not in the repo, and gitignored.
 *   3. `initCrashlytics()` — defined but never called at audit time.
 *      → FIXED since: useAppInitialization now awaits it FIRST, before every
 *      other initializer, and `tests/unit/crashlyticsWiring.test.tsx` pins
 *      both the call and the ordering (Directive 17).
 *
 * The result was the worst of both worlds: code and comments asserting that
 * errors are reported, and a production build in which every error path leads
 * nowhere. A silent failure you believe is monitored is more dangerous than
 * one you know is not.
 *
 * ## Why it is still off
 *
 * Adding `apply plugin` without `google-services.json` breaks the Gradle build
 * outright. That file is a per-owner Firebase credential that cannot be
 * committed to Git — which is why Directive 17's own authorization text names
 * the dependency audit as the fallback path (executed in the same directive).
 * Everything else — initialization, the reporting path, and redaction — is in
 * place, gated behind `isCrashReportingEnabled`, and covered by tests:
 *
 *   - `tests/unit/crashlytics.test.ts` — the gate, init, transport failure
 *     swallowing, and payload redaction (module level).
 *   - `tests/unit/crashlyticsWiring.test.tsx` — startup calls
 *     `initCrashlytics` first, and a `silentFail` reaches the plugin through
 *     the sanitizer without throwing (the "safe test trigger").
 *
 * ## Enabling it later (owner steps — in this order)
 *
 *   1. Add `android/app/google-services.json` from the Firebase console
 *      (owner-only credential).
 *   2. Add `apply plugin: 'com.google.gms.google-services'` and
 *      `apply plugin: 'com.google.firebase.crashlytics'` to android/app/build.gradle.
 *   3. Set `VITE_CRASH_REPORTING=true` for the release build
 *      (guards already verified by tests — see above).
 *   4. Run a release build and confirm a test crash arrives.
 *
 * Nothing in step 3 can leak data on its own: every payload still passes
 * through the sanitizer first.
 */

interface CrashlyticsPlugin {
  setCrashlyticsCollectionEnabled?: (options: { enabled: boolean }) => Promise<void>;
  setEnabled?: (options: { enabled: boolean }) => Promise<void>;
  recordException: (options: { message: string; stacktrace?: string }) => Promise<void>;
}

const crashlytics = FirebaseCrashlytics as unknown as CrashlyticsPlugin;

/** Set once by initCrashlytics; guards every transmission. */
let _collectionEnabled = false;

/**
 * Whether crash reporting is switched on for this build.
 *
 * Opt-in by design. An unset flag means off, so a build that forgets to
 * configure Firebase silently does nothing rather than throwing on every
 * error path.
 */
export function isCrashReportingEnabled(): boolean {
  return (
    Capacitor.isNativePlatform() &&
    String(import.meta.env.VITE_CRASH_REPORTING ?? '').toLowerCase() === 'true'
  );
}

/**
 * Initialize crash collection. Safe to call unconditionally: it is a no-op
 * off-device, and a no-op when the feature flag is not set.
 */
export async function initCrashlytics(): Promise<void> {
  if (!isCrashReportingEnabled()) return;

  try {
    if (typeof crashlytics.setCrashlyticsCollectionEnabled === 'function') {
      await crashlytics.setCrashlyticsCollectionEnabled({ enabled: true });
    } else if (typeof crashlytics.setEnabled === 'function') {
      await crashlytics.setEnabled({ enabled: true });
    }
    _collectionEnabled = true;
  } catch (error) {
    // Do not route this through recordException: collection is precisely what
    // just failed, so that would recurse.
    if (import.meta.env.DEV) {
      console.error('[Crashlytics] Failed to initialize', error);
    }
    _collectionEnabled = false;
  }
}

/**
 * Record a handled error.
 *
 * Every payload is redacted by crashSanitizer before transmission — this app
 * routinely puts amounts, descriptions and API keys into error strings, and
 * none of that may reach a third party. See that module for the rules.
 */
export function recordException(message: string, error?: Error | unknown): void {
  if (isCrashReportingEnabled() && _collectionEnabled) {
    const payload = sanitizeCrashPayload(message, error);
    crashlytics
      .recordException({
        message: payload.name ? `${payload.name}: ${payload.message}` : payload.message,
        ...(payload.stacktrace ? { stacktrace: payload.stacktrace } : {}),
      })
      .catch(() => {
        /* Reporting must never itself throw into the caller's path. */
      });
    return;
  }

  // Development: log the UNSANITIZED error. Redaction protects users from a
  // third party; it would only obstruct the developer debugging on their own
  // machine, where the data is already in front of them.
  if (import.meta.env.DEV) {
    console.error(`[Crashlytics Dev Log] ${message}`, error);
  }
}

export const logError = recordException;
