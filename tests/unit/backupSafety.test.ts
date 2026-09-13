import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  VAULT_SECRET_KEYS,
  isVaultSecretKey,
  stripVaultSecretsFromRows,
  stripVaultSecretsFromObject,
  stripVaultSecretsFromLocalStorage,
} from '@/core/backupSafety';
import { db as DB } from '@/core/db/core';
import {
  initializeVaultKey,
  unlockVault,
  WRAPPED_MDK_KEY,
  MDK_VERSION_KEY,
} from '@/core/security/vaultKey';
import {
  clearEncryptionKey,
  setEncryptionRequired,
  getEncryptionKey,
} from '@/core/security/crypto';

/**
 * Regression tests for backup/restore versus envelope encryption.
 *
 * ## The defect
 *
 * Local backup collects every table with `table.toArray()`. Two consequences
 * went unnoticed when envelope encryption landed:
 *
 * 1. `wrappedMDK` and `wrappedMDKVersion` live in the `settings` table, so the
 *    backup carried the vault's own key envelope — and `performRestore` wrote
 *    it over the target device's envelope along with pinHash/pinSalt. A
 *    cross-device restore therefore locked the user out: their own PIN no
 *    longer opened the app, and the source PIN read records back empty.
 *
 * 2. The Dexie middleware decrypts on read, so `toArray()` returns plaintext.
 *    An "unencrypted backup" of an encrypted vault wrote every amount and
 *    description to a file in the clear.
 *
 * This was a regression caused by the envelope work itself — before it there
 * was no envelope to copy — which is why these tests exist.
 */

const SALT_A = 'salt_device_a_0000';
const SALT_B = 'salt_device_b_1111';

async function resetVault() {
  clearEncryptionKey();
  setEncryptionRequired(false);
  for (const k of VAULT_SECRET_KEYS) await DB.setSetting(k, null);
}

describe('vault secrets are identified correctly', () => {
  it('covers the key envelope, the PIN material and device bookkeeping', () => {
    expect(isVaultSecretKey(WRAPPED_MDK_KEY)).toBe(true);
    expect(isVaultSecretKey(MDK_VERSION_KEY)).toBe(true);
    expect(isVaultSecretKey('pinHash')).toBe(true);
    expect(isVaultSecretKey('pinSalt')).toBe(true);
    expect(isVaultSecretKey('pin')).toBe(true);
  });

  it('does not classify ordinary user settings as secrets', () => {
    for (const k of ['baseCurrency', 'language', 'theme', 'homeOrder', 'userPoints']) {
      expect(isVaultSecretKey(k)).toBe(false);
    }
  });

  it('is robust against non-string input', () => {
    expect(isVaultSecretKey(undefined)).toBe(false);
    expect(isVaultSecretKey(null)).toBe(false);
    expect(isVaultSecretKey(42)).toBe(false);
  });
});

describe('stripping secrets from an export', () => {
  it('removes vault rows but keeps user settings', () => {
    const rows = [
      { id: 'baseCurrency', key: 'baseCurrency', value: 'SAR' },
      { id: WRAPPED_MDK_KEY, key: WRAPPED_MDK_KEY, value: 'BASE64WRAPPEDKEY' },
      { id: 'pinHash', key: 'pinHash', value: 'deadbeef' },
      { id: 'theme', key: 'theme', value: 'dark' },
    ];

    const out = stripVaultSecretsFromRows(rows);
    const keys = out.map((r) => r.key);

    expect(keys).toEqual(['baseCurrency', 'theme']);
    expect(JSON.stringify(out)).not.toContain('BASE64WRAPPEDKEY');
    expect(JSON.stringify(out)).not.toContain('deadbeef');
  });

  it('matches on id as well as key, for older rows carrying only one', () => {
    const out = stripVaultSecretsFromRows([{ id: 'pinSalt', value: 'x' }]);
    expect(out).toEqual([]);
  });

  it('strips the object form used by legacy backups', () => {
    const out = stripVaultSecretsFromObject({
      baseCurrency: 'SAR',
      [WRAPPED_MDK_KEY]: 'secret',
      pinHash: 'hash',
    });
    expect(out).toEqual({ baseCurrency: 'SAR' });
  });

  it('strips device-scoped entries from a localStorage snapshot', () => {
    const out = stripVaultSecretsFromLocalStorage({
      masarifi_theme: 'dark',
      masarifi_device_seed: 'uuid-1234',
      masarifi_fallback_key: 'rawkey',
      baseCurrency: 'SAR',
    });
    expect(out).toHaveProperty('masarifi_theme');
    expect(out).toHaveProperty('baseCurrency');
    expect(out).not.toHaveProperty('masarifi_device_seed');
    // Defence in depth: anything naming itself a key is dropped too.
    expect(out).not.toHaveProperty('masarifi_fallback_key');
  });

  it('leaves a backup with no settings table untouched', () => {
    expect(stripVaultSecretsFromRows([])).toEqual([]);
    expect(stripVaultSecretsFromObject({})).toEqual({});
  });
});

