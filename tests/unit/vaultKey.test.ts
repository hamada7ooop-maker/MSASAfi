import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  initializeVaultKey,
  unlockVault,
  rewrapVaultKey,
  clearVaultKey,
  hasWrappedKey,
  migrateLegacyVault,
  WRAPPED_MDK_KEY,
} from '@/core/security/vaultKey';
import {
  deriveMasterKey,
  setEncryptionKey,
  clearEncryptionKey,
  getEncryptionKey,
  setEncryptionRequired,
  encryptData,
  decryptData,
} from '@/core/security/crypto';
import { db as DB } from '@/core/db/core';

/**
 * Regression tests for envelope encryption (key wrapping).
 *
 * ## The bug
 *
 * The data key was PBKDF2(pin, pinSalt). `handleSavePin` generated a brand-new
 * random salt on every PIN change and re-encrypted nothing, so a new salt
 * meant a new key and every existing encrypted record — across transactions,
 * budgets, goals, debts, bills, accounts, subscriptions, investments,
 * installments, cards, auditLog and chatHistory — became permanently
 * undecryptable. Silent, total, unrecoverable loss of the user's financial
 * history, triggered by a routine security action.
 *
 * ## The invariant these tests protect
 *
 * Data is encrypted under a persistent Master Data Key. The PIN wraps that
 * key and nothing else. Therefore the PIN may change any number of times and
 * previously written ciphertext must remain readable.
 *
 * The last test in this file is the important one: it fails if anyone ever
 * reintroduces `deriveMasterKey(pin, salt)` as the source of the *data* key at
 * an unlock site.
 */

const SALT_A = 'salt_aaaaaaaaaaaaaaaa';
const SALT_B = 'salt_bbbbbbbbbbbbbbbb';
const SALT_C = 'salt_cccccccccccccccc';

async function resetVault() {
  clearEncryptionKey();
  setEncryptionRequired(false);
  await DB.setSetting(WRAPPED_MDK_KEY, null);
  await DB.setSetting('wrappedMDKVersion', null);
}

describe('envelope encryption — PIN changes no longer destroy data', () => {
  beforeEach(resetVault);
  afterEach(resetVault);

  it('keeps data readable after a PIN change', async () => {
    await initializeVaultKey('1111', SALT_A, false);
    const ciphertext = await encryptData({ amount: 1500, description: 'راتب' });

    // User changes their PIN. Under the old scheme this was fatal.
    await rewrapVaultKey('2222', SALT_B);

    // Simulate a lock/relaunch, then unlock with the new PIN.
    clearEncryptionKey();
    const key = await unlockVault('2222', SALT_B);
    expect(key).not.toBeNull();

    await expect(decryptData(ciphertext)).resolves.toEqual({
      amount: 1500,
      description: 'راتب',
    });
  });

  it('keeps data readable after changing the PIN twice in a row', async () => {
    // The explicit acceptance criterion: two consecutive changes.
    await initializeVaultKey('1111', SALT_A, false);
    const ciphertext = await encryptData({ balance: 7290.5 });

    await rewrapVaultKey('2222', SALT_B);
    await rewrapVaultKey('3333', SALT_C);

    clearEncryptionKey();
    const key = await unlockVault('3333', SALT_C);
    expect(key).not.toBeNull();
    await expect(decryptData(ciphertext)).resolves.toEqual({ balance: 7290.5 });
  });

  it('leaves the master data key byte-identical across a PIN change', async () => {
    // Proves no re-encryption is needed: it is literally the same key object's
    // material, only the wrapper changed.
    await initializeVaultKey('1111', SALT_A, false);
    const before = new Uint8Array(await crypto.subtle.exportKey('raw', getEncryptionKey()!));

    await rewrapVaultKey('2222', SALT_B);
    const after = new Uint8Array(await crypto.subtle.exportKey('raw', getEncryptionKey()!));

    expect(Array.from(after)).toEqual(Array.from(before));
  });

  it('stores a wrapper that actually differs after re-wrapping', async () => {
    await initializeVaultKey('1111', SALT_A, false);
    const wrappedBefore = await DB.getSetting<string>(WRAPPED_MDK_KEY);

    await rewrapVaultKey('2222', SALT_B);
    const wrappedAfter = await DB.getSetting<string>(WRAPPED_MDK_KEY);

    expect(wrappedBefore).toBeTruthy();
    expect(wrappedAfter).toBeTruthy();
    expect(wrappedAfter).not.toBe(wrappedBefore);
  });
});

