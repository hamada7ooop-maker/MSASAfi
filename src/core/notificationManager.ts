import { BillRepository } from './db/repositories/bills';
import { BudgetRepository } from './db/repositories/budgets';
import { NotificationRepository } from './db/repositories/notifications';
import { TransactionRepository } from './db/repositories/transactions';
import { AccountRepository } from './db/repositories/accounts';
import { t } from '../i18n/engine';
import { useAppStore } from '../store/appStore';
import { useSettingsStore } from '../store/settingsStore';
import { silentFail, ignore } from './errors';
import { onNotificationRefresh } from './events';

/**
 * Directly updates Zustand notifCount by refreshing system notifications
 */
export async function triggerNotificationRefresh(): Promise<number> {
  try {
    const count = await refreshSystemNotifications();
    useAppStore.getState().setNotifCount(count);
    return count;
  } catch (e) {
    silentFail('[NotificationManager] triggerNotificationRefresh error')(e);
    return 0;
  }
}

// Automatically subscribe to the global notification refresh event bus
onNotificationRefresh(async () => {
  await triggerNotificationRefresh().catch(ignore());
});

/**
 * NotificationManager
 */
let isRefreshingNotifs = false;

/**
 * Analyzes the database and generates system notifications for the user.
 */
export async function refreshSystemNotifications() {
  if (isRefreshingNotifs) return await NotificationRepository.getUnreadCount();
  isRefreshingNotifs = true;

  try {
    const today = new Date().toISOString().slice(0, 10);
    const curr = useSettingsStore.getState().baseCurrency || 'SAR';
    const notifs = await NotificationRepository.getAll();
    
    // --- Check Overdue Bills ---
    const unpaidBills = await BillRepository.getUnpaid();
    for (const bill of unpaidBills) {
      if (bill.dueDate < today) {
        const tag = `bill_overdue_${bill.id}`;
        if (!notifs.some(n => n.tag === tag)) {
          await NotificationRepository.add({
            type: 'warn',
            tag,
            title: t('notif.billOverdue') || 'فاتورة متأخرة',
            body: t('notif.billOverdueBody', { name: bill.name, date: bill.dueDate }) || `الفاتورة "${bill.name}" تجاوزت موعد استحقاقها (${bill.dueDate}).`,
            icon: 'payments'
          });
        }
      }
    }

    // --- Check Low Balance ---
    const balance = await AccountRepository.getTotalBalance();
    if (balance < 0) {
      const tag = 'neg_balance';
      if (!notifs.some(n => n.tag === tag)) {
        await NotificationRepository.add({
          type: 'error',
          tag,
          title: t('home.alertNegBalance', { amount: balance.toLocaleString(), curr }) || 'تنبيه: الرصيد سالب',
          body: t('home.alertNegBalanceBody', { amount: balance.toLocaleString(), curr }) || 'إجمالي رصيدك حالياً تحت الصفر، يرجى مراجعة مصروفاتك.',
          icon: 'account_balance_wallet'
        });
      }
    }

    // --- Check Budgets ---
    const budgets = await BudgetRepository.getAll();
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    
    for (const budget of budgets) {
      const spent = await TransactionRepository.getSpentInCategory(budget.category, year, month);
      const limit = Number(budget.limit) || 0;
      
      if (limit > 0) {
        const pct = (spent / limit) * 100;
        if (pct >= 100) {
          const tag = `budget_over_${budget.category}`;
          if (!notifs.some(n => n.tag === tag)) {
            await NotificationRepository.add({
              type: 'error',
              tag,
              title: t('notif.budgetOver') || 'تجاوز الميزانية',
              body: t('notif.budgetOverBody', { cat: budget.category }) || `لقد تجاوزت الميزانية المحددة لـ "${budget.category}".`,
              icon: 'warning'
            });
          }
        } else if (pct >= 80) {
          const tag = `budget_warn_${budget.category}`;
          if (!notifs.some(n => n.tag === tag)) {
            await NotificationRepository.add({
              type: 'warn',
              tag,
              title: t('notif.budgetWarn') || 'تحذير الميزانية',
              body: t('notif.budgetWarnBody', { cat: budget.category, pct: '80' }) || `لقد استهلكت 80% من ميزانية "${budget.category}".`,
              icon: 'info'
            });
          }
        }
      }
    }

  } catch (err) {
    silentFail('[NotificationManager] Refresh Error')(err);
  } finally {
    isRefreshingNotifs = false;
  }
  
  return await NotificationRepository.getUnreadCount();
}
