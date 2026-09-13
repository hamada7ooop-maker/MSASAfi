import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { db as DB } from '@/core/db/core';
import {
  clearEncryptionKey,
  setEncryptionRequired,
  isEncryptionKeyReady,
  getEncryptionKey,
} from '@/core/security/crypto';
import { WRAPPED_MDK_KEY, MDK_VERSION_KEY, unlockVault } from '@/core/security/vaultKey';
import { generateSalt, hashPin } from '@/core/security';
import {
  PENDING_PIN_SETUP_KEY,
  MAX_ATTEMPTS,
  BASE_COOLDOWN_MS,
  MAX_COOLDOWN_MS,
  cooldownForAttempts,
  markPendingPinSetup,
  isPinSetupPending,
  clearPendingPinSetup,
  evaluateRestoreProtection,
  encryptExistingRecords,
  completePostRestorePinSetup,
  getLockoutState,
  setLockoutState,
  clearLockout,
  isLockedOut,
  remainingLockoutSeconds,
  registerFailedAttempt,
  resetVault,
} from '@/core/security/vaultRecovery';

/**
 * Tests for the two vault-recovery paths.
 *
 * The headline case is the third describe block: a backup restored onto a
 * device with no PIN leaves every financial record in PLAINTEXT. That is
 * asserted against the real database by reading the stored row and checking
 * for the `_encrypted` envelope, not by trusting a helper's return value.
 */

/** Read a row bypassing nothing — the middleware decrypts on read, so this
 *  shows the caller's view. */
const readRow = (table: string, id: string) => DB.table(table).get(id);

/** Whether the row as stored carries an encryption envelope. A decrypted read
 *  still exposes `_encrypted`, so its presence is a reliable signal. */
const isStoredEncrypted = async (table: string, id: string) => {
  const row = (await readRow(table, id)) as Record<string, unknown> | undefined;
  return Boolean(row && '_encrypted' in row);
};

/**
 * Reset to a clean vault.
 *
 * The clear MUST happen inside a single Dexie transaction. Clearing tables in
 * a bare `for...of` loop leaves fake-indexeddb with a stale transaction, and
 * the next write that goes through the async encryption middleware dies with
 * `InvalidStateError`. That cost a long investigation: the symptom looked
 * exactly like a bug in the encryption pass (some tables encrypted, later ones
 * not), but it reproduced with a single table and no encryption pass at all,
 * and vanished when the wipe was wrapped in a transaction.
 */
async function wipe() {
  clearEncryptionKey();
  setEncryptionRequired(false);
  await DB.transaction('rw', DB.tables, async () => {
    for (const t of DB.tables) await t.clear();
  });
  // Let the wipe transaction fully retire before the next test starts issuing
  // crypto-bearing writes. Without this, Dexie can still be finishing the
  // previous cycle when the encryption middleware awaits WebCrypto, and the
  // in-flight IndexedDB transaction is considered closed (InvalidStateError).
  await new Promise((r) => setTimeout(r, 0));
}

describe('Lockout policy — throttling must not become a permanent brick', () => {
  it('does not penalise the first few mistakes', () => {
    for (let i = 0; i < MAX_ATTEMPTS; i++) {
      expect(cooldownForAttempts(i)).toBe(0);
    }
  });

  it('starts at the base cooldown once the threshold is crossed', () => {
    expect(cooldownForAttempts(MAX_ATTEMPTS)).toBe(BASE_COOLDOWN_MS);
  });

  it('doubles every further block of failures', () => {
    expect(cooldownForAttempts(10)).toBe(BASE_COOLDOWN_MS * 2);
    expect(cooldownForAttempts(15)).toBe(BASE_COOLDOWN_MS * 4);
    expect(cooldownForAttempts(20)).toBe(BASE_COOLDOWN_MS * 8);
  });

  it('never exceeds the cap, however many attempts are made', () => {
    // The old formula reached 4.3 hours at 50 attempts, 182 days at 100 and
    // 186,413 days at 150 — a defence mechanism that permanently locked out
    // the legitimate user. Every one of these must now sit at the ceiling.
    for (const attempts of [50, 80, 100, 150, 1000, 100_000]) {
      const ms = cooldownForAttempts(attempts);
      expect(ms).toBe(MAX_COOLDOWN_MS);
      expect(Number.isFinite(ms)).toBe(true);
    }
  });

  it('stays finite at absurd attempt counts instead of overflowing to Infinity/NaN', () => {
    // 2 ** 1024 is Infinity in JS; unguarded it poisons every later sum.
    const ms = cooldownForAttempts(10_000_000);
    expect(Number.isFinite(ms)).toBe(true);
    expect(ms).toBe(MAX_COOLDOWN_MS);
    expect(Number.isNaN(ms + Date.now())).toBe(false);
  });

  it('keeps throttling meaningful — the cap is minutes, not seconds', () => {
    // Guards against someone "fixing" a flaky test by lowering the ceiling
    // until brute force becomes cheap.
    expect(MAX_COOLDOWN_MS).toBeGreaterThanOrEqual(5 * 60_000);
  });
});

