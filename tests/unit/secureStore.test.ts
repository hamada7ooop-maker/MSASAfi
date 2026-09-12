import { describe, it, expect, beforeEach, vi } from 'vitest';
import { encryptValue, decryptValue, getOrCreateFallbackKey, secureSet, secureGet, secureRemove } from '../../src/core/secureStore';

describe('SecureStore PBKDF2 & AES-GCM Key Derivation Tests', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('should automatically purge legacy plaintext fallback key from localStorage', async () => {
    localStorage.setItem('masarifi_fallback_key', 'legacy_unencrypted_secret_key_123456');
    expect(localStorage.getItem('masarifi_fallback_key')).toBe('legacy_unencrypted_secret_key_123456');

    await getOrCreateFallbackKey();

    expect(localStorage.getItem('masarifi_fallback_key')).toBeNull();
  });

  it('should encrypt and decrypt a sensitive payload correctly (roundtrip)', async () => {
    const sensitiveSecret = 'AI_KEY_GEMINI_SEC_998877';
    const encrypted = await encryptValue(sensitiveSecret);

    expect(encrypted).not.toBeNull();
    expect(encrypted?.startsWith('__enc__:')).toBe(true);
    expect(encrypted).not.toContain(sensitiveSecret);

    const decrypted = await decryptValue(encrypted!);
    expect(decrypted).toBe(sensitiveSecret);
  });

  it('should fail decryption when derived with a different PIN material', async () => {
    const sensitiveSecret = 'GROQ_API_KEY_SEC_112233';
    const encrypted = await encryptValue(sensitiveSecret, 'pin_hash_user_1');

    expect(encrypted).not.toBeNull();

    const decryptedWithWrongPin = await decryptValue(encrypted!, 'pin_hash_user_2');
    expect(decryptedWithWrongPin).toBeNull();

    const decryptedWithCorrectPin = await decryptValue(encrypted!, 'pin_hash_user_1');
    expect(decryptedWithCorrectPin).toBe(sensitiveSecret);
  });

  it('should correctly set, get, and remove values via secureSet and secureGet', async () => {
    const key = 'test_token_apiKey';
    const val = 'my_secret_token_value';

    const saved = await secureSet(key, val);
    expect(saved).toBe(true);

    const retrieved = await secureGet(key);
    expect(retrieved).toBe(val);

    await secureRemove(key);
    const afterRemove = await secureGet(key);
    expect(afterRemove).toBeNull();
  });
});
