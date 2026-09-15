/**
 * Directive 19 — UI/UX Renaissance: the unified haptic vocabulary
 * (Batch 0: Enablement).
 *
 * ONE gateway for every tactile response in the app. No call site imports
 * @capacitor/haptics directly; everyone speaks this semantic vocabulary:
 *
 *   touch.light()     plain button presses
 *   touch.select()    segmented picks, toggles
 *   touch.confirm()   a financial action is confirmed
 *   touch.destruct()  delete/wipe — the weight carries the gravity
 *   touch.error()     rejected input
 *   touch.triumph()   goal reached / nisab crossed — a distinct double pulse
 *
 * Gates (all must pass):
 *   - `hapticsEnabled` setting (Settings → General; default on)
 *   - `prefers-reduced-motion` respected — touch falls silent
 *   - never throws: haptics is decoration, never a failure mode
 *
 * Platform routing: native builds use @capacitor/haptics (system Taptic/
 * vibration engines); web falls back to navigator.vibrate when available.
 */
import { Haptics, ImpactStyle, NotificationStyle } from '@capacitor/haptics';
import { Capacitor } from '@capacitor/core';
import { prefersReducedMotion } from './a11y';
import { useSettingsStore } from '../store/settingsStore';

export type TouchEventName =
  | 'light'
  | 'select'
  | 'confirm'
  | 'destruct'
  | 'error'
  | 'triumph';

/** All gates must pass for a tactile event to fire. */
function gate(): boolean {
  try {
    if (prefersReducedMotion()) return false;
    if (useSettingsStore.getState().hapticsEnabled === false) return false;
    return true;
  } catch {
    // Store not hydrated or DOM APIs missing — stay silent, never throw.
    return false;
  }
}

function isNative(): boolean {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

function webVibrate(pattern: number | number[]): void {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    // Vibration is a decoration; failures are ignored by contract.
  }
}

function nativeImpact(style: ImpactStyle): void {
  Haptics.impact({ style }).catch(() => {});
}

function nativeNotification(style: NotificationStyle): void {
  Haptics.notification({ style }).catch(() => {});
}

/** The double pulse that marks a meaningful win (goal, nisab, streak). */
function doublePulse(): void {
  if (isNative()) {
    nativeImpact(ImpactStyle.Medium);
    setTimeout(() => nativeImpact(ImpactStyle.Light), 90);
  } else {
    webVibrate([15, 80, 30]);
  }
}

export const touch: Record<TouchEventName, () => void> = {
  light: () => {
    if (!gate()) return;
    if (isNative()) nativeImpact(ImpactStyle.Light);
    else webVibrate(10);
  },
  select: () => {
    if (!gate()) return;
    if (isNative()) nativeImpact(ImpactStyle.Medium);
    else webVibrate(15);
  },
  confirm: () => {
    if (!gate()) return;
    if (isNative()) nativeNotification(NotificationStyle.Success);
    else webVibrate([10, 40, 20]);
  },
  destruct: () => {
    if (!gate()) return;
    if (isNative()) nativeImpact(ImpactStyle.Heavy);
    else webVibrate([30, 50, 30]);
  },
  error: () => {
    if (!gate()) return;
    if (isNative()) nativeNotification(NotificationStyle.Error);
    else webVibrate([50, 50, 50]);
  },
  triumph: () => {
    if (!gate()) return;
    doublePulse();
  },
};

export default touch;
