import { useAppStore } from "../store/appStore";
import { useSettingsStore } from "../store/settingsStore";
import { db } from "../core/db/core";
import { App } from "@capacitor/app";
import { silentFail } from "../core/utils";
import { clearEncryptionKey } from "../core/security";
import { BiometricService } from "../core/services/BiometricService";

/**
 * Initializes Authentication, PIN lock, and auto-lock lifecycle.
 */
export async function initAuth(): Promise<void> {
  const pinHash = await db.getSetting("pinHash");
  const pin = await db.getSetting("pin");
  const hasPin = !!(pinHash || pin);
  const autoLock = (await db.getSetting("autoLock")) !== false;
  const useBiometric = (await db.getSetting("useBiometric")) === true || (await db.getSetting("useBiometric")) === "true";
  
  const appStore = useAppStore.getState();
  appStore.setHasPin(hasPin);
  appStore.setAutoLock(autoLock);
  useSettingsStore.getState().setUseBiometric(Boolean(hasPin && useBiometric));

  if (hasPin && autoLock) {
    appStore.setLocked(true);
    clearEncryptionKey();
  }
}

export function setupAuthListeners(): () => void {
  const cleanups: (() => void)[] = [];

  const lockAppNow = () => {
    const { hasPin, autoLock, setLocked } = useAppStore.getState();
    if (hasPin && autoLock) {
      setLocked(true);
      clearEncryptionKey();
    }
  };

  const triggerBiometricIfAvailable = () => {
    const { hasPin, autoLock, isLocked } = useAppStore.getState();
    const useBiometric = useSettingsStore.getState().useBiometric;
    if (isLocked && hasPin && autoLock && useBiometric) {
      BiometricService.isAvailable()
        .then((available) => {
          if (available) {
            return BiometricService.authenticate().then((success) => {
              if (success) {
                useAppStore.getState().setLocked(false);
              }
            });
          }
        })
        .catch(silentFail('[Auth] Auto biometric on resume error'));
    }
  };

  // 1. Native Capacitor appStateChange
  try {
    const handle = App.addListener("appStateChange", async ({ isActive }) => {
      if (!isActive) {
        lockAppNow();
      } else {
        triggerBiometricIfAvailable();
        db.processRecurringTransactions().catch(silentFail('processRecurringTransactions'));
      }
    });

    cleanups.push(() => {
      handle.then(h => h.remove()).catch(silentFail('appStateChangeListenerRemove'));
    });
  } catch {
    // Platform does not support App.addListener
  }

  // 2. Web & WebView visibilitychange (handles tab switching, minimizing browser, screen lock)
  const handleVisibilityChange = () => {
    if (document.hidden) {
      lockAppNow();
    } else {
      triggerBiometricIfAvailable();
      db.processRecurringTransactions().catch(silentFail('processRecurringTransactions'));
    }
  };
  document.addEventListener("visibilitychange", handleVisibilityChange);
  cleanups.push(() => document.removeEventListener("visibilitychange", handleVisibilityChange));

  // 3. User inactivity / idle auto-lock timer
  let idleTimer: ReturnType<typeof setTimeout> | null = null;
  const IDLE_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

  const resetIdleTimer = () => {
    if (idleTimer) clearTimeout(idleTimer);
    const { hasPin, autoLock } = useAppStore.getState();
    if (!hasPin || !autoLock) return;
    idleTimer = setTimeout(() => {
      const state = useAppStore.getState();
      if (state.hasPin && state.autoLock && !state.isLocked) {
        state.setLocked(true);
        clearEncryptionKey();
      }
    }, IDLE_TIMEOUT_MS);
  };

  const activityEvents = ['pointerdown', 'keydown', 'scroll', 'touchstart'];
  activityEvents.forEach((evt) => {
    window.addEventListener(evt, resetIdleTimer, { passive: true });
    cleanups.push(() => window.removeEventListener(evt, resetIdleTimer));
  });
  resetIdleTimer();

  return () => {
    if (idleTimer) clearTimeout(idleTimer);
    cleanups.forEach((c) => c());
  };
}
