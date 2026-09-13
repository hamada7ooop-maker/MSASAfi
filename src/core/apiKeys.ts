/**
 * Masarifi — secure storage for third-party market-data API keys.
 *
 * ## The defect (audit finding H-2, part c)
 *
 * Four user-supplied API keys were stored via `DB.setSetting`, which writes to
 * the Dexie `settings` table:
 *
 *   goldApiKey · exchangeRateApiKey · currentsApiKey · fredApiKey
 *
 * `settings` is NOT in ENCRYPTED_FIELDS, so those keys sat in IndexedDB in
 * plaintext — readable by anything with access to the app's data directory,
 * and included verbatim in any unencrypted backup or export of that table.
 *
 * The inconsistency was the tell: `geminiApiKey` and `groqApiKey` were already
 * routed through `secureStore` (biometric keystore, falling back to
 * PBKDF2-AES-GCM encrypted Preferences). Two classes of the same secret were
 * being handled two different ways in the same app. These four are now handled
 * like the other two.
 *
 * ## Why this matters even though the keys are "just" market data
 *
 * They are the user's own credentials, often on a paid tier and frequently
 * reused across services. Leaking them can cost the user money through quota
 * abuse and billing on their account. "Low value to the attacker" is not the
 * same as "low cost to the victim".
 *
 * ## Migration
 *
 * Existing installations already have these keys in the settings table.
 * `migrateApiKeysToSecureStore()` moves each one into secure storage and then
 * removes the plaintext copy — it must actually delete the original, otherwise
 * the fix only adds a second copy and leaves the exposure in place. It runs at
 * startup, is idempotent, and never deletes a plaintext key until the secure
 * write has reported success.
 */

import { db as DB } from './db/core';
import { secureGet, secureSet, secureRemove } from './secureStore';
import { logger } from './logger';

/** The market-data API keys that must live in secure storage, not `settings`. */
export const MARKET_API_KEYS = [
  'goldApiKey',
  'exchangeRateApiKey',
  'currentsApiKey',
  'fredApiKey',
] as const;

export type MarketApiKeyName = (typeof MARKET_API_KEYS)[number];

/** Settings flag recording that the one-time migration has completed. */
const MIGRATION_FLAG = 'apiKeysMigratedToSecureStore';

/**
 * Read an API key from secure storage.
 *
 * Falls back to the legacy plaintext `settings` value so a user whose
 * migration has not yet run (or failed) does not lose functionality. The
 * fallback is read-only; it never re-writes plaintext.
 */
export async function getApiKey(name: MarketApiKeyName): Promise<string | null> {
  try {
    const secure = await secureGet(name);
    if (secure) return secure;
  } catch (e) {
    logger.error('ApiKeys', `Secure read failed for ${name}`, e);
  }

  // Legacy fallback — pre-migration installations only.
  const legacy = await DB.getSetting<string>(name);
  return legacy || null;
}

/**
 * Persist an API key to secure storage.
 *
 * Passing an empty value clears the key from both stores. Returns false when
 * the secure write failed, so callers can surface the error rather than
 * silently believing the key was saved.
 */
export async function setApiKey(name: MarketApiKeyName, value: string): Promise<boolean> {
  const trimmed = (value || '').trim();

  if (!trimmed) {
    await secureRemove(name);
    await DB.setSetting(name, null);
    return true;
  }

  const ok = await secureSet(name, trimmed);
  if (ok) {
    // Never leave the plaintext copy behind: it is the exposure being fixed.
    await DB.setSetting(name, null);
  }
  return ok;
}

/**
 * Move any plaintext API keys out of the `settings` table into secure storage.
 *
 * Idempotent and safe to call on every startup. A key is only removed from
 * `settings` once the secure write has succeeded, so an interrupted or failed
 * migration degrades to "still readable via the legacy fallback" rather than
 * to data loss.
 */
export async function migrateApiKeysToSecureStore(): Promise<void> {
  try {
    if (await DB.getSetting<boolean>(MIGRATION_FLAG)) return;

    let migrated = 0;
    let failed = 0;

    for (const name of MARKET_API_KEYS) {
      const plaintext = await DB.getSetting<string>(name);
      if (!plaintext) continue;

      const ok = await secureSet(name, plaintext);
      if (ok) {
        await DB.setSetting(name, null);
        migrated++;
      } else {
        // Leave the plaintext in place: an unreadable key is worse for the
        // user than a key that is still exposed but working. Retried next run.
        failed++;
      }
    }

    // Only close the migration when nothing was left behind.
    if (failed === 0) {
      await DB.setSetting(MIGRATION_FLAG, true);
    }

    if (migrated > 0 || failed > 0) {
      logger.info(
        'ApiKeys',
        `Migrated ${migrated} API key(s) to secure storage${failed ? `, ${failed} deferred` : ''}`
      );
    }
  } catch (e) {
    logger.error('ApiKeys', 'API key migration failed; will retry next launch', e);
  }
}
