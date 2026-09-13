/**
 * Global test setup — the single entry point.
 *
 * This used to be two files (`setup.js` + `setup.ts`) that were BOTH listed in
 * vitest.config.ts while `setup.ts` also imported `setup.js`, so the polyfills
 * were installed twice on every run. They are merged here.
 */

import '@testing-library/jest-dom';
import { vi } from 'vitest';
import nodeCrypto from 'node:crypto';

// ── Polyfills ──────────────────────────────────────────────────────────────

// structuredClone is required by fake-indexeddb and missing on older Node.
if (typeof globalThis.structuredClone === 'undefined') {
  globalThis.structuredClone = (obj: unknown) => JSON.parse(JSON.stringify(obj));
}

// Full Web Crypto API (crypto.subtle) — required by the encryption middleware
// and by the vault key envelope. Must be in place before any test touches the
// database layer.
if (!globalThis.crypto || !globalThis.crypto.subtle) {
  Object.defineProperty(globalThis, 'crypto', {
    value: {
      ...nodeCrypto.webcrypto,
      subtle: nodeCrypto.webcrypto.subtle,
      getRandomValues: (arr: NodeJS.ArrayBufferView) => nodeCrypto.randomFillSync(arr),
    },
    configurable: true,
    writable: true,
  });
}

// IndexedDB for Dexie.
await import('fake-indexeddb/auto');

// ── Browser globals ────────────────────────────────────────────────────────

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem(key: string) {
      return store[key] ?? null;
    },
    setItem(key: string, value: unknown) {
      store[key] = String(value);
    },
    clear() {
      store = {};
    },
    removeItem(key: string) {
      delete store[key];
    },
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

(window as unknown as { toast: unknown }).toast = vi.fn();

window.matchMedia = vi.fn().mockImplementation((query: string) => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: vi.fn(),
  removeListener: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
}));

// ── Native plugin mocks ────────────────────────────────────────────────────

// In-memory key-value store simulating the biometric keystore.
const biometricCredentialsStore = new Map<string, string>();

vi.mock('@capgo/capacitor-native-biometric', () => ({
  NativeBiometric: {
    isAvailable: vi.fn().mockResolvedValue({ isAvailable: true }),
    verifyIdentity: vi.fn().mockResolvedValue(true),
    setCredentials: vi.fn(
      async ({
        server,
        username,
        password,
      }: {
        server: string;
        username: string;
        password: string;
      }) => {
        biometricCredentialsStore.set(`${server}:${username}`, password);
      }
    ),
    getCredentials: vi.fn(async ({ server, username }: { server: string; username: string }) => {
      const key = `${server}:${username}`;
      if (!biometricCredentialsStore.has(key)) {
        throw new Error(`No credentials found for ${key}`);
      }
      return { password: biometricCredentialsStore.get(key) };
    }),
    deleteCredentials: vi.fn(async ({ server, username }: { server: string; username: string }) => {
      biometricCredentialsStore.delete(`${server}:${username}`);
    }),
  },
}));