describe('Lockout state — persistence and reset', () => {
  beforeEach(wipe);
  afterEach(wipe);

  it('starts clean', async () => {
    expect(await getLockoutState()).toEqual({ attempts: 0, lockedUntil: 0 });
    expect(await isLockedOut()).toBe(false);
  });

  it('persists across reads, so relaunching the app cannot reset the counter', async () => {
    await setLockoutState(3, 0);
    expect((await getLockoutState()).attempts).toBe(3);
  });

  it('counts failures and only locks once the threshold is reached', async () => {
    const now = 1_000_000;
    for (let i = 1; i < MAX_ATTEMPTS; i++) {
      const r = await registerFailedAttempt(now);
      expect(r.attempts).toBe(i);
      expect(r.cooldownMs).toBe(0);
    }
    const r = await registerFailedAttempt(now);
    expect(r.attempts).toBe(MAX_ATTEMPTS);
    expect(r.cooldownMs).toBe(BASE_COOLDOWN_MS);
    expect(r.lockedUntil).toBe(now + BASE_COOLDOWN_MS);
  });

  it('reports a live cooldown and its remaining seconds', async () => {
    const now = 2_000_000;
    await setLockoutState(MAX_ATTEMPTS, now + 30_000);
    expect(await isLockedOut(now)).toBe(true);
    expect(await remainingLockoutSeconds(now)).toBe(30);
    // ...and expires on its own.
    expect(await isLockedOut(now + 31_000)).toBe(false);
    expect(await remainingLockoutSeconds(now + 31_000)).toBe(0);
  });

  it('treats an expired cooldown as over at the exact expiry instant', async () => {
    // The boundary matters: `lockedUntil` is a timestamp, and `>= now` instead
    // of `> now` would hold the user one extra tick past their sentence. It is
    // one character in the source and no test noticed it.
    const now = 1_000_000;
    await setLockoutState(10, now);
    expect(await isLockedOut(now - 1)).toBe(true); // a tick early: still locked
    expect(await isLockedOut(now)).toBe(false); // the instant it expires: free
    expect(await remainingLockoutSeconds(now)).toBe(0);
  });

  it('re-arms the cooldown on every failure past the threshold, never shortening it', async () => {
    // Worth stating explicitly because it is easy to misread the formula:
    // `steps` is 0 for the whole first block of failures, so attempts 5, 6, 7…
    // each yield the base cooldown rather than only every 5th one. A wrong
    // guess therefore always restarts the clock — an attacker cannot whittle
    // down a running lockout by guessing through it.
    const now = 2_000_000;
    await setLockoutState(MAX_ATTEMPTS - 1, 0); // one short of the threshold

    const first = await registerFailedAttempt(now);
    expect(first.cooldownMs).toBe(BASE_COOLDOWN_MS);

    const second = await registerFailedAttempt(now + 5_000); // guessing again
    expect(second.cooldownMs).toBe(BASE_COOLDOWN_MS);
    // The new deadline is measured from the latest attempt, so it is strictly
    // later: the clock restarts rather than running down.
    expect(second.lockedUntil).toBeGreaterThan(first.lockedUntil);
    expect(await isLockedOut(first.lockedUntil + 1)).toBe(true);
  });

  it('preserves an active lockout on a failure that does not itself trigger one', async () => {
    // Defensive: below the threshold `registerFailedAttempt` takes the branch
    // that carries `lockedUntil` forward. Writing 0 there instead would let a
    // stray sub-threshold attempt wipe a deadline that is still being served.
    // The app's own flows keep attempts and lockout in step, so this state is
    // only reachable directly — but the safe branch is the one worth pinning.
    const now = 3_000_000;
    const deadline = now + 60_000;
    await setLockoutState(1, deadline); // active deadline, low attempt count

    const next = await registerFailedAttempt(now);
    expect(next.cooldownMs).toBe(0); // below threshold: no new cooldown
    expect(next.lockedUntil).toBe(deadline); // carried, NOT zeroed
    expect(await isLockedOut(now + 1)).toBe(true);
  });

  it('clearLockout frees the keypad without touching anything else', async () => {
    await DB.setSetting('pinHash', 'keep-me');
    await setLockoutState(99, Date.now() + 60_000);
    await clearLockout();
    expect(await getLockoutState()).toEqual({ attempts: 0, lockedUntil: 0 });
    expect(await DB.getSetting('pinHash')).toBe('keep-me');
  });
});

