/**
 * Masarifi — vault recovery: post-restore PIN setup and lockout reset.
 *
 * This module exists to close two ways a user can end up unable to reach their
 * own data. Both were found while auditing the envelope-encryption work; each
 * is small in code and severe in effect.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * ## 1. A restore onto a fresh device leaves the data UNENCRYPTED
 *
 * `performRestore` deliberately refuses to import the backup's vault secrets
 * (`wrappedMDK`, `pinHash`, `pinSalt` …) because importing them would hand the
 * target device an envelope its own PIN cannot open — see `core/backupSafety.ts`.
 * That rule is correct and stays.
 *
 * But it has a consequence nobody had followed through. On a *new* device
 * there are no local vault secrets either, so after the restore there is no
 * PIN and no envelope at all. Writes go through the Dexie encryption
 * middleware, which encrypts only when a key is loaded:
 *
 *     if (!isEncryptionKeyReady()) return obj;   // core/db/encryption.ts
 *
 * With no key, that branch returns the record untouched. This was verified
 * against the real database rather than reasoned about: a restored transaction
 * lands on disk as
 *
 *     {"id":"r1","type":"expense","amount":1234,"description":"secret"}
 *
 * with no `_encrypted` envelope. The user's entire financial history is
 * readable by anything that can open IndexedDB. The source device had a PIN;
 * the user believes their data is protected; on the new device it is not.
 *
 * The fix is not to copy the old envelope — that is the bug we already fixed.
 * It is to *require a new PIN on the target device* and, when it is set,
 * encrypt the restored records under a key belonging to this device.
 *
 * ## 2. The brute-force cooldown grows without bound
 *
 * `PinScreen` applies `30s * 2^floor((attempts-5)/5)`. That is sound for a few
 * wrong guesses and absurd beyond that:
 *
 *     50 attempts →   4.3 hours
 *     80 attempts →  11.4 days
 *    100 attempts → 182   days
 *    150 attempts → 186,413 days
 *
 * A child repeatedly tapping the keypad can push a real user past any usable
 * horizon. The cooldown is stored in IndexedDB and survives reinstalling the
 * app, so there is no way out. That is a permanent lockout produced by a
 * defence mechanism, not by an attacker.
 *
 * Throttling must stay — it is the only thing standing between a four-digit
 * PIN and exhaustive search — so the answer is a cap plus an explicit,
 * deliberately expensive escape hatch.
 *
 * ## Why a reset must destroy the data
 *
 * The PIN is not a password checked against a list; it is the material the
 * KEK is derived from, and the KEK is the only thing that unwraps the MDK.
 * Nobody — not the user, not this code — can recover the records without it.
 * Any "reset" that claimed to preserve the data would either be lying or would
 * mean the encryption never protected anything. So `resetVault` is honest
 * about what it is: it clears the vault and the encrypted records, and the
 * caller must warn the user in the strongest terms first.
 */

import { db as DB } from '../db/core';
import { logger } from '../logger';
import {
  clearEncryptionKey,
  setEncryptionRequired,
  isEncryptionKeyReady,
} from './crypto';
import { WRAPPED_MDK_KEY, MDK_VERSION_KEY, initializeVaultKey } from './vaultKey';
import { ENCRYPTED_FIELDS } from '../db/encryption';

// ── Settings keys ───────────────────────────────────────────────────────────

/**
 * Set by a restore, cleared once the user has chosen a PIN for this device.
 * Persisted (not in-memory) because the restore path reloads the page: an
 * in-memory flag would be wiped exactly when it is needed.
 */
export const PENDING_PIN_SETUP_KEY = 'vaultPendingPinSetup';

/** Bookkeeping for the brute-force throttle, shared with PinScreen. */
export const PIN_ATTEMPTS_KEY = 'pinAttempts';
export const PIN_LOCKED_UNTIL_KEY = 'pinLockedUntil';

// ── Lockout policy ──────────────────────────────────────────────────────────