describe('envelope encryption — fail closed', () => {
  beforeEach(resetVault);
  afterEach(resetVault);

  it('refuses to unlock with the wrong PIN and installs no key', async () => {
    await initializeVaultKey('1111', SALT_A, false);
    clearEncryptionKey();

    const key = await unlockVault('9999', SALT_A);
    expect(key).toBeNull();
    // Critical: no key may be installed, otherwise writes would land in
    // plaintext or under a mismatched key.
    expect(getEncryptionKey()).toBeNull();
  });

  it('refuses to unlock when the stored wrapper is corrupt', async () => {
    await initializeVaultKey('1111', SALT_A, false);
    const wrapped = (await DB.getSetting<string>(WRAPPED_MDK_KEY))!;
    // Flip the payload; AES-GCM is authenticated so the tag check must fail.
    await DB.setSetting(WRAPPED_MDK_KEY, wrapped.slice(0, -6) + 'AAAAAA');
    clearEncryptionKey();

    const key = await unlockVault('1111', SALT_A);
    expect(key).toBeNull();
    expect(getEncryptionKey()).toBeNull();
  });

  it('never falls back to deriving the data key from the PIN on failure', async () => {
    // The dangerous fallback: on unwrap failure, derive from the PIN anyway.
    // That key would not match the stored ciphertext, so reads would fail and
    // writes would overwrite good records under the wrong key.
    await initializeVaultKey('1111', SALT_A, false);
    const ciphertext = await encryptData({ secret: 'must stay readable' });
    clearEncryptionKey();

    await unlockVault('9999', SALT_A); // wrong PIN
    expect(getEncryptionKey()).toBeNull();

    // The vault is still intact for the correct PIN.
    const good = await unlockVault('1111', SALT_A);
    expect(good).not.toBeNull();
    await expect(decryptData(ciphertext)).resolves.toEqual({ secret: 'must stay readable' });
  });

  it('refuses to re-wrap when no key is loaded', async () => {
    await initializeVaultKey('1111', SALT_A, false);
    clearEncryptionKey(); // vault locked

    await expect(rewrapVaultKey('2222', SALT_B)).rejects.toThrow(/no master data key is loaded/i);
  });

  it('does not overwrite the stored wrapper when re-wrapping is refused', async () => {
    await initializeVaultKey('1111', SALT_A, false);
    const wrappedBefore = await DB.getSetting<string>(WRAPPED_MDK_KEY);
    clearEncryptionKey();

    await expect(rewrapVaultKey('2222', SALT_B)).rejects.toThrow();

    expect(await DB.getSetting<string>(WRAPPED_MDK_KEY)).toBe(wrappedBefore);
    // And the original PIN still opens the vault.
    expect(await unlockVault('1111', SALT_A)).not.toBeNull();
  });
});