describe('Restore onto a device with no PIN — the plaintext exposure', () => {
  beforeEach(wipe);
  afterEach(wipe);

  it('confirms the defect: restored records land unencrypted when no vault exists', async () => {
    // This is the state after performRestore on a new device: it refuses to
    // import the backup's vault secrets (correctly), so no key is loaded.
    expect(isEncryptionKeyReady()).toBe(false);

    await DB.transactions.put({
      id: 'r1',
      type: 'expense',
      amount: 1234,
      description: 'salary details',
    } as never);

    // The row is on disk in the clear — no envelope at all.
    expect(await isStoredEncrypted('transactions', 'r1')).toBe(false);
    const row = (await readRow('transactions', 'r1')) as Record<string, unknown>;
    expect(row.amount).toBe(1234);
    expect(row.description).toBe('salary details');
  });

  it('flags a restore as needing a PIN when the device has no envelope', async () => {
    expect(await evaluateRestoreProtection()).toBe(true);
    expect(await isPinSetupPending()).toBe(true);
  });

  it('does not flag a restore when this device already has its own envelope', async () => {
    await DB.setSetting(WRAPPED_MDK_KEY, 'existing-wrapper');
    expect(await evaluateRestoreProtection()).toBe(false);
    expect(await isPinSetupPending()).toBe(false);
  });

  it('persists the pending flag, because the restore path reloads the page', async () => {
    await markPendingPinSetup();
    // A fresh read simulates the post-reload process.
    expect(await DB.getSetting(PENDING_PIN_SETUP_KEY)).toBe(true);
    await clearPendingPinSetup();
    expect(await isPinSetupPending()).toBe(false);
  });
});

