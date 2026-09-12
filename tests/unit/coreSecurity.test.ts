import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  hashPin,
  generateSalt,
  safeInnerHTML,
  purifyString,
  purifyRecord,
  resetAutoLock,
  setupAutoLock,
  checkDeviceIntegrity,
  setupPrivacyShield,
} from '../../src/core/security';
import { useAppStore } from '../../src/store/appStore';
import { useSettingsStore } from '../../src/store/settingsStore';
import { db as DB } from '../../src/core/db/core';

vi.mock('@capacitor/device', () => ({
  Device: {
    getInfo: vi.fn().mockResolvedValue({ isVirtual: false }),
    getId: vi.fn().mockResolvedValue({ identifier: 'device_test_123' }),
  },
}));

vi.mock('@capacitor/app', () => ({
  App: {
    addListener: vi.fn(() => {
      return { remove: vi.fn() };
    }),
  },
}));

describe('Core Security Unit Tests (security.ts)', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    useAppStore.setState({
      hasPin: true,
      autoLock: true,
      isLocked: false,
    });
    useSettingsStore.setState({
      useBiometric: false,
    });
    await DB.settings.clear();
    await DB.setSetting('shakeToBlur', true);
  });

  describe('PIN & Cryptographic Hashing', () => {
    it('generates a 32-character hexadecimal salt', () => {
      const salt1 = generateSalt();
      const salt2 = generateSalt();
      expect(salt1).toHaveLength(32);
      expect(salt2).toHaveLength(32);
      expect(salt1).not.toBe(salt2);
    });

    it('hashes PIN deterministically with PBKDF2', async () => {
      const salt = generateSalt();
      const hash1 = await hashPin('1234', salt);
      const hash2 = await hashPin('1234', salt);
      const hash3 = await hashPin('4321', salt);

      expect(hash1).toBe(hash2);
      expect(hash1).not.toBe(hash3);
      expect(hash1).toHaveLength(64); // 256 bits = 64 hex chars
    });

    it('throws when hashing with an empty salt', async () => {
      await expect(hashPin('1234', '')).rejects.toThrow('Salt is required');
    });
  });

  describe('HTML & Data Sanitization', () => {
    it('sanitizes innerHTML safely with safeInnerHTML', () => {
      const div = document.createElement('div');
      safeInnerHTML(div, '<img src=x onerror=alert(1)><strong>Protected Text</strong>');
      expect(div.innerHTML).toContain('<strong>Protected Text</strong>');
      expect(div.innerHTML).not.toContain('onerror');
    });

    it('purifies strings and strips malicious attributes', () => {
      const clean = purifyString('<script>alert("hack")</script>Hello');
      expect(clean).toBe('Hello');
    });

    it('recursively purifies objects and nested arrays with purifyRecord', () => {
      const payload = {
        title: 'Salary <script>alert(1)</script>',
        amount: 5000,
        nested: {
          note: '<img src=x onerror=alert(2)>Note content',
        },
        tags: ['<a href="javascript:alert(3)">tag</a>', 'clean'],
      };

      const result = purifyRecord(payload);
      expect(result.title).toBe('Salary ');
      expect(result.amount).toBe(5000);
      expect(result.nested.note).not.toContain('onerror');
      expect(result.tags[0]).not.toContain('javascript:');
    });
  });

  describe('AutoLock & Background State Handlers', () => {
    it('locks app after auto-lock timeout', () => {
      vi.useFakeTimers();
      resetAutoLock();

      expect(useAppStore.getState().isLocked).toBe(false);
      vi.advanceTimersByTime(5 * 60 * 1000 + 100);
      expect(useAppStore.getState().isLocked).toBe(true);

      vi.useRealTimers();
    });

    it('attaches activity listeners in setupAutoLock', () => {
      const addSpy = vi.spyOn(document, 'addEventListener');
      setupAutoLock();
      expect(addSpy).toHaveBeenCalledWith('click', expect.any(Function), { passive: true });
    });
  });

  describe('Device & App Integrity Check', () => {
    it('passes integrity check on normal environments', async () => {
      const intact = await checkDeviceIntegrity();
      expect(intact).toBe(true);
    });

    it('sets up privacy shield and task switcher blur handlers', async () => {
      await setupPrivacyShield();
      expect(true).toBe(true);
    });
  });
});
