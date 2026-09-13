import { db } from "../core/db/core";
import { updateExchangeRates } from "../core/currency";
import { refreshSystemNotifications } from "../core/notificationManager";
import { NotificationRepository } from "../core/db/repositories/notifications";
import { useAppStore } from "../store/appStore";
import { migrateApiKeysToSecureStore } from "../core/apiKeys";

/**
 * Initializes Background Services, Category/Account defaults, and Exchange Rates.
 */
export async function initServices(): Promise<void> {
  const { setNotifCount } = useAppStore.getState();

  // Move any plaintext market-data API keys out of the `settings` table before
  // anything reads them. Awaited rather than parallelised so the plaintext
  // copies are gone as early as possible; it is a no-op after the first run.
  await migrateApiKeysToSecureStore();

  await Promise.allSettled([
    db.initDefaultCategories(),
    db.initDefaultAccounts(),
    db.cleanupDuplicateAssets(),
    db.pruneAuditLog(),
    db.processRecurringTransactions(),
    updateExchangeRates(),
    NotificationRepository.getUnreadCount().then(c => setNotifCount(c)),
    refreshSystemNotifications().then(c => setNotifCount(c))
  ]);
}