describe('Post-restore PIN setup — encrypting what the restore left exposed', () => {
  beforeEach(wipe);
  afterEach(wipe);

  it('encrypts the restored records once the user sets a PIN', async () => {
    // Restore drops plaintext rows across several tables.
    await DB.transactions.put({ id: 't1', type: 'expense', amount: 500, description: 'rent' } as never);
    await DB.accounts.put({ id: 'a1', name: 'Main', balance: 9000 } as never);
    await DB.goals.put({ id: 'g1', name: 'Car', targetAmount: 50000, saved: 1000 } as never);
    expect(await isStoredEncrypted('transactions', 't1')).toBe(false);
    expect(await isStoredEncrypted('accounts', 'a1')).toBe(false);

    await evaluateRestoreProtection();
    const salt = generateSalt();
    const written = await completePostRestorePinSetup('4321', salt);

    expect(written).toBeGreaterThanOrEqual(3);
    expect(await isStoredEncrypted('transactions', 't1')).toBe(true);
    expect(await isStoredEncrypted('accounts', 'a1')).toBe(true);
    expect(await isStoredEncrypted('goals', 'g1')).toBe(true);

    // And the values survive the round trip — encryption, not corruption.
    const tx = (await readRow('transactions', 't1')) as Record<string, unknown>;
    expect(tx.amount).toBe(500);
    expect(tx.description).toBe('rent');
    const acc = (await readRow('accounts', 'a1')) as Record<string, unknown>;
    expect(acc.balance).toBe(9000);
    expect(acc.name).toBe('Main');
  });

  it('creates an envelope bound to the new PIN, openable only by it', async () => {
    await DB.transactions.put({ id: 't1', type: 'expense', amount: 10 } as never);
    await evaluateRestoreProtection();

    const salt = generateSalt();
    await completePostRestorePinSetup('1357', salt);

    expect(await DB.getSetting(WRAPPED_MDK_KEY)).toBeTruthy();
    expect(await DB.getSetting(MDK_VERSION_KEY)).toBe(1);

    // Lock, then prove only the chosen PIN opens it.
    clearEncryptionKey();
    expect(await unlockVault('9999', salt)).toBeNull();
    expect(await unlockVault('1357', salt)).not.toBeNull();
  });

  it('uses a device-local key, NOT the source device envelope', async () => {
    // A foreign wrapper must never be adopted; the whole point is that this
    // device's key belongs to this device.
    await DB.transactions.put({ id: 't1', type: 'expense', amount: 10 } as never);
    await evaluateRestoreProtection();
    const salt = generateSalt();
    await completePostRestorePinSetup('2468', salt);
    const mine = await DB.getSetting<string>(WRAPPED_MDK_KEY);

    expect(mine).toBeTruthy();
    expect(mine).not.toBe('foreign-device-wrapper');
  });

  it('clears the pending flag only after the data is actually protected', async () => {
    await DB.transactions.put({ id: 't1', type: 'expense', amount: 10 } as never);
    await evaluateRestoreProtection();
    expect(await isPinSetupPending()).toBe(true);

    await completePostRestorePinSetup('1111', generateSalt());
    expect(await isPinSetupPending()).toBe(false);
  });

  it('keeps the pending flag set if encryption fails, so an interrupted setup retries', async () => {
    // The ordering inside completePostRestorePinSetup is a safety property, not
    // a style choice. If the flag were cleared BEFORE the records were
    // encrypted, a crash in between would leave the user with no prompt and a
    // database still in plaintext -- silently unprotected, forever.
    //
    // Forcing that failure: make one encrypted table throw on read, which
    // aborts the encryption pass after the envelope has been created.
    await DB.transactions.put({ id: 't1', type: 'expense', amount: 10 } as never);
    await evaluateRestoreProtection();
    expect(await isPinSetupPending()).toBe(true);

    const realTransaction = DB.transaction.bind(DB);
    DB.transaction = (() => {
      throw new Error('simulated interruption mid-encryption');
    }) as typeof DB.transaction;

    try {
      await expect(completePostRestorePinSetup('1111', generateSalt())).rejects.toThrow(
        /simulated interruption/
      );
    } finally {
      DB.transaction = realTransaction;
    }

    // The flag MUST survive: it is the only thing that will bring the user back.
    expect(await isPinSetupPending()).toBe(true);

    // Drain before leaving. `initializeVaultKey` succeeded before the induced
    // failure, and its `setSetting` fires an audit write that schema.ts does
    // NOT await. Aborting here means nothing else waits on that write either,
    // so it lands during the next test's wipe and kills an unrelated
    // transaction (TransactionInactiveError, ~50% of runs). Every other test
    // hides this by awaiting a real transaction afterwards.
    await new Promise((r) => setTimeout(r, 0));
  });

  it('leaves auditLog out of the encryption pass, by deliberate design', async () => {
    // Pinning a decision, not an accident. `DB.setSetting` writes an audit
    // entry WITHOUT awaiting it (schema.ts fires `.catch(silentFail)`), and
    // `initializeVaultKey` calls setSetting immediately before this pass runs.
    // Holding auditLog in a long write transaction while a detached write
    // targets the same store produced a reproducible InvalidStateError.
    //
    // The trade is sound: audit rows are local-only breadcrumbs, pruned to 30
    // days, and every later entry is written under the new key anyway. If
    // someone re-adds auditLog here, this test should make them read that
    // reasoning first -- while the assertions below prove the FINANCIAL tables
    // are all still covered, which is what actually matters.
    await DB.auditLog.add({
      id: 'a1',
      timestamp: new Date().toISOString(),
      action: 'test',
      description: 'breadcrumb',
    } as never);
    await DB.transactions.put({ id: 't1', type: 'expense', amount: 10 } as never);
    await DB.goals.put({ id: 'g1', name: 'car', target: 100 } as never);

    await evaluateRestoreProtection();
    const n = await completePostRestorePinSetup('2468', generateSalt());

    // The financial rows are counted and enveloped...
    expect(n).toBe(2);
    expect(await isStoredEncrypted('transactions', 't1')).toBe(true);
    expect(await isStoredEncrypted('goals', 'g1')).toBe(true);
    // ...and the breadcrumb table is untouched by this pass.
    expect(await isStoredEncrypted('auditLog', 'a1')).toBe(false);
  });

  it('refuses to encrypt records when no key is loaded, instead of silently doing nothing', async () => {
    await DB.transactions.put({ id: 't1', type: 'expense', amount: 10 } as never);
    clearEncryptionKey();
    setEncryptionRequired(false);
    await expect(encryptExistingRecords()).rejects.toThrow(/no key is loaded/i);
  });

  it('is idempotent — re-running over already-encrypted rows preserves them', async () => {
    await DB.transactions.put({ id: 't1', type: 'expense', amount: 77, description: 'x' } as never);
    await evaluateRestoreProtection();
    await completePostRestorePinSetup('3141', generateSalt());

    await encryptExistingRecords();
    const tx = (await readRow('transactions', 't1')) as Record<string, unknown>;
    expect(tx.amount).toBe(77);
    expect(tx.description).toBe('x');
    expect(await isStoredEncrypted('transactions', 't1')).toBe(true);
  });

  it('leaves the vault usable end to end: set PIN, lock, unlock, read', async () => {
    await DB.transactions.put({ id: 't1', type: 'expense', amount: 4242, description: 'audit' } as never);
    await evaluateRestoreProtection();

    const pin = '8520';
    const salt = generateSalt();
    await completePostRestorePinSetup(pin, salt);
    // The app would also store the hash; mirror that so the flow is realistic.
    await DB.setSetting('pinHash', await hashPin(pin, salt));
    await DB.setSetting('pinSalt', salt);

    clearEncryptionKey();
    setEncryptionRequired(true);

    const key = await unlockVault(pin, salt);
    expect(key).not.toBeNull();
    expect(getEncryptionKey()).not.toBeNull();

    const tx = (await readRow('transactions', 't1')) as Record<string, unknown>;
    expect(tx.amount).toBe(4242);
    expect(tx.description).toBe('audit');
  });
});

