/**
 * Masarifi — what a backup may and may not carry.
 *
 * ## The defect this exists to prevent
 *
 * Local backup collects every IndexedDB table with `table.toArray()`. Two
 * consequences went unnoticed when envelope encryption was introduced:
 *
 * **1. The backup carried the vault's own key material.** `wrappedMDK` and
 * `wrappedMDKVersion` live in the `settings` table, so they were exported with
 * everything else — and `performRestore` wrote them back over the target
 * device's own values, together with `pinHash`/`pinSalt`. Restoring a backup
 * from another device therefore replaced the local key envelope with a foreign
 * one. Reproduced end to end:
 *
 *     unlock with this device's PIN  → FAILS  (user locked out of their app)
 *     unlock with the source PIN     → succeeds, but records read back empty
 *
 * A routine restore could lock a user out of their own finances. This was a
 * regression introduced by the envelope work itself: before it, there was no
 * key envelope to copy.
 *
 * **2. Export decrypts on the way out.** The Dexie middleware decrypts on read,
 * so `toArray()` yields plaintext `amount` and `description`. An "unencrypted
 * backup" of an encrypted vault wrote the user's entire financial history to a
 * file in clear text, defeating the encryption it sits behind.
 *
 * ## The rules
 *
 * - Vault secrets are never exported and never restored. They are properties
 *   of *this installation*, not of the data.
 * - A vault protected by a PIN may not be exported without a password.
 *
 * After a restore the records are re-encrypted under the target device's own
 * key, because the restore path writes through the same middleware. That is
 * what makes a cross-device restore work at all — provided the local envelope
 * is left alone, which is rule one.
 */

import { WRAPPED_MDK_KEY, MDK_VERSION_KEY } from './security/vaultKey';

/**
 * Settings keys that must never leave this device, and must never be
 * overwritten by a restore.
 *
 * `wrappedMDK` / `wrappedMDKVersion` — the key envelope. Copying it hands the
 *   target device an envelope its own PIN cannot open.
 * `pinHash` / `pinSalt` / `pin` — the local lock. Restoring them would change
 *   the PIN out from under the user, silently, to one they may not know.
 * Secure-store bookkeeping — device-scoped, meaningless elsewhere.
 */
export const VAULT_SECRET_KEYS: readonly string[] = [
  WRAPPED_MDK_KEY,
  MDK_VERSION_KEY,
  'pinHash',
  'pinSalt',
  'pin',
  'apiKeysMigratedToSecureStore',
  'masarifi_device_seed',
];

/** True when `key` identifies vault/device key material. */
export function isVaultSecretKey(key: unknown): boolean {
  return typeof key === 'string' && VAULT_SECRET_KEYS.includes(key);
}

/**
 * Remove vault secrets from an array of `settings` rows before export.
 *
 * Rows are matched on both `key` and `id`, since the settings table uses the
 * key as its primary key and older rows may carry only one of the two.
 */
export function stripVaultSecretsFromRows<T extends Record<string, unknown>>(rows: T[]): T[] {
  if (!Array.isArray(rows)) return rows;
  return rows.filter((row) => !isVaultSecretKey(row?.key) && !isVaultSecretKey(row?.id));
}

/**
 * Remove vault secrets from a plain key/value settings object.
 */
export function stripVaultSecretsFromObject(
  obj: Record<string, unknown>
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj || {})) {
    if (!isVaultSecretKey(k)) out[k] = v;
  }
  return out;
}

/**
 * Remove device-scoped entries from a localStorage snapshot.
 *
 * The export sweeps every `masarifi*` key, which is a prefix match wide enough
 * to pick up key material added later. Filtering here keeps that sweep honest.
 */
export function stripVaultSecretsFromLocalStorage(
  store: Record<string, string>
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(store || {})) {
    if (isVaultSecretKey(k)) continue;
    // Defence in depth: never export anything that names itself a key/token.
    if (/(?:^|_)(?:key|token|secret|hash|salt|mdk|pin)(?:$|_)/i.test(k)) continue;
    out[k] = v;
  }
  return out;
}
