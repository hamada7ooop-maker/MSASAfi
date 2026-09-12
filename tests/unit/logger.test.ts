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

  it('logs error and dispatches to crashlytics on native platform', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(true);

    const testError = new Error('Logger failure test');
    logger.error('LoggerTag', 'Critical error occurred', testError);

    expect(errorSpy).toHaveBeenCalled();
    expect(FirebaseCrashlytics.recordException).toHaveBeenCalledWith({
      message: '[LoggerTag] Critical error occurred',
      stacktrace: expect.stringContaining('Logger failure test'),
    });

    errorSpy.mockRestore();
  });
});