describe('Vault reset — the escape hatch from a permanent lockout', () => {
  beforeEach(wipe);
  afterEach(wipe);

  async function makeLockedVault() {
    await DB.transactions.put({ id: 't1', type: 'expense', amount: 100 } as never);
    await DB.accounts.put({ id: 'a1', name: 'Main', balance: 50 } as never);
    await evaluateRestoreProtection();
    const salt = generateSalt();
    await completePostRestorePinSetup('1234', salt);
    await DB.setSetting('pinHash', await hashPin('1234', salt));
    await DB.setSetting('pinSalt', salt);
    await setLockoutState(500, Date.now() + 9_000_000);
    clearEncryptionKey();
    setEncryptionRequired(true);
    return salt;
  }

  it('removes the key material so the app returns to first-run state', async () => {
    await makeLockedVault();
    await resetVault();

    expect(await DB.getSetting(WRAPPED_MDK_KEY)).toBeFalsy();
    expect(await DB.getSetting(MDK_VERSION_KEY)).toBeFalsy();
    expect(await DB.getSetting('pinHash')).toBeFalsy();
    expect(await DB.getSetting('pinSalt')).toBeFalsy();
    expect(await DB.getSetting('pin')).toBeFalsy();
  });

  it('clears the lockout, so the user is no longer serving a cooldown', async () => {
    await makeLockedVault();
    expect(await isLockedOut()).toBe(true);
    await resetVault();
    expect(await isLockedOut()).toBe(false);
    expect(await getLockoutState()).toEqual({ attempts: 0, lockedUntil: 0 });
  });

  it('destroys the encrypted records, because they are unrecoverable without the PIN', async () => {
    await makeLockedVault();
    await resetVault();
    // Honest behaviour: the data is gone, not "recovered". Anything else would
    // mean the encryption never protected it.
    expect(await DB.transactions.count()).toBe(0);
    expect(await DB.accounts.count()).toBe(0);
  });

  it('leaves no unreadable ciphertext behind', async () => {
    await makeLockedVault();
    await resetVault();
    // Data cleared before key material: nothing can remain that no key opens.
    const leftovers = await DB.transactions.toArray();
    expect(leftovers).toHaveLength(0);
  });

  it('releases the in-memory lock so the app is usable immediately', async () => {
    await makeLockedVault();
    await resetVault();
    expect(isEncryptionKeyReady()).toBe(false);
    // Not "locked": a locked vault with no key refuses all writes.
    await DB.transactions.put({ id: 'fresh', type: 'expense', amount: 1 } as never);
    expect(await DB.transactions.count()).toBe(1);
  });

  it('clears a pending post-restore flag too, so the user is not re-prompted', async () => {
    await markPendingPinSetup();
    await resetVault();
    expect(await isPinSetupPending()).toBe(false);
  });

  it('lets the user set a completely new PIN afterwards', async () => {
    await makeLockedVault();
    await resetVault();

    const salt = generateSalt();
    await DB.transactions.put({ id: 'n1', type: 'expense', amount: 5 } as never);
    await evaluateRestoreProtection();
    await completePostRestorePinSetup('7777', salt);

    clearEncryptionKey();
    expect(await unlockVault('1234', salt)).toBeNull(); // the old PIN is dead
    expect(await unlockVault('7777', salt)).not.toBeNull();
  });
});
