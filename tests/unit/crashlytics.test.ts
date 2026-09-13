import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { initCrashlytics, recordException, logError, isCrashReportingEnabled } from '@/core/crashlytics';
import { FirebaseCrashlytics } from '@capacitor-firebase/crashlytics';
import { Capacitor } from '@capacitor/core';

vi.mock('@capacitor-firebase/crashlytics', () => ({
  FirebaseCrashlytics: {
    setCrashlyticsCollectionEnabled: vi.fn().mockResolvedValue(undefined),
    recordException: vi.fn().mockResolvedValue(undefined)
  }
}));

/**
 * Crash reporting is gated on TWO conditions, not one:
 *
 *   1. running on a native platform, and
 *   2. VITE_CRASH_REPORTING=true
 *
 * The flag exists because android/app/build.gradle does not yet apply the
 * google-services plugin — it cannot, until google-services.json is added,
 * or the Gradle build breaks. Reporting is therefore staged: fully
 * implemented, wired, redacted, and off.
 *
 * These tests previously asserted that being native was sufficient. That was
 * the old contract; they now assert the gate, and that nothing is transmitted
 * while it is closed.
 */

/** Turn the feature on for a test, as a release build would. */
function enableReporting() {
  vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(true);
  vi.stubEnv('VITE_CRASH_REPORTING', 'true');
}

describe('Crashlytics Unit Tests (crashlytics.ts)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  describe('the feature gate', () => {
    it('is off when the flag is unset, even on a native platform', () => {
      vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(true);
      expect(isCrashReportingEnabled()).toBe(false);
    });

    it('is off on web even when the flag is set', () => {
      vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(false);
      vi.stubEnv('VITE_CRASH_REPORTING', 'true');
      expect(isCrashReportingEnabled()).toBe(false);
    });

    it('is on only when native and the flag is true', () => {
      enableReporting();
      expect(isCrashReportingEnabled()).toBe(true);
    });

    it('treats any value other than "true" as off', () => {
      vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(true);
      for (const v of ['false', '1', 'yes', '']) {
        vi.stubEnv('VITE_CRASH_REPORTING', v);
        expect(isCrashReportingEnabled()).toBe(false);
      }
    });

    it('transmits nothing while the gate is closed', async () => {
      vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(true);
      await initCrashlytics();
      recordException('should not be sent', new Error('nope'));
      expect(FirebaseCrashlytics.setCrashlyticsCollectionEnabled).not.toHaveBeenCalled();
      expect(FirebaseCrashlytics.recordException).not.toHaveBeenCalled();
    });
  });

  describe('when enabled', () => {
    it('initializes collection', async () => {
      enableReporting();
      await initCrashlytics();
      expect(FirebaseCrashlytics.setCrashlyticsCollectionEnabled).toHaveBeenCalledWith({ enabled: true });
    });

    it('records an exception with the error type and a stack', async () => {
      enableReporting();
      await initCrashlytics();

      recordException('Native Crash Message', new Error('Test Crash'));

      expect(FirebaseCrashlytics.recordException).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Native Crash Message'),
          stacktrace: expect.stringContaining('Test Crash'),
        })
      );
    });

    it('includes the error class name, which is often the most useful field', async () => {
      enableReporting();
      await initCrashlytics();

      recordException('boom', new TypeError('bad'));

      expect(FirebaseCrashlytics.recordException).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.stringContaining('TypeError') })
      );
    });

    it('handles a string error and the logError alias', async () => {
      enableReporting();
      await initCrashlytics();

      logError('Error with string stack', 'simple error string');

      expect(FirebaseCrashlytics.recordException).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Error with string stack',
          stacktrace: 'simple error string',
        })
      );
    });

    it('does not transmit when initialization failed', async () => {
      enableReporting();
      vi.mocked(FirebaseCrashlytics.setCrashlyticsCollectionEnabled).mockRejectedValueOnce(
        new Error('no firebase config')
      );

      await initCrashlytics();
      recordException('after failed init', new Error('x'));

      // Collection never came up — sending would throw on every error path.
      expect(FirebaseCrashlytics.recordException).not.toHaveBeenCalled();
    });

    it('swallows transport failures instead of throwing into the caller', async () => {
      enableReporting();
      await initCrashlytics();
      vi.mocked(FirebaseCrashlytics.recordException).mockRejectedValueOnce(new Error('offline'));

      expect(() => recordException('m', new Error('e'))).not.toThrow();
    });
  });

  describe('payload redaction', () => {
    it('never transmits raw financial data or credentials', async () => {
      enableReporting();
      await initCrashlytics();

      recordException(
        'Sync failed for ahmed@example.com amount 25000.50 ?apiKey=secretkey123456',
        new Error('balance 1500.75 for card 4111111111111111')
      );

      const sent = JSON.stringify(vi.mocked(FirebaseCrashlytics.recordException).mock.calls[0][0]);
      expect(sent).not.toContain('ahmed@example.com');
      expect(sent).not.toContain('25000.50');
      expect(sent).not.toContain('secretkey123456');
      expect(sent).not.toContain('1500.75');
      expect(sent).not.toContain('4111111111111111');
      // The diagnostic shape survives redaction.
      expect(sent).toContain('Sync failed');
    });
  });
});
