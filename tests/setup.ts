import '@testing-library/jest-dom';
import './setup.js';
import { vi } from 'vitest';

// In-memory key-value store for Biometric Keystore simulation
const biometricCredentialsStore = new Map<string, string>();

vi.mock('@capgo/capacitor-native-biometric', () => ({
  NativeBiometric: {
    isAvailable: vi.fn().mockResolvedValue({ isAvailable: true }),
    verifyIdentity: vi.fn().mockResolvedValue(true),
    setCredentials: vi.fn(async ({ server, username, password }: { server: string; username: string; password: string }) => {
      biometricCredentialsStore.set(`${server}:${username}`, password);
    }),
    getCredentials: vi.fn(async ({ server, username }: { server: string; username: string }) => {
      const key = `${server}:${username}`;
      if (!biometricCredentialsStore.has(key)) {
        throw new Error(`No credentials found for ${key}`);
      }
      return { password: biometricCredentialsStore.get(key) };
    }),
    deleteCredentials: vi.fn(async ({ server, username }: { server: string; username: string }) => {
      biometricCredentialsStore.delete(`${server}:${username}`);
    })
  }
}));
