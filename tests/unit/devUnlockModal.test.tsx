/**
 * Directive 19 — Batch 5: characterization of the developer unlock sheet.
 *
 * The ladder's lockModal (9.61%). Pins the DEV gate, the guard branches
 * (empty pass, missing env), the stay-open-on-wrong-pass behavior, and the
 * full success path — a REAL PBKDF2 derivation (600k iterations, SHA-256,
 * 256 bits) computed by the test with the same parameters the component
 * uses, so the constant-time comparison is exercised for real.
 *
 * The backdoorRemoval suite pins the static security shape (tree-shaken
 * from production builds); this suite pins the runtime behavior in DEV.
 */
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DevUnlockModal } from '../../src/features/settings/components/DevUnlockModal';
import { useSettingsStore } from '../../src/store/settingsStore';
import { useAppStore } from '../../src/store/appStore';

const onUnlocked = vi.fn();
const onClose = vi.fn();

const renderModal = (open = true) =>
  render(<DevUnlockModal open={open} onClose={onClose} onUnlocked={onUnlocked} />);

/** Derive the master hash exactly as the component does. */
async function deriveHash(pass: string, salt: string): Promise<string> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw', enc.encode(pass), { name: 'PBKDF2' }, false, ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: enc.encode(salt), iterations: 600000, hash: 'SHA-256' },
    keyMaterial, 256
  );
  return Array.from(new Uint8Array(bits)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

beforeEach(() => {
  onUnlocked.mockClear();
  onClose.mockClear();
  // the test environment defines neither variable by default
  vi.unstubAllEnvs();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('DevUnlockModal — characterization', () => {
  it('renders nothing when closed', () => {
    const { container } = renderModal(false);
    expect(container.firstChild).toBeNull();
  });

  it('renders the dev sheet when open (DEV is true in the test environment)', () => {
    renderModal(true);
    expect(screen.getByText('Developer Mode')).toBeTruthy();
    expect(screen.getByText('terminal')).toBeTruthy();
    expect(screen.getByPlaceholderText('Master passcode...')).toBeTruthy();
  });

  it('cancel closes without touching anything', () => {
    renderModal(true);
    // the cancel button is the flex-1 slate one; confirm is the blue flex-[2]
    const cancel = screen.getByRole('button', { name: /cancel|إلغاء/i });
    fireEvent.click(cancel);
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onUnlocked).not.toHaveBeenCalled();
  });

  it('an empty passcode answers with the error toast and closes', async () => {
    renderModal(true);
    const confirm = screen.getByRole('button', { name: /confirm|تأكيد/i });
    fireEvent.click(confirm);
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(onUnlocked).not.toHaveBeenCalled();
    // the error toast landed on the body (role=alert)
    await waitFor(() => {
      expect(document.body.querySelector('[role="alert"]')).toBeTruthy();
    });
  });

  it('a missing master hash env (undefined) answers with the error toast and closes', async () => {
    vi.stubEnv('VITE_MASTER_HASH', '');
    renderModal(true);
    fireEvent.change(screen.getByPlaceholderText('Master passcode...'), {
      target: { value: 'something' },
    });
    fireEvent.click(screen.getByRole('button', { name: /confirm|تأكيد/i }));
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(onUnlocked).not.toHaveBeenCalled();
  });

  it('a WRONG passcode clears the input but KEEPS the sheet open', async () => {
    const hash = await deriveHash('the-real-pass', 'salt-a');
    vi.stubEnv('VITE_MASTER_HASH', hash);
    vi.stubEnv('VITE_MASTER_SALT', 'salt-a');

    renderModal(true);
    const input = screen.getByPlaceholderText('Master passcode...') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'a-wrong-pass' } });
    fireEvent.click(screen.getByRole('button', { name: /confirm|تأكيد/i }));

    await waitFor(() => expect((screen.getByPlaceholderText('Master passcode...') as HTMLInputElement).value).toBe(''));
    expect(onClose).not.toHaveBeenCalled(); // the sheet stays for another try
    expect(onUnlocked).not.toHaveBeenCalled();
  });

  it('the CORRECT passcode unlocks everything: points, perks, themes, milestones, AI decade', async () => {
    const hash = await deriveHash('the-real-pass', 'salt-a');
    vi.stubEnv('VITE_MASTER_HASH', hash);
    vi.stubEnv('VITE_MASTER_SALT', 'salt-a');

    renderModal(true);
    fireEvent.change(screen.getByPlaceholderText('Master passcode...'), {
      target: { value: 'the-real-pass' },
    });
    fireEvent.click(screen.getByRole('button', { name: /confirm|تأكيد/i }));

    await waitFor(() => expect(onUnlocked).toHaveBeenCalledTimes(1));
    expect(onClose).toHaveBeenCalledTimes(1);

    // the store carries the whole unlock
    expect(useAppStore.getState().userPoints).toBe(99999);
    const rewards = useSettingsStore.getState().unlockedItems as string[];
    expect(rewards).toContain('perk:ai-pro');
    expect(rewards).toContain('palette:oled');
    expect(rewards.length).toBeGreaterThan(15);
    const milestones = useSettingsStore.getState().completedMilestones as string[];
    expect(milestones).toContain('first_txn');
    // AI premium for ~a decade
    const premium = useSettingsStore.getState().aiPremiumUntil as number;
    expect(premium).toBeGreaterThan(Date.now() + 9 * 365 * 24 * 60 * 60 * 1000);

    // success toast on the body
    await waitFor(() => {
      expect(document.body.textContent).toContain('Master mode activated');
    });
  });
});