/** Wrong guesses tolerated before the first cooldown. */
export const MAX_ATTEMPTS = 5;

/** First cooldown, doubling every further `MAX_ATTEMPTS` failures. */
export const BASE_COOLDOWN_MS = 30_000;

/**
 * Hard ceiling on a single cooldown: 15 minutes.
 *
 * Chosen so the throttle stays punishing in aggregate while never becoming an
 * effective bricking. At the cap, an attacker gets 5 guesses per 15 minutes =
 * 480/day; exhausting 10,000 four-digit PINs would take about 21 days of
 * uninterrupted attack on a device they physically hold — while a legitimate
 * user who mistyped is never told to come back in six months.
 */
export const MAX_COOLDOWN_MS = 15 * 60_000;

/**
 * Cooldown for a given number of consecutive failures.
 *
 * Returns 0 below the threshold. Growth is exponential, then flat at
 * `MAX_COOLDOWN_MS`. Kept as a pure function so the policy can be tested
 * directly instead of through the UI.
 */
export function cooldownForAttempts(attempts: number): number {
  if (attempts < MAX_ATTEMPTS) return 0;
  const steps = Math.floor((attempts - MAX_ATTEMPTS) / MAX_ATTEMPTS);
  // Cap the exponent before the shift: 2 ** 1024 is Infinity, and
  // Infinity * 30000 is NaN once it meets arithmetic elsewhere.
  //
  // Belt-and-braces, and knowingly so: mutation testing showed no input can
  // distinguish this guard from its absence, because `Math.min` below already
  // clamps long before the exponent could overflow. It is kept because it costs
  // nothing and makes the function total even if the cap is ever raised or
  // removed -- but no test asserts it, since none can fail.
  const growth = steps >= 32 ? Infinity : BASE_COOLDOWN_MS * 2 ** steps;
  return Math.min(growth, MAX_COOLDOWN_MS);
}

// ── 1. Post-restore PIN setup ───────────────────────────────────────────────

/**
 * Mark that a restore has landed and this device still needs its own PIN.
 *
 * Called by the restore path *after* the data is written. Only meaningful when
 * the device has no vault of its own; if the user already has a PIN their
 * existing envelope is intact and the restored records were re-encrypted under
 * it on the way in, so nothing is pending.
 */
export async function markPendingPinSetup(): Promise<void> {
  await DB.setSetting(PENDING_PIN_SETUP_KEY, true);
  logger.info('VaultRecovery', 'Restore completed without a local vault — PIN setup required');
}

/** Whether the user must choose a PIN before the restored data is protected. */
export async function isPinSetupPending(): Promise<boolean> {
  return Boolean(await DB.getSetting<boolean>(PENDING_PIN_SETUP_KEY));
}

/** Clear the flag. Exposed for the completion path and for tests. */
export async function clearPendingPinSetup(): Promise<void> {
  await DB.setSetting(PENDING_PIN_SETUP_KEY, null);
}

/**
 * Decide whether a just-finished restore needs a PIN.
 *
 * A restore is "unprotected" when no envelope exists on this device. Checking
 * the envelope rather than the PIN hash is deliberate: the envelope is what
 * actually encrypts records, and it is the thing `performRestore` refuses to
 * import.
 */
export async function evaluateRestoreProtection(): Promise<boolean> {
  const wrapped = await DB.getSetting<string>(WRAPPED_MDK_KEY);
  if (wrapped) return false;
  await markPendingPinSetup();
  return true;
}

/**
 * Tables holding fields the middleware encrypts, in a stable order.
 * Derived from `ENCRYPTED_FIELDS` so the two can never drift apart.
 */
