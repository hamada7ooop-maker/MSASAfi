import { useCallback } from 'react';
import { touch } from '../haptics';

/**
 * Directive 19 — Batch 2: the legacy haptic hook now routes through the
 * unified vocabulary layer (src/core/haptics.ts).
 *
 * Nothing else changed for call sites (same event names, same signature),
 * but every pulse now passes the three gates — the hapticsEnabled setting,
 * prefers-reduced-motion, and never-throws — and reaches the native
 * Taptic/vibration engines via @capacitor/haptics on device instead of
 * navigator.vibrate only. Semantic mapping:
 *   light → touch.light, medium → touch.select, heavy → touch.destruct,
 *   success → touch.confirm, error → touch.error, selection → touch.light
 */
const MAP = {
  light: touch.light,
  medium: touch.select,
  heavy: touch.destruct,
  success: touch.confirm,
  error: touch.error,
  selection: touch.light,
} as const;

export type HapticType = keyof typeof MAP;

export function useHaptic() {
  return useCallback((type: HapticType = 'light') => {
    MAP[type]();
  }, []);
}
