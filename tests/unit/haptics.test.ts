import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Haptics } from '@capacitor/haptics';
import { Capacitor } from '@capacitor/core';
import { touch } from '../../src/core/haptics';
import { prefersReducedMotion } from '../../src/core/a11y';
import { useSettingsStore } from '../../src/store/settingsStore';

/**
 * Directive 19 — Batch 0: the unified haptic vocabulary.
 *
 * Pins the three gates (setting, reduced motion, never-throws) and the
 * semantic routing (impact vs notification vs the triumph double pulse).
 */
vi.mock('@capacitor/haptics', () => ({
  Haptics: {
    impact: vi.fn().mockResolvedValue(undefined),
    notification: vi.fn().mockResolvedValue(undefined),
  },
  ImpactStyle: { Light: 'LIGHT', Medium: 'MEDIUM', Heavy: 'HEAVY' },
  NotificationType: { Success: 'SUCCESS', Warning: 'WARNING', Error: 'ERROR' },
}));
vi.mock('@capacitor/core', () => ({
  Capacitor: { isNativePlatform: vi.fn(() => false) },
}));
vi.mock('../../src/core/a11y', () => ({
  prefersReducedMotion: vi.fn(() => false),
}));

const impact = vi.mocked(Haptics.impact);
const notification = vi.mocked(Haptics.notification);
const isNative = vi.mocked(Capacitor.isNativePlatform);
const reducedMotion = vi.mocked(prefersReducedMotion);

function stubWebVibrate() {
  const vibrate = vi.fn();
  Object.defineProperty(navigator, 'vibrate', { value: vibrate, configurable: true });
  return vibrate;
}

beforeEach(() => {
  impact.mockClear();
  notification.mockClear();
  useSettingsStore.setState({ hapticsEnabled: true });
  reducedMotion.mockReturnValue(false);
  isNative.mockReturnValue(false);
});

describe('touch — the semantic vocabulary on native', () => {
  beforeEach(() => isNative.mockReturnValue(true));

  it('light/select map to impact styles of matching weight', () => {
    touch.light();
    touch.select();
    expect(impact).toHaveBeenCalledTimes(2);
    expect(impact).toHaveBeenNthCalledWith(1, { style: 'LIGHT' });
    expect(impact).toHaveBeenNthCalledWith(2, { style: 'MEDIUM' });
  });

  it('confirm maps to a success notification (financial confirmation)', () => {
    touch.confirm();
    expect(notification).toHaveBeenCalledWith({ type: 'SUCCESS' });
    expect(impact).not.toHaveBeenCalled();
  });

  it('destruct carries the gravity: heavy impact', () => {
    touch.destruct();
    expect(impact).toHaveBeenCalledWith({ style: 'HEAVY' });
  });

  it('error maps to an error notification', () => {
    touch.error();
    expect(notification).toHaveBeenCalledWith({ type: 'ERROR' });
  });

  it('triumph is a distinct double pulse (medium then light after 90ms)', () => {
    vi.useFakeTimers();
    try {
      touch.triumph();
      expect(impact).toHaveBeenCalledTimes(1);
      expect(impact).toHaveBeenLastCalledWith({ style: 'MEDIUM' });
      vi.advanceTimersByTime(89);
      expect(impact).toHaveBeenCalledTimes(1);
      vi.advanceTimersByTime(1);
      expect(impact).toHaveBeenCalledTimes(2);
      expect(impact).toHaveBeenLastCalledWith({ style: 'LIGHT' });
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('touch — web fallback', () => {
  it('routes to navigator.vibrate with semantic patterns', () => {
    const vibrate = stubWebVibrate();
    touch.light();
    touch.select();
    touch.confirm();
    touch.destruct();
    touch.error();
    touch.triumph();
    expect(vibrate).toHaveBeenNthCalledWith(1, 10);
    expect(vibrate).toHaveBeenNthCalledWith(2, 15);
    expect(vibrate).toHaveBeenNthCalledWith(3, [10, 40, 20]);
    expect(vibrate).toHaveBeenNthCalledWith(4, [30, 50, 30]);
    expect(vibrate).toHaveBeenNthCalledWith(5, [50, 50, 50]);
    expect(vibrate).toHaveBeenNthCalledWith(6, [15, 80, 30]);
    expect(impact).not.toHaveBeenCalled();
    expect(notification).not.toHaveBeenCalled();
  });
});

describe('touch — the three gates', () => {
  it('falls silent when the user disabled haptics in settings', () => {
    const vibrate = stubWebVibrate();
    useSettingsStore.setState({ hapticsEnabled: false });
    touch.confirm();
    touch.triumph();
    expect(vibrate).not.toHaveBeenCalled();
  });

  it('respects prefers-reduced-motion: no vibration, no native calls', () => {
    reducedMotion.mockReturnValue(true);
    const vibrate = stubWebVibrate();
    touch.light();
    touch.error();
    expect(vibrate).not.toHaveBeenCalled();
    expect(impact).not.toHaveBeenCalled();
    expect(notification).not.toHaveBeenCalled();
  });

  it('never throws even when the vibration API is absent', () => {
    Object.defineProperty(navigator, 'vibrate', { value: undefined, configurable: true });
    expect(() => touch.confirm()).not.toThrow();
  });
});


// ─── Directive 19 Batch 2: legacy useHaptic now routes through the vocabulary ───
describe('useHaptic — legacy redirect to touch', () => {
  // The redirect is verified through the engine mocks (impact/notification),
  // exactly like the vocabulary tests above — the legacy names must land on
  // the same unified pulses the direct vocabulary emits.
  beforeEach(() => isNative.mockReturnValue(true));

  it('maps every legacy event onto its unified counterpart', async () => {
    const { renderHook } = await import('@testing-library/react');
    const { useHaptic } = await import('../../src/core/hooks/useHaptic');
    const { result } = renderHook(() => useHaptic());
    const cases = [
      ['light', () => expect(impact).toHaveBeenLastCalledWith({ style: 'LIGHT' })],
      ['medium', () => expect(impact).toHaveBeenLastCalledWith({ style: 'MEDIUM' })],
      ['heavy', () => expect(impact).toHaveBeenLastCalledWith({ style: 'HEAVY' })],
      ['success', () => expect(notification).toHaveBeenLastCalledWith({ type: 'SUCCESS' })],
      ['error', () => expect(notification).toHaveBeenLastCalledWith({ type: 'ERROR' })],
      ['selection', () => expect(impact).toHaveBeenLastCalledWith({ style: 'LIGHT' })],
    ] as const;
    for (const [legacy, assertUnified] of cases) {
      result.current(legacy);
      assertUnified();
      impact.mockClear();
      notification.mockClear();
    }
  });

  it('defaults to light when no event is given', async () => {
    const { renderHook } = await import('@testing-library/react');
    const { useHaptic } = await import('../../src/core/hooks/useHaptic');
    const { result } = renderHook(() => useHaptic());
    result.current();
    expect(impact).toHaveBeenCalledWith({ style: 'LIGHT' });
  });
});
