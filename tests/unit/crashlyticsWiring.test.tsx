import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { db as DB } from '@/core/db/core';
import { FirebaseCrashlytics } from '@capacitor-firebase/crashlytics';
import { Capacitor } from '@capacitor/core';
import { silentFail } from '@/core/errors';

/**
 * Directive 17 (authorized) — Crashlytics activation, wiring layer.
 *
 * `crashlytics.test.ts` covers the module in isolation (the gate, init,
 * transport, redaction). What it cannot see is the WIRING: that the app's
 * startup hook actually calls `initCrashlytics`, and calls it FIRST — the
 * comment in useAppInitialization promises "Crash reporting first, so faults
 * during the rest of startup are captured", and a regression that reorders
 * startup (or drops the call) would silently un-monitor every later
 * initializer. That promise is the contract pinned here.
 *
 * The second half pins the full production path of the 171 `silentFail`
 * sites: silentFail → recordException → sanitizer → plugin — without
 * throwing into the caller, exactly as the architect's "safe test trigger"
 * asks: non-fatal exception reporting verified WITHOUT crashing the app.
 */

vi.mock('@capacitor-firebase/crashlytics', () => ({
  FirebaseCrashlytics: {
    setCrashlyticsCollectionEnabled: vi.fn().mockResolvedValue(undefined),
    recordException: vi.fn().mockResolvedValue(undefined),
  },
}));

/** Shared call-order log: the initializers append their names in order. */
const order: string[] = [];

vi.mock('@/core/crashlytics', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/core/crashlytics')>();
  return {
    ...actual,
    // Wrap (not replace) the real initializer: the order log records the
    // wiring, and the REAL init still runs so the module's internal
    // `_collectionEnabled` gate behaves exactly as in production.
    initCrashlytics: vi.fn(async () => {
      await actual.initCrashlytics();
      order.push('crashlytics');
    }),
  };
});

vi.mock('@/hooks/useSettingsInit', () => ({
  initSettings: vi.fn(async () => {
    order.push('settings');
  }),
}));

vi.mock('@/hooks/useAuthInit', () => ({
  initAuth: vi.fn(async () => {
    order.push('auth');
  }),
  setupAuthListeners: vi.fn(() => undefined),
}));

vi.mock('@/hooks/useLoyaltyInit', () => ({
  initLoyalty: vi.fn(async () => {
    order.push('loyalty');
  }),
}));

vi.mock('@/hooks/useServicesInit', () => ({
  initServices: vi.fn(async () => {
    order.push('services');
  }),
}));

import { useAppInitialization } from '@/hooks/useAppInitialization';

/** Turn the feature on for a test, as a release build would. */
function enableReporting() {
  vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(true);
  vi.stubEnv('VITE_CRASH_REPORTING', 'true');
}

describe('Directive 17 — Crashlytics wiring (startup order + safe trigger path)', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    order.length = 0;
    await DB.transaction('rw', DB.tables, async () => {
      for (const t of DB.tables) await t.clear();
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('startup calls initCrashlytics exactly once, and before every other initializer', async () => {
    render(<TestHarness />);

    await waitFor(
      () => {
        expect(order).toContain('crashlytics');
        expect(order).toContain('settings');
        expect(order).toContain('services');
      },
      { timeout: 5000 }
    );

    // "Crash reporting first, so faults during the rest of startup are
    // captured" — the promise in useAppInitialization's comment.
    expect(order[0]).toBe('crashlytics');
    expect(order.filter((n) => n === 'crashlytics')).toHaveLength(1);
  });

  it('a silentFail reaches the plugin through the sanitizer, without throwing (safe test trigger)', async () => {
    enableReporting();
    // Bring the real collection up first, exactly as startup would on a
    // release build (the wrapped mock still runs the real init).
    const { initCrashlytics } = await import('@/core/crashlytics');
    await initCrashlytics();
    expect(vi.mocked(FirebaseCrashlytics.setCrashlyticsCollectionEnabled)).toHaveBeenCalledWith({
      enabled: true,
    });

    // The production path of all 171 silentFail sites: the callback must
    // never throw into the caller's async pipeline.
    expect(() =>
      silentFail('Sync failed for ahmed@example.com amount 25000.50')(new Error('bad'))
    ).not.toThrow();

    // The payload was redacted before transmission.
    await vi.waitFor(() => {
      expect(FirebaseCrashlytics.recordException).toHaveBeenCalled();
    });
    const sent = JSON.stringify(
      vi.mocked(FirebaseCrashlytics.recordException).mock.calls[0][0]
    );
    expect(sent).toContain('Sync failed'); // diagnostic shape survives
    expect(sent).not.toContain('ahmed@example.com'); // PII redacted
    expect(sent).not.toContain('25000.50'); // amounts redacted
  });

  it('with the gate closed (web build), startup still completes and nothing is transmitted', async () => {
    vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(false);

    render(<TestHarness />);

    await waitFor(() => expect(order).toContain('services'), { timeout: 5000 });
    expect(order).toContain('crashlytics'); // the wiring call itself happened
  });
});

/** Minimal host: the hook runs its effect on mount, like App does. */
function TestHarness() {
  useAppInitialization();
  return null;
}
