import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { db as DB } from '@/core/db/core';
import { clearEncryptionKey, setEncryptionRequired } from '@/core/security/crypto';
import {
  markPendingPinSetup,
  isPinSetupPending,
  clearPendingPinSetup,
} from '@/core/security/vaultRecovery';
import { PostRestorePinGate } from '@/features/auth/components/PostRestorePinGate';

/**
 * The launch-time gate that stops a restored vault from sitting in plaintext.
 *
 * These assert behaviour a user could describe: "after restoring, the app made
 * me set a PIN, and afterwards my data was encrypted." They deliberately check
 * the DATABASE for the `_encrypted` envelope rather than trusting the
 * component's own success message -- the whole class of bug being guarded here
 * is data that looks protected and is not.
 */

async function wipe() {
  clearEncryptionKey();
  setEncryptionRequired(false);
  await DB.transaction('rw', DB.tables, async () => {
    for (const t of DB.tables) await t.clear();
  });
  await new Promise((r) => setTimeout(r, 0));
}

const storedRow = async (id: string) =>
  (await DB.table('transactions').get(id)) as Record<string, unknown> | undefined;

describe('PostRestorePinGate', () => {
  beforeEach(wipe);
  afterEach(cleanup);

  it('stays invisible when no restore is pending', async () => {
    render(<PostRestorePinGate />);
    // Give the async flag check a chance to resolve before asserting absence,
    // otherwise this passes for the wrong reason.
    await new Promise((r) => setTimeout(r, 20));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('appears after a restore has flagged the vault as unprotected', async () => {
    await markPendingPinSetup();
    render(<PostRestorePinGate />);
    expect(await screen.findByRole('dialog')).toBeTruthy();
  });

  it('encrypts the restored records once a PIN is confirmed', async () => {
    // A restored row: written with no key loaded, so it lands in plaintext.
    await DB.transactions.put({
      id: 'r1',
      type: 'expense',
      amount: 1234,
      description: 'salary details',
    } as never);
    expect('_encrypted' in ((await storedRow('r1')) ?? {})).toBe(false);

    await markPendingPinSetup();
    render(<PostRestorePinGate />);
    await screen.findByRole('dialog');

    const user = userEvent.setup();
    const field = screen.getByLabelText(/enter a new pin|أدخل رمز/i);
    await user.type(field, '2468');

    // The same input becomes the confirmation step.
    const confirm = await screen.findByLabelText(/confirm|تأكيد/i);
    await user.type(confirm, '2468');
    await user.click(screen.getByRole('button'));

    // The point of the whole feature: the row is now enveloped on disk.
    await waitFor(async () => {
      expect('_encrypted' in ((await storedRow('r1')) ?? {})).toBe(true);
    });

    // ...and still readable by the app.
    const row = (await storedRow('r1')) as { description?: string };
    expect(row.description).toBe('salary details');

    // The flag is cleared, so the user is not asked again...
    expect(await isPinSetupPending()).toBe(false);

    // ...and the modal actually goes away. Asserting only on the flag let a
    // mutant survive that cleared the database flag but left the blocking
    // dialog on screen -- the user would be permanently stuck behind a modal
    // whose work was already done.
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull();
    });
  });

  it('refuses a mismatched confirmation instead of setting an unknown PIN', async () => {
    await DB.transactions.put({ id: 'r1', type: 'expense', amount: 5 } as never);
    await markPendingPinSetup();
    render(<PostRestorePinGate />);
    await screen.findByRole('dialog');

    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/enter a new pin|أدخل رمز/i), '1111');
    await user.type(await screen.findByLabelText(/confirm|تأكيد/i), '2222');
    await user.click(screen.getByRole('button'));

    // A typo here would be unrecoverable -- the PIN is the only key material --
    // so the gate must not proceed, and must still be blocking.
    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(await isPinSetupPending()).toBe(true);
    expect('_encrypted' in ((await storedRow('r1')) ?? {})).toBe(false);
  });

  it('does not leave a legacy plaintext PIN behind', async () => {
    // Older builds stored `pin` in the clear. Setting a PIN through this path
    // must not resurrect that field.
    await DB.setSetting('pin', '9999');
    await markPendingPinSetup();
    render(<PostRestorePinGate />);
    await screen.findByRole('dialog');

    const user = userEvent.setup();
    await user.type(screen.getByLabelText(/enter a new pin|أدخل رمز/i), '3690');
    await user.type(await screen.findByLabelText(/confirm|تأكيد/i), '3690');
    await user.click(screen.getByRole('button'));

    await waitFor(async () => {
      expect(await DB.getSetting('pinHash')).toBeTruthy();
    });
    expect(await DB.getSetting('pin')).toBeFalsy();
  });

  it('is dismissed for good once the flag is cleared', async () => {
    await markPendingPinSetup();
    await clearPendingPinSetup();
    render(<PostRestorePinGate />);
    await new Promise((r) => setTimeout(r, 20));
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
