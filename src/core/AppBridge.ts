/**
 * AppBridge.ts
 * 
 * Central registry for all global functions that were previously attached to `globalThis`.
 * This acts as a decoupling layer between legacy JS code and modern React components.
 */

import { logger } from './logger';

// Define the types of services available on the bridge
export interface AppBridgeService {
  // Translation
  t: (key: string, params?: Record<string, string>) => string;
  
  // UI Feedback
  toast: (msg: unknown, type?: 'success' | 'error' | 'info' | 'warning', duration?: number) => void;
  confirmSheet: (msg: string, onConfirm: () => void, confirmText?: string, cancelText?: string) => void;
  choiceSheet: (msg: string, onActionA: () => void, onActionB: () => void, labelA?: string, labelB?: string) => void;
  promptSheet: (
    msg: string,
    onConfirm: (val: string) => void,
    optsOrPlaceholder?: { isTextarea?: boolean; isPassword?: boolean; placeholder?: string; showPaste?: boolean } | string,
    isPassword?: boolean
  ) => void;
  haptic: (ms?: number) => void;
  
  // Calculator
  openCalculator: (initialValue?: string, onResult?: (res: string) => void) => void;
  
  // Auth
  triggerBiometricAuth: () => Promise<void>;
  
  // Confetti
  fireConfetti: () => void;
  
  // Internal UI control (used by back-button handler)
  __closeQuickAdd?: () => void;

  // Local Backup & Restore
  restoreBackup: (file: File) => Promise<void>;

  // Input Formatting
  restrictToNum?: (el: HTMLElement | HTMLInputElement) => void;
}

// The internal storage for the services
const registry: Partial<AppBridgeService> = {};

/**
 * Register a function on the AppBridge.
 * Legacy JS files will call this instead of assigning to globalThis.
 */
export function registerToBridge<K extends keyof AppBridgeService>(key: K, fn: AppBridgeService[K]) {
  registry[key] = fn;
}

/**
 * Access the bridge.
 * Returns an object that lazily calls the registered functions.
 */
export const bridge: AppBridgeService = new Proxy({} as AppBridgeService, {
  get: (_, prop: keyof AppBridgeService | string | symbol) => {
    if (typeof prop !== 'string') return undefined;
    return (...args: unknown[]) => {
      const fn = registry[prop as keyof AppBridgeService];
      if (typeof fn === 'function') {
        return (fn as (...args: unknown[]) => unknown)(...args);
      }
      logger.warn('AppBridge', `Function '${String(prop)}' was called but is not registered yet.`);
      return undefined;
    };
  }
});