describe('the cross-device restore lockout is fixed', () => {
  beforeEach(resetVault);
  afterEach(resetVault);

  it('an exported settings snapshot carries no key envelope', async () => {
    await initializeVaultKey('1111', SALT_A, false);
    await DB.setSetting('baseCurrency', 'SAR');

    // Mirrors collectAllLocalData()'s handling of the settings table.
    const exported = stripVaultSecretsFromRows(
      (await DB.settings.toArray()) as unknown as Record<string, unknown>[]
    );

    const serialized = JSON.stringify(exported);
    expect(serialized).not.toContain(WRAPPED_MDK_KEY);
    expect(serialized).not.toContain('pinHash');
    // Ordinary settings still travel.
    expect(serialized).toContain('baseCurrency');
  });

  it("restoring another device's backup leaves this device's PIN working", async () => {
    // ── Device A ──
    await initializeVaultKey('1111', SALT_A, false);
    await DB.setSetting('pinSalt', SALT_A);
    await DB.setSetting('pinHash', 'hash-of-1111');
    const backupSettings = stripVaultSecretsFromRows(
      (await DB.settings.toArray()) as unknown as Record<string, unknown>[]
    );

    // ── Device B, its own vault ──
    await resetVault();
    await initializeVaultKey('2222', SALT_B, false);
    await DB.setSetting('pinSalt', SALT_B);
    await DB.setSetting('pinHash', 'hash-of-2222');
    const localEnvelope = await DB.getSetting(WRAPPED_MDK_KEY);

    // ── Restore A's backup onto B, as performRestore does ──
    const preserved = new Map<string, unknown>();
    for (const k of VAULT_SECRET_KEYS) preserved.set(k, await DB.getSetting(k));

    await DB.settings.clear();
    for (const row of backupSettings) {
      const r = row as { key?: string; value?: unknown };
      if (r.key) await DB.settings.put({ id: r.key, key: r.key, value: r.value } as never);
    }
    for (const [k, v] of preserved) {
      if (v !== undefined && v !== null) {
        await DB.settings.put({ id: k, key: k, value: v } as never);
      }
    }

    // Device B's own envelope and PIN survived the restore intact.
    expect(await DB.getSetting(WRAPPED_MDK_KEY)).toBe(localEnvelope);
    expect(await DB.getSetting('pinSalt')).toBe(SALT_B);
    expect(await DB.getSetting('pinHash')).toBe('hash-of-2222');

    // And the user can still unlock with the PIN they actually know.
    clearEncryptionKey();
    const key = await unlockVault('2222', SALT_B);
    expect(key).not.toBeNull();
    expect(getEncryptionKey()).not.toBeNull();
  });

  it("the source device's PIN does NOT unlock the restored device", async () => {
    // The complement of the test above: no key material leaked across.
    await initializeVaultKey('1111', SALT_A, false);
    await resetVault();
    await initializeVaultKey('2222', SALT_B, false);

    clearEncryptionKey();
    expect(await unlockVault('1111', SALT_A)).toBeNull();
    expect(getEncryptionKey()).toBeNull();
  });

  it('restoring a backup that maliciously contains an envelope cannot hijack the vault', async () => {
    // An attacker-supplied backup file is just JSON; it can name any key.
    await initializeVaultKey('2222', SALT_B, false);
    const genuineEnvelope = await DB.getSetting(WRAPPED_MDK_KEY);

    const hostile = [
      { id: WRAPPED_MDK_KEY, key: WRAPPED_MDK_KEY, value: 'ATTACKER-CONTROLLED' },
      { id: 'pinHash', key: 'pinHash', value: 'attacker-hash' },
      { id: 'baseCurrency', key: 'baseCurrency', value: 'USD' },
    ];

    const sanitized = stripVaultSecretsFromRows(hostile);
    for (const row of sanitized) {
      await DB.settings.put({ id: row.key, key: row.key, value: row.value } as never);
    }

    expect(await DB.getSetting(WRAPPED_MDK_KEY)).toBe(genuineEnvelope);
    expect(await DB.getSetting('pinHash')).not.toBe('attacker-hash');
    // The benign part of the backup still applied.
    expect(await DB.getSetting('baseCurrency')).toBe('USD');
  });
});
