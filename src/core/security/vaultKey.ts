/**
 * Masarifi — Envelope encryption (key wrapping) for the local vault.
 *
 * ## The defect this exists to fix
 *
 * Before this module, the AES-GCM key that encrypts the twelve sensitive
 * tables was derived directly from the PIN:
 *
 *     dataKey = PBKDF2(pin, pinSalt, 600_000)
 *
 * `handleSavePin` mints a *fresh random salt* on every PIN change. A new salt
 * yields a completely different key, and nothing re-encrypted the existing
 * rows. So changing the PIN permanently orphaned every encrypted record —
 * transactions, budgets, goals, debts, bills, accounts, subscriptions,
 * investments, installments, cards, the audit log and the chat history. The
 * ciphertext stayed on disk, readable by no one, forever. This was reproduced
 * in a test before the fix and is now pinned by tests/unit/vaultKey.test.ts.
 *
 * ## The fix
 *
 * Standard two-tier envelope encryption, the same shape banks and cloud KMS
 * products use:
 *
 *     KEK (Key Encryption Key) = PBKDF2(pin, pinSalt, 600_000)   — derived
 *     MDK (Master Data Key)    = random 256-bit AES-GCM key      — persistent
 *     stored: wrappedMDK = AES-GCM(MDK, under KEK)
 *
 * Records are encrypted under the **MDK**, which never changes. The PIN only
 * ever protects the wrapper. Changing the PIN therefore means: unwrap the MDK
 * with the old KEK, wrap the same MDK under the new KEK, overwrite one
 * settings row. Zero records are touched, so the operation is O(1), atomic in
 * practice, and cannot half-fail across a large database.
 *
 * ## Migrating existing installations without re-encrypting anything
 *
 * A user who already has data has it encrypted under `PBKDF2(pin, pinSalt)`.
 * Rather than decrypt-and-re-encrypt every row — slow, and catastrophic if
 * interrupted midway — we simply *adopt that derived key as the MDK*:
 *
 *     MDK := PBKDF2(pin, pinSalt)          // the key the data already uses
 *     wrappedMDK := AES-GCM(MDK, under the same key)
 *
 * The bytes protecting the data are unchanged, so every existing record stays
 * readable; what changes is that the key is now stored wrapped instead of
 * being re-derived. From the next PIN change onward, the salt can rotate
 * freely because the MDK is decoupled from it. Migration writes one settings
 * row and reads no table data.
 *
 * ## Fail-closed guarantee
 *
 * `unlockVault` returns null and installs no key if unwrapping fails. It never
 * falls back to deriving a key straight from the PIN, because that fallback is
 * precisely the bug: it would install a key that does not match the stored
 * ciphertext, whereupon the encryption middleware would treat every read as a
 * decryption failure and every subsequent write would overwrite good data
 * under the wrong key. A failed unwrap means "wrong PIN or corrupt wrapper" —
 * the only safe response is to refuse.
 */

import {
  deriveMasterKey,
  generateMasterDataKey,
  encryptKey,
  decryptKey,
  setEncryptionKey,
  setEncryptionRequired,
  getEncryptionKey,
} from './crypto';
import { db as DB } from '../db/core';
import { logger } from '../logger';

/** Settings key holding the base64 AES-GCM-wrapped Master Data Key. */
export const WRAPPED_MDK_KEY = 'wrappedMDK';

/**
 * Settings key recording which envelope scheme produced `wrappedMDK`, so a
 * future change (e.g. Argon2id, or a hardware-backed KEK) can be detected and
 * migrated rather than silently mis-parsed.
 */
export const MDK_VERSION_KEY = 'wrappedMDKVersion';
export const MDK_VERSION = 1;

/**
 * Wrap `mdk` under the KEK derived from (pin, salt) and persist it.
 * Returns the base64 wrapper that was stored.
 */
async function persistWrappedMDK(mdk: CryptoKey, pin: string, salt: string): Promise<string> {
  const kek = await deriveMasterKey(pin, salt);
  const wrapped = await encryptKey(mdk, kek);
  await DB.setSetting(WRAPPED_MDK_KEY, wrapped);
  await DB.setSetting(MDK_VERSION_KEY, MDK_VERSION);
  return wrapped;
}

/**
 * Create the envelope for a brand-new PIN on a vault that has no wrapped key
 * yet, and install the MDK as the active encryption key.
 *
 * `adoptExistingKey` is the migration switch:
 *
 *  - `true`  → the MDK becomes PBKDF2(pin, salt), i.e. exactly the key that
 *              already protects this user's records. Nothing is re-encrypted
 *              and no data can be lost. Used when a PIN already existed.
 *  - `false` → the MDK is freshly random. Used when encryption is being turned
 *              on for the first time and there is no prior ciphertext.
 */
