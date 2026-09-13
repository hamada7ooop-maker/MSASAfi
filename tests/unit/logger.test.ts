import { describe, it, expect, vi, beforeEach } from 'vitest';
import { logger } from '@/core/logger';
import { FirebaseCrashlytics } from '@capacitor-firebase/crashlytics';
import { Capacitor } from '@capacitor/core';

vi.mock('@capacitor-firebase/crashlytics', () => ({
  FirebaseCrashlytics: {
    setCrashlyticsCollectionEnabled: vi.fn().mockResolvedValue(undefined),
    recordException: vi.fn().mockResolvedValue(undefined),
  },
}));

describe('AppLogger Unit Tests (logger.ts)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('logs debug, info, and warn messages to console', () => {
    const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    logger.debug('TestTag', 'Debug message', { a: 1 });
    expect(debugSpy).toHaveBeenCalledWith('[TestTag] Debug message', { a: 1 });

    logger.info('TestTag', 'Info message');
    expect(infoSpy).toHaveBeenCalledWith('[TestTag] Info message');

    logger.warn('TestTag', 'Warn message');
    expect(warnSpy).toHaveBeenCalledWith('[TestTag] Warn message');

    debugSpy.mockRestore();
    infoSpy.mockRestore();
    warnSpy.mockRestore();
  });

  it('logs error and dispatches to crashlytics when reporting is enabled', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    // Crash reporting is gated on native AND VITE_CRASH_REPORTING=true; the
    // flag is off by default because the Gradle plugin is not applied yet.
    vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(true);
    vi.stubEnv('VITE_CRASH_REPORTING', 'true');
    const { initCrashlytics } = await import('@/core/crashlytics');
    await initCrashlytics();

    const testError = new Error('Logger failure test');
    logger.error('LoggerTag', 'Critical error occurred', testError);

    expect(errorSpy).toHaveBeenCalled();
    expect(FirebaseCrashlytics.recordException).toHaveBeenCalledWith(
      expect.objectContaining({
        message: expect.stringContaining('[LoggerTag] Critical error occurred'),
        stacktrace: expect.stringContaining('Logger failure test'),
      })
    );

    errorSpy.mockRestore();
    vi.unstubAllEnvs();
  });

  it('does not dispatch to crashlytics while the reporting flag is off', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(true);

    logger.error('LoggerTag', 'Critical error occurred', new Error('x'));

    expect(FirebaseCrashlytics.recordException).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});
