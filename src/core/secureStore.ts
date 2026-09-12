import { Preferences } from '@capacitor/preferences';
import { NativeBiometric } from '@capgo/capacitor-native-biometric';
import { Device } from '@capacitor/device';
import { toast } from '../toast';
import { t } from '../i18n/engine';
import { db } from './db/core';
import { getEncryptionKey } from './security/crypto';
import { recordException } from './crashlytics';

const SERVICE = 'com.masarifi.app';
const USERNAME = 'drive_token';

/**
 * Retrieves a unique device/installation identifier seed.
 */
async function getDeviceFallbackSeed(): Promise<string> {
  try {
    const idRes = await Device.getId();
    if (idRes && idRes.identifier) {
      return `masarifi_device_${idRes.identifier}`;
    }
  } catch {
    // Fallback for browsers/environments where Device.getId() throws
  }

  try {
    const stored = await Preferences.get({ key: 'masarifi_device_seed' });
    if (stored.value) {
      return `masarifi_inst_${stored.value}`;
    }
    const newSeed = typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : (Date.now().toString(36) + Math.random().toString(36).substring(2));
    await Preferences.set({ key: 'masarifi_device_seed', value: newSeed });
    return `masarifi_inst_${newSeed}`;
  } catch {
    return 'masarifi_fallback_device_isolated_seed';
  }
}

/**
 * Securely derives a fallback encryption key using PBKDF2 (600,000 rounds).
 * Eliminates storing plaintext fallback keys in localStorage.
 */
export async function getOrCreateFallbackKey(customPinMaterial?: string): Promise<CryptoKey> {
  // 1. Proactively purge any legacy plaintext key from localStorage
  if (typeof localStorage !== 'undefined') {
    try {
      if (localStorage.getItem('masarifi_fallback_key')) {
        localStorage.removeItem('masarifi_fallback_key');
      }
    } catch {
      // Ignore storage access errors in restricted contexts
    }
  }

  // 2. If an active AES-GCM master key is already present in memory, use it
  const inMemoryKey = getEncryptionKey();
  if (inMemoryKey) {
    return inMemoryKey;
  }

  // 3. Derive key from user PIN hash + salt using PBKDF2 (600,000 iterations), or unique device seed
  let pinMaterial = customPinMaterial;
  if (!pinMaterial) {
    try {
      const pinHash = await db.getSetting<string>('pinHash');
      const pinSalt = await db.getSetting<string>('pinSalt');
      if (pinHash) {
        pinMaterial = `${pinHash}:${pinSalt || 'masarifi_salt'}`;
      } else {
        pinMaterial = await getDeviceFallbackSeed();
      }
    } catch {
      pinMaterial = await getDeviceFallbackSeed();
    }
  }

  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(pinMaterial),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: enc.encode('masarifi-secure-store-v22'),
      iterations: 600000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt a sensitive text payload using AES-GCM (256-bit).
 */
export async function encryptValue(text: string, customPinMaterial?: string): Promise<string | null> {
  try {
    const key = await getOrCreateFallbackKey(customPinMaterial);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encodedText = new TextEncoder().encode(text);
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      encodedText
    );
    const encryptedBytes = new Uint8Array(encrypted);
    const combined = new Uint8Array(iv.length + encryptedBytes.length);
    combined.set(iv, 0);
    combined.set(encryptedBytes, iv.length);
    const binary = String.fromCharCode(...combined);
    const base64 = btoa(binary);
    return `__enc__:${base64}`;
  } catch (error) {
    recordException('[SecureStore] Encryption failed', error instanceof Error ? error : new Error(String(error)));
    return null;
  }
}

/**
 * Decrypt an AES-GCM encrypted payload.
 */
export async function decryptValue(encryptedStr: string, customPinMaterial?: string): Promise<string | null> {
  if (!encryptedStr.startsWith('__enc__:')) {
    return encryptedStr;
  }
  try {
    const base64 = encryptedStr.substring(8);
    const binary = atob(base64);
    const combined = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      combined[i] = binary.charCodeAt(i);
    }
    const iv = combined.slice(0, 12);
    const ciphertext = combined.slice(12);
    const key = await getOrCreateFallbackKey(customPinMaterial);
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      ciphertext
    );
    return new TextDecoder().decode(decrypted);
  } catch (error) {
    recordException('[SecureStore] Decryption failed', error instanceof Error ? error : new Error(String(error)));
    return null;
  }
}

/**
 * Securely store a key-value pair in Biometric Keystore with fallback to PBKDF2-derived AES-GCM Preferences.
 */
export async function secureSet(key: string, value: string | null | undefined): Promise<boolean> {
  if (!value) {
    await secureRemove(key);
    return true;
  }
  try {
    await NativeBiometric.setCredentials({
      server: SERVICE,
      username: `${USERNAME}:${key}`,
      password: value,
    });
    await Preferences.remove({ key });
    return true;
  } catch (error) {
    recordException('[SecureStore] Keystore fallback to AES-GCM', error instanceof Error ? error : new Error(String(error)));
    const encrypted = await encryptValue(value);
    if (encrypted) {
      await Preferences.set({ key, value: encrypted });
      return true;
    }
    toast(t('error') || 'Security Error: Keystore Unavailable', 'error');
    return false;
  }
}

interface BiometricPlugin {
  getCredentials: (options: { server: string; username?: string }) => Promise<{ password?: string }>;
  deleteCredentials: (options: { server: string; username?: string }) => Promise<void>;
  setCredentials: (options: { server: string; username: string; password: string }) => Promise<void>;
}

const biometric = NativeBiometric as unknown as BiometricPlugin;

/**
 * Retrieve a securely stored value from Biometric Keystore or PBKDF2 AES-GCM Preferences.
 */
export async function secureGet(key: string): Promise<string | null> {
  const targetUsername = `${USERNAME}:${key}`;
  try {
    const res = await biometric.getCredentials({
      server: SERVICE,
      username: targetUsername,
    });
    if (res?.password) return res.password;
  } catch (_) {
    // Fall back to encrypted Preferences.
  }
  const { value } = await Preferences.get({ key });
  if (value) {
    if (value.startsWith('__enc__:')) {
      return await decryptValue(value);
    }
    toast(t('security.fallbackGet'), 'error');
    return value;
  }
  return null;
}

/**
 * Remove a securely stored key from all keystores and preferences.
 */
export async function secureRemove(key: string): Promise<void> {
  const targetUsername = `${USERNAME}:${key}`;
  try {
    await biometric.deleteCredentials({
      server: SERVICE,
      username: targetUsername,
    });
  } catch (_) {
    // Ignore biometric delete failures.
  }
  await Preferences.remove({ key });
}