export async function initializeVaultKey(
  pin: string,
  salt: string,
  adoptExistingKey: boolean
): Promise<CryptoKey> {
  const mdk = adoptExistingKey
    ? await deriveMasterKey(pin, salt, /* extractable */ true)
    : await generateMasterDataKey();

  await persistWrappedMDK(mdk, pin, salt);
  setEncryptionKey(mdk);
  setEncryptionRequired(true);

  logger.info(
    'VaultKey',
    adoptExistingKey
      ? 'Envelope initialized by adopting the existing derived key (no re-encryption)'
      : 'Envelope initialized with a fresh random master data key'
  );

  return mdk;
}

/**
 * Migrate a legacy installation — one with a PIN but no `wrappedMDK` — to
 * envelope encryption, in place and without touching a single record.
 *
 * Safe to call on every unlock: it is a no-op once the wrapper exists.
 * Returns the MDK when it performed (or found) a usable envelope, else null.
 */
export async function migrateLegacyVault(pin: string, salt: string): Promise<CryptoKey | null> {
  const existing = await DB.getSetting<string>(WRAPPED_MDK_KEY);
  if (existing) return null; // already migrated; nothing to do

  logger.info('VaultKey', 'Legacy vault detected — adopting derived key as MDK');
  return initializeVaultKey(pin, salt, /* adoptExistingKey */ true);
}

/**
 * Unlock the vault with a PIN: derive the KEK, unwrap the MDK, install it.
 *
 * Migrates legacy installations transparently on first use.
 *
 * Returns the MDK on success. Returns **null** on failure and installs no key
 * — callers must treat null as "do not proceed". It deliberately does not fall
 * back to `deriveMasterKey(pin, salt)`; see the module header.
 */
export async function unlockVault(pin: string, salt: string): Promise<CryptoKey | null> {
  try {
    const wrapped = await DB.getSetting<string>(WRAPPED_MDK_KEY);

    if (!wrapped) {
      // Legacy installation: adopt the already-in-use derived key as the MDK.
      return await migrateLegacyVault(pin, salt);
    }

    const kek = await deriveMasterKey(pin, salt);
    const mdk = await decryptKey(wrapped, kek);

    setEncryptionKey(mdk);
    setEncryptionRequired(true);
    return mdk;
  } catch (e) {
    // AES-GCM is authenticated: a wrong KEK fails the tag check and throws.
    // That means wrong PIN or a tampered/corrupt wrapper. Fail closed.
    logger.error('VaultKey', 'Failed to unwrap master data key — refusing to unlock', e);
    return null;
  }
}

/**
 * Re-wrap the currently-loaded MDK under a new PIN. This is the whole of a
 * PIN change.
 *
 * No record is read, rewritten or re-encrypted: the data key is unchanged, so
 * all existing ciphertext stays valid. Only the wrapper is replaced.
 *
 * It deliberately takes the key from memory rather than asking for the old
 * PIN. Changing the PIN is only reachable from inside an unlocked session, so
 * the correct MDK is already loaded and is by definition the one the data is
 * encrypted under. Re-deriving from a PIN instead would risk installing a key
 * that does not match the ciphertext.
 *
 * Throws when no key is loaded — the caller must abort the PIN change rather
 * than write a wrapper around the wrong key, or leave the vault with a new PIN
 * it cannot open.
 */
export async function rewrapVaultKey(newPin: string, newSalt: string): Promise<void> {
  const mdk = getEncryptionKey();
  if (!mdk) {
    throw new Error(
      '[VaultKey] Refusing to re-wrap: no master data key is loaded (vault locked?)'
    );
  }

  // Guards against a key imported as non-extractable by an older code path;
  // exportKey would throw deep inside encryptKey with a far less obvious
  // message.
  if (!mdk.extractable) {
    throw new Error(
      '[VaultKey] Refusing to re-wrap: the loaded key is not extractable; unlock again to reload it'
    );
  }

  await persistWrappedMDK(mdk, newPin, newSalt);
  setEncryptionKey(mdk);
  setEncryptionRequired(true);

  logger.info('VaultKey', 'Master data key re-wrapped under the new PIN (no records modified)');
}

/**
 * Discard the envelope entirely. Called when the user removes their PIN, after
 * the caller has decrypted the data back to plaintext.
 */
export async function clearVaultKey(): Promise<void> {
  await DB.setSetting(WRAPPED_MDK_KEY, null);
  await DB.setSetting(MDK_VERSION_KEY, null);
}

/** Whether this installation has an envelope-wrapped key on disk. */
export async function hasWrappedKey(): Promise<boolean> {
  return Boolean(await DB.getSetting<string>(WRAPPED_MDK_KEY));
}
