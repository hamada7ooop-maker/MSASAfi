import { db as DB } from './db/core';
import { App } from '@capacitor/app';
import DOMPurify from 'dompurify';
import { bridge } from './AppBridge.ts';
import { Device } from '@capacitor/device';
import { toast } from '../toast';
import { useAppStore } from '../store/appStore';
import { useSettingsStore } from '../store/settingsStore';
import { AUTO_LOCK_MINUTES } from './constants';
import { silentFail } from './utils';
import { t } from '../i18n/engine';
import { recordException } from './crashlytics';
// Re-export all AES-GCM crypto utilities from the circular-safe security/crypto module
import { deriveMasterKey, setEncryptionKey, getEncryptionKey, clearEncryptionKey, isEncryptionKeyReady, encryptData, decryptData, generateMasterDataKey, encryptKey, decryptKey } from './security/crypto';
export { deriveMasterKey, setEncryptionKey, getEncryptionKey, clearEncryptionKey, isEncryptionKeyReady, encryptData, decryptData, generateMasterDataKey, encryptKey, decryptKey };

let autoLockTimer: ReturnType<typeof setTimeout> | null = null;
const AUTO_LOCK_MS = AUTO_LOCK_MINUTES * 60 * 1000;

const SAFE_CONFIG = {
  ALLOWED_TAGS: [
    'div', 'span', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'ul', 'ol', 'li', 'a', 'img', 'br', 'hr', 'strong', 'em', 'b', 'i',
    'table', 'thead', 'tbody', 'tr', 'th', 'td', 'canvas', 'svg',
    'path', 'circle', 'rect', 'button', 'input', 'textarea', 'label', 'select', 'option'
  ],
  ALLOWED_ATTR: [
    'class', 'id', 'style', 'href', 'src', 'alt', 'type',
    'value', 'placeholder', 'name', 'for', 'data-*', 'aria-*', 'role',
    'tabindex', 'dir', 'lang', 'width', 'height', 'viewBox', 'd', 'fill',
    'stroke', 'cx', 'cy', 'r', 'x', 'y', 'rows', 'cols', 'disabled',
    'readonly', 'autocomplete', 'checked', 'selected', 'multiple', 'required'
  ],
  FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'style'],
  FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onchange', 'onmouseover', 'onfocus', 'onblur'],
  ALLOWED_URI_REGEXP: /^(?:https?|mailto|tel|sms):|^\/|^\#/i,
  FORCE_BODY: true
};

// Custom DOMPurify hook to dynamically strip any attribute starting with 'on'
DOMPurify.addHook('uponSanitizeAttribute', (_node, data) => {
  if (data.attrName && data.attrName.toLowerCase().startsWith('on')) {
    data.keepAttr = false;
  }
});

export function safeInnerHTML(element: HTMLElement | null, htmlString: string): void {
  if (!element) return;
  element.innerHTML = DOMPurify.sanitize(htmlString, SAFE_CONFIG);
}