describe('envelope encryption — legacy migration is lossless', () => {
  beforeEach(resetVault);
  afterEach(resetVault);

  it('adopts the existing derived key so pre-migration data stays readable', async () => {
    // Simulate a legacy install: key derived straight from the PIN, data
    // encrypted under it, and no wrapper on disk.
    const legacyKey = await deriveMasterKey('1111', SALT_A);
    setEncryptionKey(legacyKey);
    const legacyCiphertext = await encryptData({ amount: 42, description: 'legacy row' });
    expect(await hasWrappedKey()).toBe(false);

    // First unlock after the upgrade migrates transparently.
    clearEncryptionKey();
    const key = await unlockVault('1111', SALT_A);
    expect(key).not.toBeNull();
    expect(await hasWrappedKey()).toBe(true);

    // The whole point: the old ciphertext is still readable, untouched.
    await expect(decryptData(legacyCiphertext)).resolves.toEqual({
      amount: 42,
      description: 'legacy row',
    });
  });

  it('lets a migrated legacy vault change its PIN without losing data', async () => {
    const legacyKey = await deriveMasterKey('1111', SALT_A);
    setEncryptionKey(legacyKey);
    const legacyCiphertext = await encryptData({ amount: 99 });

    clearEncryptionKey();
    await unlockVault('1111', SALT_A); // migrates
    await rewrapVaultKey('2222', SALT_B); // the previously fatal operation

    clearEncryptionKey();
    await unlockVault('2222', SALT_B);
    await expect(decryptData(legacyCiphertext)).resolves.toEqual({ amount: 99 });
  });

  it('is idempotent — migrating twice does not replace the key', async () => {
    setEncryptionKey(await deriveMasterKey('1111', SALT_A));
    const ciphertext = await encryptData({ v: 1 });
    clearEncryptionKey();

    await unlockVault('1111', SALT_A);
    const firstWrapper = await DB.getSetting<string>(WRAPPED_MDK_KEY);

    // A second call must be a no-op, not a re-initialization.
    const second = await migrateLegacyVault('1111', SALT_A);
    expect(second).toBeNull();
    expect(await DB.getSetting<string>(WRAPPED_MDK_KEY)).toBe(firstWrapper);

    clearEncryptionKey();
    await unlockVault('1111', SALT_A);
    await expect(decryptData(ciphertext)).resolves.toEqual({ v: 1 });
  });

  it('clearVaultKey removes the wrapper so a new PIN starts a fresh envelope', async () => {
    await initializeVaultKey('1111', SALT_A, false);
    expect(await hasWrappedKey()).toBe(true);

    await clearVaultKey();
    expect(await hasWrappedKey()).toBe(false);
  });
});

describe('envelope encryption — the data key is never derived from the PIN', () => {
  beforeEach(resetVault);
  afterEach(resetVault);

  it('produces a data key unrelated to PBKDF2(pin, salt) for new vaults', async () => {
    await initializeVaultKey('1111', SALT_A, false);
    const mdkRaw = new Uint8Array(await crypto.subtle.exportKey('raw', getEncryptionKey()!));

    const derived = await deriveMasterKey('1111', SALT_A, true);
    const derivedRaw = new Uint8Array(await crypto.subtle.exportKey('raw', derived));

    // If these matched, the MDK would just be the PIN-derived key again and a
    // salt rotation would strand the data.
    expect(Array.from(mdkRaw)).not.toEqual(Array.from(derivedRaw));
  });

  it('no unlock site re-derives the data key straight from the PIN', () => {
    // Guards the invariant at the source level. `deriveMasterKey` is legitimate
    // *inside* vaultKey.ts (it builds the KEK, and adopts the legacy key during
    // migration) but must not appear at unlock/PIN-change call sites, where it
    // would silently reintroduce the data-loss bug.
    const callSites = [
      'src/features/auth/components/PinScreen.tsx',
      'src/features/settings/components/cards/SecurityCard.tsx',
      'src/core/onboarding.ts',
    ];

    for (const rel of callSites) {
      const src = readFileSync(resolve(__dirname, '../../', rel), 'utf-8');
      const offending = src
        .split('\n')
        .filter((line) => /deriveMasterKey\s*\(/.test(line) && !line.trim().startsWith('*') && !line.trim().startsWith('//'));
      expect(
        offending,
        `${rel} must unwrap the master data key via vaultKey, not derive it from the PIN`
      ).toEqual([]);
    }
  });

  it('installs the unwrapped key, not the KEK, as the active encryption key', async () => {
    await initializeVaultKey('1111', SALT_A, false);
    const mdkRaw = new Uint8Array(await crypto.subtle.exportKey('raw', getEncryptionKey()!));

    clearEncryptionKey();
    await unlockVault('1111', SALT_A);
    const afterUnlock = new Uint8Array(await crypto.subtle.exportKey('raw', getEncryptionKey()!));

    const kek = await deriveMasterKey('1111', SALT_A, true);
    const kekRaw = new Uint8Array(await crypto.subtle.exportKey('raw', kek));

    expect(Array.from(afterUnlock)).toEqual(Array.from(mdkRaw));
    expect(Array.from(afterUnlock)).not.toEqual(Array.from(kekRaw));
  });
});
