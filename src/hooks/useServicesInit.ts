import { db } from "../core/db/core";
import { updateExchangeRates } from "../core/currency";
import { refreshSystemNotifications } from "../core/notificationManager";
import { NotificationRepository } from "../core/db/repositories/notifications";
import { useAppStore } from "../store/appStore";

/**
 * Initializes Background Services, Category/Account defaults, and Exchange Rates.
 */
export async function initServices(): Promise<void> {
  const { setNotifCount } = useAppStore.getState();

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
