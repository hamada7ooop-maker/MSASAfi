import { describe, it, expect } from 'vitest';
import {
  purifyString,
  purifyRecord,
  checkDeviceIntegrity,
  setupPrivacyShield
} from '@/core/security';
import { getOrCreateFallbackKey } from '@/core/secureStore';

describe('Security & Sanitization Unit Tests (security.ts)', () => {
  it('purifies unsafe strings and scripts', () => {
    expect(purifyString('Normal text')).toBe('Normal text');
    expect(purifyString('<script>alert("xss")</script>Hello')).toBe('Hello');
    expect(purifyString(12345)).toBe(12345);
  });

  it('purifies records recursively', () => {
    const dirty = {
      title: '<b>Bold</b><script>bad()</script>',
      amount: 100,
      nested: {
        comment: '<img src=x onerror=alert(1)>safe',
        tags: ['<script>xss</script>clean', 'normal']
      }
    };

    const clean = purifyRecord(dirty);
    expect(clean.title).toBe('<b>Bold</b>');
    expect(clean.nested.comment).toContain('safe');
    expect(clean.nested.tags[0]).toBe('clean');
    expect(clean.nested.tags[1]).toBe('normal');
  });

  it('runs device integrity check without error', async () => {
    const integrity = await checkDeviceIntegrity();
    expect(typeof integrity).toBe('boolean');
  });

  it('initializes privacy shield protections without error', async () => {
    await expect(setupPrivacyShield()).resolves.toBeUndefined();
  });

  it('ensures fallback key derivation purges legacy plaintext and keeps derived key in volatile memory only', async () => {
    // Set a legacy plaintext fallback key
    localStorage.setItem('masarifi_fallback_key', 'legacy_unencrypted_secret_12345');
    expect(localStorage.getItem('masarifi_fallback_key')).toBe('legacy_unencrypted_secret_12345');

    const key = await getOrCreateFallbackKey();
    expect(key).toBeDefined();
    expect(key.type).toBe('secret');
    expect(key.extractable).toBe(false);

    // Verify plaintext fallback key was completely purged from storage
    expect(localStorage.getItem('masarifi_fallback_key')).toBeNull();
  });
});