function encryptedTableNames(): string[] {
  // `auditLog` is deliberately excluded.
  //
  // `DB.setSetting` records an audit entry for almost every key it writes, and
  // it does so WITHOUT awaiting the write (schema.ts fires `.catch(silentFail)`
  // and moves on). So an audit insert is frequently still in flight while this
  // runs — and both `initializeVaultKey` and the pending-setup flag call
  // `setSetting` immediately beforehand. Holding `auditLog` in a long write
  // transaction while a detached write targets the same store produced a
  // reproducible InvalidStateError.
  //
  // Leaving it out costs nothing that matters: audit rows are local-only
  // breadcrumbs, already pruned to 30 days, and every subsequent entry is
  // written under the new key anyway. The financial tables are what must be
  // protected, and they all remain in scope.
  return Object.keys(ENCRYPTED_FIELDS).filter((n) => n !== 'auditLog');
}

/**
 * Rewrite every record in the encrypted tables so it is stored under the
 * currently-loaded key.
 *
 * Restored rows were written while no key was loaded, so they are sitting in
 * plaintext. A `put` of the same object now passes through `_encryptRecord`
 * with a key present and comes back out enveloped. Reading first and writing
 * second is safe in either direction: an already-encrypted row decrypts on
 * read and re-encrypts on write to the same value.
 *
 * Returns the number of records rewritten, which the caller can log or show.
 * Runs inside one transaction so an interruption cannot leave half the vault
 * in plaintext.
 */
export async function encryptExistingRecords(): Promise<number> {
  if (!isEncryptionKeyReady()) {
    throw new Error('[VaultRecovery] Refusing to encrypt records: no key is loaded');
  }

  const candidates = encryptedTableNames().filter((n) =>
    DB.tables.some((t) => t.name === n)
  );

  // Only lock the tables that actually hold rows. Most installations leave
  // several of these empty, and an empty table contributes nothing but a
  // wider lock and a pointless read.
  //
  // (While building this, an over-broad transaction also appeared to trigger
  // InvalidStateError. That turned out to be a symptom of a real defect in the
  // encryption middleware — it awaited WebCrypto inside a Dexie transaction
  // without `Dexie.waitFor`, so the transaction could auto-commit mid-flight.
  // That is fixed at the source in core/db/encryption.ts; this narrowing is
  // kept purely because it is the right scope, not as a workaround.)
  const names: string[] = [];
  for (const n of candidates) {
    if ((await DB.table(n).count()) > 0) names.push(n);
  }
  if (!names.length) {
    logger.info('VaultRecovery', 'No records to encrypt');
    return 0;
  }

  const tables = names.map((n) => DB.table(n));
  let count = 0;

  await DB.transaction('rw', tables, async () => {
    for (const table of tables) {
      const rows = await table.toArray();
      if (!rows.length) continue;
      // bulkPut rather than per-row put: one middleware pass per batch and a
      // single write to the object store.
      await table.bulkPut(rows);
      count += rows.length;
    }
  });

  logger.info('VaultRecovery', `Encrypted ${count} restored record(s) under this device's key`);
  return count;
}

/**
 * Complete the post-restore flow: create this device's envelope from the PIN
 * the user just chose, then encrypt the restored records under it.
 *
 * `adoptExistingKey` is false because the restored records are in plaintext —
 * there is no prior ciphertext whose key must be preserved. A fresh random MDK
 * is the correct choice, and `encryptExistingRecords` then brings every record
 * under it.
 *
 * The flag is cleared only after both steps succeed, so an interrupted attempt
 * is retried on next launch instead of leaving the data silently unprotected.
 */
export async function completePostRestorePinSetup(
  pin: string,
  salt: string
): Promise<number> {
  await initializeVaultKey(pin, salt, /* adoptExistingKey */ false);
  const encrypted = await encryptExistingRecords();
  await clearPendingPinSetup();
  logger.info('VaultRecovery', 'Post-restore vault setup complete');
  return encrypted;
}

// ── 2. Lockout reset ────────────────────────────────────────────────────────

