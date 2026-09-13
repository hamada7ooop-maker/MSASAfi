import { describe, it, expect, afterEach } from 'vitest';
import { _encryptRecord, _decryptRecord } from '@/core/db/encryption';
import {
  deriveMasterKey,
  setEncryptionKey,
  clearEncryptionKey,
  setEncryptionRequired,
  isVaultLocked,
  encryptData,
  decryptData,
} from '@/core/security/crypto';

/**
 * Regression tests for the auto-lock / unlock key lifecycle.
 *
 * Two real defects are covered here:
 *
 *  1. Unlocking via PIN restored `isLocked = false` but never re-derived the
 *     AES-GCM key, leaving every encrypted record unreadable.
 *  2. `_encryptRecord` returned the record untouched when no key was loaded,
 *     which meant a write performed in that state persisted amounts and
 *     descriptions in PLAINTEXT.
 */
describe('Auto-lock / unlock encryption lifecycle', () => {
  afterEach(() => {
    clearEncryptionKey();
    setEncryptionRequired(false);
  });

  it('loses access to encrypted data when the key is wiped, and regains it after re-deriving', async () => {
    const PIN = '4821';
    const SALT = 'salt-lifecycle-test';

    setEncryptionKey(await deriveMasterKey(PIN, SALT));
    const blob = await encryptData({ amount: 2500, description: 'Salary' });
    expect(await decryptData(blob)).toEqual({ amount: 2500, description: 'Salary' });

    // Auto-lock / app backgrounded.
    clearEncryptionKey();
    await expect(decryptData(blob)).rejects.toThrow('Encryption key not loaded');

    // What PinScreen must now do on a correct PIN: re-derive the same key.
    setEncryptionKey(await deriveMasterKey(PIN, SALT));
    expect(await decryptData(blob)).toEqual({ amount: 2500, description: 'Salary' });
  });

  it('refuses to persist sensitive fields in plaintext while the vault is locked', async () => {
    setEncryptionKey(await deriveMasterKey('1111', 'salt-a'));
    clearEncryptionKey(); // locked, but still an encrypted vault

    expect(isVaultLocked()).toBe(true);

    await expect(
      _encryptRecord('transactions', { id: 't1', amount: 900, description: 'Rent' })
    ).rejects.toThrow(/locked/);
  });

  it('still allows plaintext writes when no PIN is configured', async () => {
    clearEncryptionKey();
    setEncryptionRequired(false);

    const rec = { id: 't2', amount: 40, description: 'Coffee' };
    await expect(_encryptRecord('transactions', rec)).resolves.toEqual(rec);
  });

  it('encrypts audit log and chat history payloads', async () => {
    setEncryptionKey(await deriveMasterKey('2222', 'salt-b'));

    const audit = await _encryptRecord('auditLog', {
      id: 'a1',
      action: 'add_transaction',
      description: 'Added: Groceries 250',
      details: { amount: 250, category: 'Food' },
    });
    // The financial payload must not survive as readable fields.
    expect(audit.description).toBeUndefined();
    expect(audit.details).toBeUndefined();
    expect(typeof audit._encrypted).toBe('string');
    expect(JSON.stringify(audit)).not.toContain('Groceries');

    const restoredAudit = await _decryptRecord('auditLog', audit);
    expect(restoredAudit.description).toBe('Added: Groceries 250');
    expect(restoredAudit.details).toEqual({ amount: 250, category: 'Food' });

    const chat = await _encryptRecord('chatHistory', {
      id: 1,
      role: 'user',
      content: 'My salary is 18000 per month',
    });
    expect(chat.content).toBeUndefined();
    expect(JSON.stringify(chat)).not.toContain('18000');
    expect((await _decryptRecord('chatHistory', chat)).content).toBe(
      'My salary is 18000 per month'
    );
  });
});
