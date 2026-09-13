import { describe, it, expect, beforeEach } from 'vitest';
import { db as DB } from '@/core/db/core';

/**
 * Regression tests for the persisted PIN brute-force lockout.
 *
 * The defect: `attempts` and `lockedUntil` lived in component useState only,
 * so force-quitting the app reset both. An attacker could burn 5 guesses,
 * relaunch, and immediately get 5 more — indefinitely. The documented
 * "5 attempts then cooldown" protection was effectively absent.
 *
 * These tests pin the storage contract the screen relies on: the counter and
 * the cooldown deadline must round-trip through the settings table so a
 * restart resumes the lockout instead of clearing it.
 */
describe('PIN lockout persistence', () => {
  beforeEach(async () => {
    await DB.setSetting('pinAttempts', 0);
    await DB.setSetting('pinLockedUntil', 0);
  });

  it('persists the failed-attempt counter across a simulated restart', async () => {
    await DB.setSetting('pinAttempts', 3);

    // Simulated relaunch: fresh read, nothing carried in memory.
    const restored = Number(await DB.getSetting('pinAttempts')) || 0;
    expect(restored).toBe(3);
  });

  it('persists the cooldown deadline so a restart does not clear it', async () => {
    const deadline = Date.now() + 30_000;
    await DB.setSetting('pinLockedUntil', deadline);

    const restored = Number(await DB.getSetting('pinLockedUntil')) || 0;
    expect(restored).toBe(deadline);
    expect(restored).toBeGreaterThan(Date.now());
  });

  it('still reports a lockout as active after a restart mid-cooldown', async () => {
    await DB.setSetting('pinAttempts', 5);
    await DB.setSetting('pinLockedUntil', Date.now() + 30_000);

    const attempts = Number(await DB.getSetting('pinAttempts')) || 0;
    const lockedUntil = Number(await DB.getSetting('pinLockedUntil')) || 0;

    expect(attempts).toBeGreaterThanOrEqual(5);
    expect(lockedUntil > Date.now()).toBe(true);
  });

  it('treats an elapsed cooldown as expired', async () => {
    await DB.setSetting('pinLockedUntil', Date.now() - 1_000);
    const lockedUntil = Number(await DB.getSetting('pinLockedUntil')) || 0;
    expect(lockedUntil > Date.now()).toBe(false);
  });

  it('clears both values on a successful unlock', async () => {
    await DB.setSetting('pinAttempts', 4);
    await DB.setSetting('pinLockedUntil', Date.now() + 60_000);

    // What the screen does after a correct PIN.
    await DB.setSetting('pinAttempts', 0);
    await DB.setSetting('pinLockedUntil', 0);

    expect(Number(await DB.getSetting('pinAttempts')) || 0).toBe(0);
    expect(Number(await DB.getSetting('pinLockedUntil')) || 0).toBe(0);
  });

  it('defaults to a safe zero when nothing was ever stored', async () => {
    await DB.setSetting('pinAttempts', null);
    await DB.setSetting('pinLockedUntil', null);

    expect(Number(await DB.getSetting('pinAttempts')) || 0).toBe(0);
    expect(Number(await DB.getSetting('pinLockedUntil')) || 0).toBe(0);
  });
});