/** Current throttle state. */
export async function getLockoutState(): Promise<{ attempts: number; lockedUntil: number }> {
  const [attempts, lockedUntil] = await Promise.all([
    DB.getSetting(PIN_ATTEMPTS_KEY),
    DB.getSetting(PIN_LOCKED_UNTIL_KEY),
  ]);
  return {
    attempts: Number(attempts) || 0,
    lockedUntil: Number(lockedUntil) || 0,
  };
}

/** Persist throttle state. */
export async function setLockoutState(attempts: number, lockedUntil: number): Promise<void> {
  await Promise.all([
    DB.setSetting(PIN_ATTEMPTS_KEY, attempts),
    DB.setSetting(PIN_LOCKED_UNTIL_KEY, lockedUntil),
  ]);
}

/** Clear the throttle. Used after a correct PIN and by `resetVault`. */
export async function clearLockout(): Promise<void> {
  await setLockoutState(0, 0);
}

/** Whether a cooldown is currently in force. */
export async function isLockedOut(now: number = Date.now()): Promise<boolean> {
  const { lockedUntil } = await getLockoutState();
  return lockedUntil > now;
}

/** Seconds left on the current cooldown, 0 when not locked out. */
export async function remainingLockoutSeconds(now: number = Date.now()): Promise<number> {
  const { lockedUntil } = await getLockoutState();
  return lockedUntil > now ? Math.ceil((lockedUntil - now) / 1000) : 0;
}

/**
 * Record one failed attempt and apply the capped cooldown.
 * Returns the new state so the caller can render it without a second read.
 */
export async function registerFailedAttempt(
  now: number = Date.now()
): Promise<{ attempts: number; lockedUntil: number; cooldownMs: number }> {
  const { attempts, lockedUntil } = await getLockoutState();
  const next = attempts + 1;
  const cooldownMs = cooldownForAttempts(next);
  const nextLockedUntil = cooldownMs > 0 ? now + cooldownMs : lockedUntil;
  await setLockoutState(next, nextLockedUntil);
  return { attempts: next, lockedUntil: nextLockedUntil, cooldownMs };
}

/**
 * The escape hatch: destroy the vault and everything it protects, returning
 * the app to a clean first-run state.
 *
 * **This deletes the user's financial records.** It cannot do otherwise; see
 * the module header. Callers must obtain an explicit, unambiguous confirmation
 * first — this function does not prompt.
 *
 * Order matters. The encrypted tables are cleared *before* the envelope, so an
 * interruption can never leave unreadable ciphertext behind with no key to
 * open it. Clearing the key material first would create exactly the orphaned
 * state this whole module exists to prevent.
 */
export async function resetVault(): Promise<void> {
  logger.warn('VaultRecovery', 'Vault reset requested — clearing encrypted data and key material');

  const candidates = encryptedTableNames().filter((n) => DB.tables.some((t) => t.name === n));

  // Same scoping rule as `encryptExistingRecords`: only touch tables that
  // hold something. See the comment there for why an over-broad transaction
  // is a liability and not merely wasted work.
  const names: string[] = [];
  for (const n of candidates) {
    if ((await DB.table(n).count()) > 0) names.push(n);
  }

  // 1. Unreadable data goes first.
  if (names.length) {
    const tables = names.map((n) => DB.table(n));
    await DB.transaction('rw', tables, async () => {
      for (const table of tables) await table.clear();
    });
  }

  // 2. Then the key material and the lock.
  await DB.setSetting(WRAPPED_MDK_KEY, null);
  await DB.setSetting(MDK_VERSION_KEY, null);
  await DB.setSetting('pinHash', null);
  await DB.setSetting('pinSalt', null);
  await DB.setSetting('pin', null);
  await clearPendingPinSetup();
  await clearLockout();

  // 3. Drop the in-memory key and stop requiring one, so the app is usable
  //    again immediately without a reload.
  clearEncryptionKey();
  setEncryptionRequired(false);

  logger.warn('VaultRecovery', 'Vault reset complete — app returned to first-run state');
}
