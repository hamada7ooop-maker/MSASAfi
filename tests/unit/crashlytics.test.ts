import { describe, it, expect, vi, beforeEach } from 'vitest';
import { initCrashlytics, recordException, logError } from '@/core/crashlytics';
import { FirebaseCrashlytics } from '@capacitor-firebase/crashlytics';
import { Capacitor } from '@capacitor/core';

vi.mock('@capacitor-firebase/crashlytics', () => ({
  FirebaseCrashlytics: {
    setCrashlyticsCollectionEnabled: vi.fn().mockResolvedValue(undefined),
    recordException: vi.fn().mockResolvedValue(undefined)
  }
}));

describe('Crashlytics Unit Tests (crashlytics.ts)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('initializes crashlytics on native platform', async () => {
    vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(true);

    await initCrashlytics();
    expect(FirebaseCrashlytics.setCrashlyticsCollectionEnabled).toHaveBeenCalledWith({ enabled: true });
  });

  it('records exception on native platform', () => {
    vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(true);

    recordException('Native Crash Message', new Error('Test Crash'));
    expect(FirebaseCrashlytics.recordException).toHaveBeenCalledWith({
      message: 'Native Crash Message',
      stacktrace: expect.stringContaining('Error: Test Crash')
    });
  });

  it('records exception with string error and handles logError alias', () => {
    vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(true);

    logError('Error with string stack', 'simple error string');
    expect(FirebaseCrashlytics.recordException).toHaveBeenCalledWith({
      message: 'Error with string stack',
      stacktrace: 'simple error string'
    });
  });
});
