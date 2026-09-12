import { useCallback } from 'react';

/**
 * Hook for triggering standard haptic feedback.
 * Uses the navigator.vibrate API if available.
 */
export function useHaptic() {
  const haptic = useCallback((type: 'light' | 'medium' | 'heavy' | 'success' | 'error' | 'selection' = 'light') => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        switch (type) {
          case 'light':
            navigator.vibrate(10);
            break;
          case 'medium':
            navigator.vibrate(20);
            break;
          case 'heavy':
            navigator.vibrate([30, 50, 30]);
            break;
          case 'success':
            navigator.vibrate([10, 50, 20]);
            break;
          case 'error':
            navigator.vibrate([50, 50, 50]);
            break;
          case 'selection':
            navigator.vibrate(5);
            break;
          default:
            navigator.vibrate(10);
        }
      } catch (e) {
        // Ignore vibration errors
      }
    }
  }, []);

  return haptic;
}