// Use PBKDF2 with 600,000 iterations instead of plain SHA-256
export async function hashPin(pin: string, salt: string): Promise<string> {
  if (!salt) throw new Error('Salt is required for secure hashing');
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw', enc.encode(pin), { name: 'PBKDF2' }, false, ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: enc.encode(salt), iterations: 600000, hash: 'SHA-256' },
    keyMaterial, 256
  );
  return Array.from(new Uint8Array(bits)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function generateSalt(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function resetAutoLock(): void {
  if (autoLockTimer) clearTimeout(autoLockTimer);
  autoLockTimer = setTimeout(() => {
    const { hasPin, autoLock, setLocked } = useAppStore.getState();
    if (hasPin && autoLock) {
      setLocked(true);
      // Clear the AES-GCM key from memory so encrypted data is inaccessible while locked
      clearEncryptionKey();
    }
  }, AUTO_LOCK_MS);
}

export function setupAutoLock(): void {
  ['click', 'touchstart', 'keydown', 'scroll'].forEach((evt) => {
    document.addEventListener(evt, resetAutoLock, { passive: true });
  });
  
  // Lock immediately when app goes to background if PIN is set
  try {
    App.addListener('appStateChange', async ({ isActive }) => {
      const { hasPin, autoLock, isLocked, setLocked } = useAppStore.getState();

      if (!isActive) {
        // App backgrounded: lock immediately and clear keys
        if (hasPin && autoLock) {
          setLocked(true);
          clearEncryptionKey();
        }
      } else {
        // App foregrounded: if locked, trigger biometric if enabled
        const g = globalThis as typeof globalThis & { _ignoreNextResume?: boolean };
        if (g._ignoreNextResume) return;
        if (isLocked && hasPin && autoLock) {
          const useBiometric = useSettingsStore.getState().useBiometric;
          if (useBiometric && bridge.triggerBiometricAuth) {
            setTimeout(() => {
              bridge.triggerBiometricAuth?.();
            }, 300);
          }
        }
      }
    });
  } catch (e) {
    silentFail('[Security] App state listener not supported on this platform')(e);
  }

  resetAutoLock();
}

export async function checkDeviceIntegrity(): Promise<boolean> {
  try {
    // 1. Anti-Hooking integrity check
    const criticalFunctions = [
      { fn: hashPin, name: 'hashPin' },
      { fn: safeInnerHTML, name: 'safeInnerHTML' }
    ];

    for (const item of criticalFunctions) {
      const fnStr = item.fn.toString();
      if (fnStr.includes('[native code]') && !fnStr.includes('function') && !fnStr.includes('class')) {
        recordException(`[Security Alert] Hooking detected on critical function: ${item.name}`, new Error('Hooking detected'));
        toast(
          t('security.tamperingDetected') ||
            '⚠️ تنبيه أمني: تم رصد محاولة تلاعب بالدوال البرمجية!',
          'error'
        );
        return false;
      }
    }

    // 2. Emulator and native device integrity
    const g = globalThis as typeof globalThis & { Capacitor?: { isNativePlatform?: () => boolean } };
    if (g.Capacitor && g.Capacitor.isNativePlatform?.()) {
      const info = await Device.getInfo();
      if (info.isVirtual) {
        recordException('[Security] App running on virtual device (Emulator)', new Error('Running on Emulator'));
        toast(
          t('security.runningOnEmulator') || '⚠️ تنبيه أمني: التطبيق يعمل على محاكي!',
          'warning'
        );
      }

      // ── Root detection: REMOVED, deliberately ──────────────────────────
      // This slot previously matched the WebView User-Agent against
      // 'test-keys' / 'superuser' / 'rooted'. That check could never fire:
      // 'test-keys' is a value in the Android build fingerprint
      // (ro.build.tags), and 'superuser' is an app name — neither appears in
      // a WebView UA on any device, rooted or not. It also returned `false`
      // into a call site that discards the result.
      //
      // It was therefore pure security theatre: it detected nothing, blocked
      // nothing, and its presence implied the app was checking for a
      // compromised device when it was not. Code that appears to guard
      // something but does not is worse than no code, because it stops anyone
      // from asking whether the guard exists.
      //
      // Genuine root/tamper detection cannot be done from the WebView at all;
      // it requires reading the filesystem, package list and build properties
      // from native code (e.g. freeRASP or a small custom Capacitor plugin).
      // That is a new native feature, scheduled separately — not a patch to
      // this function. See AUDIT_REPORT.md, finding M-4.
      // ────────────────────────────────────────────────────────────────────
    }
  } catch (error) {
    silentFail('[Security] Integrity check failed')(error);
  }
  return true;
}

export async function setupPrivacyShield(): Promise<void> {
  // 1. Shake to Hide Privacy
  let lastX: number | null = null, lastY: number | null = null, lastZ: number | null = null;
  let shakeTimeout = false;

  const handleMotion = async (event: DeviceMotionEvent) => {
    const shakeEnabled = (await DB.getSetting('shakeToBlur')) !== false;
    if (!shakeEnabled) return;

    if (!event.accelerationIncludingGravity) return;
    const { x, y, z } = event.accelerationIncludingGravity;
    if (x === null || y === null || z === null) return;
    
    if (lastX !== null && lastY !== null && lastZ !== null) {
      const delta = Math.abs(x - lastX) + Math.abs(y - lastY) + Math.abs(z - lastZ);
      if (delta > 35 && !shakeTimeout) { // 35 is a strong shake
        const isActive = document.body.classList.toggle('privacy-blur-active');
        shakeTimeout = true;
        
        // Haptic Feedback if available
        if (window.navigator?.vibrate) {
          window.navigator.vibrate(isActive ? [50, 30, 50] : 50);
        }

        setTimeout(() => { shakeTimeout = false; }, 1500); // 1.5s cooldown
      }
    }
    lastX = x; lastY = y; lastZ = z;
  };

  // Request permission for iOS 13+ 
  const requestPermission = async () => {
    const dme = DeviceMotionEvent as unknown as { requestPermission?: () => Promise<string> };
    if (typeof dme !== 'undefined' && typeof dme.requestPermission === 'function') {
      try {
        const response = await dme.requestPermission();
        if (response === 'granted') {
          window.addEventListener('devicemotion', handleMotion as unknown as EventListener);
        }
      } catch (e) {
        silentFail('[Security] DeviceMotion permission error')(e);
      }
    } else {
      window.addEventListener('devicemotion', handleMotion as unknown as EventListener);
    }
  };

  // Trigger permission request on first user interaction if needed
  document.addEventListener('touchstart', requestPermission, { once: true });
  document.addEventListener('mousedown', requestPermission, { once: true });

  // 2. Task Switcher App Blur (Capacitor & Web Integration)
  const applyBlur = async () => {
    const enabled = (await DB.getSetting('shakeToBlur')) !== false;
    if (enabled) document.body.classList.add('app-switcher-blur');
  };
  const removeBlur = () => document.body.classList.remove('app-switcher-blur');

  try {
    App.addListener('appStateChange', ({ isActive }) => {
      if (!isActive) applyBlur();
      else removeBlur();
    });
  } catch (e) {
    silentFail('[Security] Capacitor App listener failed, using web fallbacks')(e);
  }

  // Robust web fallbacks for backgrounding
  window.addEventListener('blur', applyBlur);
  window.addEventListener('focus', removeBlur);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) applyBlur();
    else removeBlur();
  });

  // Dynamic integrity check.
  // The boolean result is intentionally not used to block the app: the only
  // remaining check is anti-hooking, and a false positive there must not lock
  // a legitimate user out of their own finances. It warns and reports.
  setTimeout(() => {
    void checkDeviceIntegrity();
  }, 1000);
}

/**
 * Tethers a string to DOMPurify with strict whitelist configs.
 */
export function purifyString(val: unknown): unknown {
  if (typeof val !== 'string') return val;
  return DOMPurify.sanitize(val, SAFE_CONFIG);
}

/**
 * Recursively purifies all string fields in an object or array to permanently prevent Stored XSS.
 */
export function purifyRecord<T>(obj: T): T {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'string') {
    return purifyString(obj) as unknown as T;
  }
  if (Array.isArray(obj)) {
    return obj.map(item => purifyRecord(item)) as unknown as T;
  }
  if (typeof obj === 'object') {
    const copy: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      copy[key] = purifyRecord(value);
    }
    return copy as unknown as T;
  }
  return obj;
}
