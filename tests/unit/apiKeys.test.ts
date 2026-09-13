import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * Regression tests for secure API-key storage (audit finding H-2, part c).
 *
 * ## The defect
 *
 * Four user-supplied market-data API keys — goldApiKey, exchangeRateApiKey,
 * currentsApiKey, fredApiKey — were written with DB.setSetting into the Dexie
 * `settings` table. That table is not in ENCRYPTED_FIELDS, so the keys sat in
 * IndexedDB in plaintext, readable by anything with access to the app's data
 * directory and included verbatim in any export of that table.
 *
 * The inconsistency gave it away: geminiApiKey and groqApiKey already went
 * through secureStore. Two classes of the same secret, handled two ways.
 *
 * ## The property that matters most
 *
 * Migrating is not enough. If the migration copies a key into secure storage
 * but leaves the plaintext original behind, the exposure is untouched and the
 * fix is theatre. Several tests below exist specifically to assert the
 * plaintext copy is *gone*.
 */

const secureStore = new Map<string, string>();
const secureSet = vi.fn(async (k: string, v: string) => {
  secureStore.set(k, v);
  return true;
});
const secureGet = vi.fn(async (k: string) => secureStore.get(k) ?? null);
const secureRemove = vi.fn(async (k: string) => {
  secureStore.delete(k);
});

vi.mock('@/core/secureStore', () => ({
  secureSet: (k: string, v: string) => secureSet(k, v),
  secureGet: (k: string) => secureGet(k),
  secureRemove: (k: string) => secureRemove(k),
}));

import { db as DB } from '@/core/db/core';
import {
  getApiKey,
  setApiKey,
  migrateApiKeysToSecureStore,
  MARKET_API_KEYS,
} from '@/core/apiKeys';

async function resetAll() {
  secureStore.clear();
  secureSet.mockClear();
  secureGet.mockClear();
  secureRemove.mockClear();
  for (const k of MARKET_API_KEYS) await DB.setSetting(k, null);
  await DB.setSetting('apiKeysMigratedToSecureStore', null);
}

describe('API keys are stored securely, never in the settings table', () => {
  beforeEach(resetAll);

  it('covers exactly the four keys the audit flagged', () => {
    expect([...MARKET_API_KEYS].sort()).toEqual(
      ['currentsApiKey', 'exchangeRateApiKey', 'fredApiKey', 'goldApiKey'].sort()
    );
  });

  it('writes to secure storage and leaves no plaintext copy', async () => {
    await setApiKey('goldApiKey', 'gold-secret-123');

    expect(secureStore.get('goldApiKey')).toBe('gold-secret-123');
    // The whole point: nothing readable in the unencrypted settings table.
    expect(await DB.getSetting('goldApiKey')).toBeFalsy();
  });

  it('reads back what it stored', async () => {
    await setApiKey('fredApiKey', 'fred-abc');
    expect(await getApiKey('fredApiKey')).toBe('fred-abc');
  });

  it('trims whitespace before storing', async () => {
    await setApiKey('currentsApiKey', '  news-key  ');
    expect(await getApiKey('currentsApiKey')).toBe('news-key');
  });

  it('clears from both stores when given an empty value', async () => {
    await setApiKey('goldApiKey', 'temp');
    await setApiKey('goldApiKey', '');

    expect(await getApiKey('goldApiKey')).toBeNull();
    expect(secureStore.has('goldApiKey')).toBe(false);
    expect(await DB.getSetting('goldApiKey')).toBeFalsy();
  });

  it('reports failure instead of silently losing the key', async () => {
    secureSet.mockResolvedValueOnce(false);
    const ok = await setApiKey('goldApiKey', 'will-fail');
    expect(ok).toBe(false);
  });

  it('does not delete a pre-existing plaintext key when the secure write fails', async () => {
    // Otherwise a keystore outage would destroy the user's key outright.
    await DB.setSetting('goldApiKey', 'existing-plaintext');
    secureSet.mockResolvedValueOnce(false);

    await setApiKey('goldApiKey', 'new-value');

    expect(await DB.getSetting('goldApiKey')).toBe('existing-plaintext');
  });
});

describe('migration of legacy plaintext keys', () => {
  beforeEach(resetAll);

  it('moves every plaintext key into secure storage and deletes the original', async () => {
    await DB.setSetting('goldApiKey', 'legacy-gold');
    await DB.setSetting('exchangeRateApiKey', 'legacy-fx');
    await DB.setSetting('currentsApiKey', 'legacy-news');
    await DB.setSetting('fredApiKey', 'legacy-fred');

    await migrateApiKeysToSecureStore();

    for (const [key, value] of [
      ['goldApiKey', 'legacy-gold'],
      ['exchangeRateApiKey', 'legacy-fx'],
      ['currentsApiKey', 'legacy-news'],
      ['fredApiKey', 'legacy-fred'],
    ] as const) {
      expect(secureStore.get(key)).toBe(value);
      // The exposure is only fixed if the plaintext is actually removed.
      expect(await DB.getSetting(key)).toBeFalsy();
    }
  });

  it('is idempotent and does not re-run after completing', async () => {
    await DB.setSetting('goldApiKey', 'legacy-gold');
    await migrateApiKeysToSecureStore();

    const callsAfterFirst = secureSet.mock.calls.length;
    await migrateApiKeysToSecureStore();

    expect(secureSet.mock.calls.length).toBe(callsAfterFirst);
    expect(await getApiKey('goldApiKey')).toBe('legacy-gold');
  });

  it('keeps the plaintext and retries later when a secure write fails', async () => {
    await DB.setSetting('goldApiKey', 'legacy-gold');
    secureSet.mockResolvedValueOnce(false);

    await migrateApiKeysToSecureStore();

    // Still exposed, but still working — and not marked done.
    expect(await DB.getSetting('goldApiKey')).toBe('legacy-gold');
    expect(await DB.getSetting('apiKeysMigratedToSecureStore')).toBeFalsy();

    // A later launch succeeds and completes the move.
    await migrateApiKeysToSecureStore();
    expect(secureStore.get('goldApiKey')).toBe('legacy-gold');
    expect(await DB.getSetting('goldApiKey')).toBeFalsy();
  });

  it('does nothing when there are no legacy keys', async () => {
    await migrateApiKeysToSecureStore();
    expect(secureSet).not.toHaveBeenCalled();
  });

  it('never throws, so a failure cannot block app startup', async () => {
    secureSet.mockRejectedValueOnce(new Error('keystore exploded'));
    await DB.setSetting('goldApiKey', 'legacy-gold');

    await expect(migrateApiKeysToSecureStore()).resolves.toBeUndefined();
  });
});

describe('legacy read fallback', () => {
  beforeEach(resetAll);

  it('still reads a plaintext key that has not been migrated yet', async () => {
    // A user whose migration has not run must not lose functionality.
    await DB.setSetting('goldApiKey', 'not-yet-migrated');
    expect(await getApiKey('goldApiKey')).toBe('not-yet-migrated');
  });

  it('prefers the secure value over any stale plaintext copy', async () => {
    await DB.setSetting('goldApiKey', 'stale-plaintext');
    secureStore.set('goldApiKey', 'current-secure');

    expect(await getApiKey('goldApiKey')).toBe('current-secure');
  });

  it('returns null when the key is set nowhere', async () => {
    expect(await getApiKey('fredApiKey')).toBeNull();
  });

  it('does not write plaintext back while falling back', async () => {
    await DB.setSetting('goldApiKey', 'legacy');
    await getApiKey('goldApiKey');
    expect(secureSet).not.toHaveBeenCalled();
  });
});
