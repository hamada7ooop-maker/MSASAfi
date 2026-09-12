import { db as DB } from './db/core';
import { useSettingsStore } from '../store/settingsStore';
import { useAppStore } from '../store/appStore';
import { t } from '../i18n/engine';
import { fmt, silentFail } from './utils';
import { toast } from '../toast';
import { LocalNotifications, type PendingResult } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';

export interface AppNotification {
  id: string;
  type: 'error' | 'warn' | 'info' | 'success';
  icon: string;
  title: string;
  body: string;
  amount?: number;
  page?: string;
  cat?: string;
  time?: Date;
  canSnooze?: boolean;
}

export interface NotifPrefs {
  bills?: boolean;
  budgets?: boolean;
  goals?: boolean;
  subs?: boolean;
  debts?: boolean;
  recurring?: boolean;
  spending?: boolean;
  weekly?: boolean;
}

let _notifCache: AppNotification[] = [];
let _notifFilter = 'all';
const _snoozedNotifs = new Set<string>();

// ===== NOTIFICATION BUILDER =====
export async function buildNotifications(): Promise<AppNotification[]> {
  const notes: AppNotification[] = [];
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const cur = useSettingsStore.getState().baseCurrency;

  const prefs: NotifPrefs = (await DB.getSetting('notifPrefs')) || {
    bills: true,
    budgets: true,
    goals: true,
    subs: true,
    debts: true,
    recurring: true,
    spending: true,
    weekly: true
  };
  const dismissed: string[] = (await DB.getSetting('dismissedNotifs')) || [];

  try {
    // 1. BILLS DUE
    if (prefs.bills) {
      const bills = await DB.getBills();
      bills
        .filter((b) => !b.isPaid)
        .forEach((b) => {
          const days = Math.ceil((new Date(b.dueDate).getTime() - now.getTime()) / 86400000);
          if (days < 0) {
            notes.push({
              id: 'bill-overdue-' + b.id,
              type: 'error',
              icon: 'warning',
              title: t('notif.billOverdue', {}, 'فاتورة متأخرة'),
              body: `${b.name} • ${fmt(b.amount)} ${cur} (${Math.abs(days)} ${t('notif.daysAgo', {}, 'يوم مضى')})`,
              amount: b.amount,
              page: 'bills',
              cat: 'bills',
              canSnooze: true
            });
          } else if (days === 0) {
            notes.push({
              id: 'bill-today-' + b.id,
              type: 'warn',
              icon: 'schedule',
              title: t('notif.billDueToday', {}, 'فاتورة تستحق اليوم'),
              body: `${b.name} • ${fmt(b.amount)} ${cur}`,
              amount: b.amount,
              page: 'bills',
              cat: 'bills',
              canSnooze: true
            });
          } else if (days <= 3) {
            notes.push({
              id: 'bill-soon-' + b.id,
              type: 'info',
              icon: 'event',
              title: t('notif.billDueSoon', {}, 'فاتورة تستحق قريباً'),
              body: `${b.name} • ${fmt(b.amount)} ${cur} (${t('notif.inDays', { days: String(days) }, 'خلال {days} يوم')})`,
              amount: b.amount,
              page: 'bills',
              cat: 'bills',
              canSnooze: true
            });
          }
        });
    }

    // 2. BUDGET OVERRUNS
    if (prefs.budgets) {
      const [budgets, txns] = await Promise.all([DB.getBudgets(), DB.getTransactions()]);
      const thisMonth = today.slice(0, 7);
      const spent: Record<string, number> = {};
      txns
        .filter((t) => (t.date || '').startsWith(thisMonth) && t.type === 'expense')
        .forEach((t) => {
          spent[t.category] = (spent[t.category] || 0) + (Number(t.amount) || 0);
        });

      budgets.forEach((b) => {
        const s = spent[b.category] || 0;
        const pct = Math.round((s / b.limit) * 100);
        if (pct >= 100) {
          notes.push({
            id: 'budget-exceeded-' + b.category,
            type: 'error',
            icon: 'trending_up',
            title: t('notif.budgetExceeded', {}, 'تم تجاوز الميزانية'),
            body: `${b.category} • ${pct}% (${fmt(s)} / ${fmt(b.limit)} ${cur})`,
            page: 'budgets',
            cat: 'budgets',
            canSnooze: true
          });
        } else if (pct >= 85) {
          notes.push({
            id: 'budget-near-' + b.category,
            type: 'warn',
            icon: 'info',
            title: t('notif.budgetNearLimit', {}, 'الميزانية قاربت على النفاد'),
            body: `${b.category} • ${pct}% (${fmt(s)} / ${fmt(b.limit)} ${cur})`,
            page: 'budgets',
            cat: 'budgets',
            canSnooze: true
          });
        }
      });
    }

    // 3. SUBSCRIPTION RENEWALS
    if (prefs.subs) {
      const subs = await DB.getSubscriptions();
      subs
        .filter((s) => (s as { active?: boolean }).active !== false)
        .forEach((s) => {
          let daysLeft: number | null = null;
          if (s.nextBillingDate) {
            const nextDate = new Date(s.nextBillingDate);
            if (!isNaN(nextDate.getTime())) {
              daysLeft = Math.ceil((nextDate.getTime() - now.getTime()) / 86400000);
            }
          }
          if (daysLeft === null) {
            const legacyRenew = (s as { renewDate?: string }).renewDate;
            if (legacyRenew) {
              const dom = now.getDate();
              const renew = parseInt(legacyRenew || '1');
              daysLeft = renew >= dom ? renew - dom : 30 - dom + renew;
            }
          }
          if (daysLeft === null) return;

          const subCurrency = (s as { currency?: string }).currency || cur;
          if (daysLeft <= 0) {
            notes.push({
              id: 'sub-today-' + s.id,
              type: 'warn',
              icon: 'credit_card',
              title: t('notif.subRenewsToday', {}, 'اشتراك يتجدد اليوم'),
              body: `${s.name} • ${fmt(s.amount)} ${subCurrency}`,
              amount: s.amount,
              page: 'bills',
              cat: 'subs',
              canSnooze: true
            });
          } else if (daysLeft <= 2) {
            notes.push({
              id: 'sub-soon-' + s.id,
              type: 'info',
              icon: 'autorenew',
              title: t('notif.subRenewsSoon', {}, 'اشتراك يتجدد قريباً'),
              body: `${s.name} • ${fmt(s.amount)} ${subCurrency} (${t('notif.inDays', { days: String(daysLeft) }, 'خلال {days} يوم')})`,
              amount: s.amount,
              page: 'bills',
              cat: 'subs',
              canSnooze: true
            });
          }
        });
    }

    // 4. GOAL MILESTONES & PROXIMITY
    if (prefs.goals) {
      const goals = await DB.getGoals();
      goals.forEach((g) => {
        const savedAmount = g.saved ?? (g as { current?: number }).current ?? 0;
        const pct = g.target > 0 ? Math.round((savedAmount / g.target) * 100) : 0;
        if (pct >= 100 && savedAmount > 0) {
          notes.push({
            id: 'goal-reached-' + g.id,
            type: 'success',
            icon: 'check_circle',
            title: t('notif.goalReached', {}, 'تم تحقيق الهدف الادخاري'),
            body: `${g.name} • ${fmt(savedAmount)} / ${fmt(g.target)} ${cur} 🎉`,
            page: 'goals',
            cat: 'goals'
          });
        } else if (pct >= 75 && pct < 100) {
          notes.push({
            id: 'goal-near-' + g.id,
            type: 'info',
            icon: 'savings',
            title: t('notif.goalNear', {}, 'اقتربت من تحقيق الهدف'),
            body: `${g.name} • ${pct}% (${fmt(g.target - savedAmount)} ${cur} ${t('notif.remaining', {}, 'متبقي')})`,
            page: 'goals',
            cat: 'goals'
          });
        }
      });
    }

    // 5. DEBTS YOU OWE
    if (prefs.debts) {
      const debts = await DB.getDebts();
      debts
        .filter((d) => d.type === 'owed' || (d.type as string) === 'owe')
        .forEach((d) => {
          const rem = d.total - (d.paid || 0);
          if (rem <= 0) return;
          if (d.dueDate) {
            const days = Math.ceil((new Date(d.dueDate).getTime() - now.getTime()) / 86400000);
            const personName = d.person || d.name || '';
            if (days < 0) {
              notes.push({
                id: 'debt-overdue-' + d.id,
                type: 'error',
                icon: 'person',
                title: t('notif.debtOverdue', {}, 'دين مستحق'),
                body: `${t('notif.owePerson', { person: personName }, 'مستحق لـ {person}')}: ${fmt(rem)} ${cur} (${Math.abs(days)} ${t(
                  'notif.daysAgo',
                  {},
                  'يوم مضى'
                )})`,
                amount: rem,
                page: 'debts',
                cat: 'debts',
                canSnooze: true
              });
            } else if (days <= 3) {
              notes.push({
                id: 'debt-due-' + d.id,
                type: 'warn',
                icon: 'person',
                title: t('notif.debtDueSoon', {}, 'دين يستحق قريباً'),
                body: `${t('notif.owePerson', { person: personName }, 'مستحق لـ {person}')}: ${fmt(rem)} ${cur} (${t('notif.inDays', {
                  days: String(days)
                }, 'خلال {days} يوم')})`,
                amount: rem,
                page: 'debts',
                cat: 'debts',
                canSnooze: true
              });
            }
          }
        });
    }

    // 6. RECURRING TRANSACTIONS DUE
    if (prefs.recurring) {
      const recur = await DB.getRecurringTransactions();
      recur.forEach((r) => {
        const isRecurActive = r.isActive ?? (r as { active?: boolean }).active ?? true;
        if (!isRecurActive) return;
        const days = Math.ceil((new Date(r.nextDate).getTime() - now.getTime()) / 86400000);
        if (days <= 0) {
          notes.push({
            id: 'recur-due-' + r.id,
            type: 'warn',
            icon: 'sync',
            title: t('notif.recurringDue', {}, 'معاملة متكررة مستحقة'),
            body: `${r.description || r.category} • ${fmt(r.amount)} ${cur}`,
            amount: r.amount,
            page: 'recurring',
            cat: 'recurring'
          });
        }
      });
    }

    // 7. WEEKLY FINANCIAL DIGEST (Sundays)
    if (prefs.weekly && now.getDay() === 0) {
      const txns = await DB.getTransactions();
      const weekAgo = new Date(now.getTime() - 7 * 86400000).toISOString().slice(0, 10);
      const weekTxns = txns.filter((t) => (t.date || '') >= weekAgo);
      const spent = weekTxns.filter((t) => t.type === 'expense').reduce((s, t) => s + (Number(t.amount) || 0), 0);
      const earned = weekTxns.filter((t) => t.type === 'income').reduce((s, t) => s + (Number(t.amount) || 0), 0);
      notes.push({
        id: 'weekly-digest-' + today,
        type: 'info',
        icon: 'analytics',
        title: t('notif.weeklyDigest', {}, 'الملخص المالي الأسبوعي'),
        body: `${t('notif.weeklySpent', {}, 'المصروفات')}: ${fmt(spent)} ${cur} • ${t('notif.weeklyEarned', {}, 'الدخل')}: ${fmt(earned)} ${cur}`,
        page: 'reports',
        cat: 'spending'
      });
    }

    // 8. UNLOGGED EXPENSE REMINDER
    if (prefs.spending && now.getHours() >= 20) {
      const txns = await DB.getTransactions();
      const txnsToday = txns.filter((t) => (t.date || '').startsWith(today));
      if (txnsToday.length === 0) {
        notes.push({
          id: 'no-txn-today',
          type: 'info',
          icon: 'edit_note',
          title: t('notif.noTxnsToday', {}, 'لا معاملات اليوم'),
          body: t('notif.logExpensesReminder', {}, 'لا تنسَ تسجيل مصاريف اليوم'),
          page: 'add',
          cat: 'spending'
        });
      }
    }
  } catch (e) {
    silentFail('[Notifications] Notification build error')(e);
  }

  // Filter out dismissed/snoozed
  const filtered = notes.filter((n) => !dismissed.includes(n.id) && !_snoozedNotifs.has(n.id));
  _notifCache = filtered;

  // Try browser notification for critical items
  const critical = filtered.find((n) => n.type === 'error');
  if (critical) {
    const lastShown = (await DB.getSetting('lastSysNotif_' + critical.id)) as number | undefined;
    if (!lastShown || now.getTime() - lastShown > 600000) {
      sendNotification(critical);
      await DB.setSetting('lastSysNotif_' + critical.id, now.getTime());
    }
  }

  return filtered;
}

// ===== NOTIFICATION SENDER (Native + Web) =====
export async function sendNotification(notif: AppNotification): Promise<void> {
  const enabled = await DB.getSetting('browserNotifs');
  if (!enabled) return;

  const isNative = Capacitor.isNativePlatform();
  if (isNative) {
    try {
      const perms = await LocalNotifications.checkPermissions();
      if (perms.display !== 'granted') await LocalNotifications.requestPermissions();
      await LocalNotifications.schedule({
        notifications: [
          {
            title: notif.title,
            body: notif.body,
            id: Math.floor(Math.random() * 1000000),
            schedule: { at: new Date(Date.now() + 1000) },
            sound: 'default',
            actionTypeId: '',
            extra: { page: notif.page || 'home' }
          }
        ]
      });
    } catch (e) {
      silentFail('[Notifications] Native Notif Error')(e);
    }
  } else if ('Notification' in window && Notification.permission === 'granted') {
    const lastShown = (await DB.getSetting('lastBrowserNotif_' + notif.id)) as number | undefined;
    const now = Date.now();
    if (lastShown && now - lastShown < 3600000) return;
    new Notification(notif.title, { body: notif.body, icon: '/favicon.ico', tag: notif.id });
    await DB.setSetting('lastBrowserNotif_' + notif.id, now);
  }
}

// ===== CLEAN MODULAR NOTIFICATION CONTROLLER (Zero-globalThis) =====

export async function requestBrowserNotifs(renderApp?: () => void): Promise<void> {
  const current = await DB.getSetting('browserNotifs');
  if (current) {
    await DB.setSetting('browserNotifs', false);
    toast(t('notif.toast.disabled'));
    if (renderApp) renderApp();
    return;
  }
  const isNative = Capacitor.isNativePlatform();
  if (isNative) {
    try {
      const perms = await LocalNotifications.requestPermissions();
      if (perms.display === 'granted') {
        await DB.setSetting('browserNotifs', true);
        toast(t('notif.toast.enabled'));
      } else {
        toast(t('notif.toast.permDenied'), 'error');
      }
    } catch (e: unknown) {
      const err = e as Error;
      toast('Error: ' + err.message, 'error');
    }
  } else {
    if (!('Notification' in window)) {
      toast(t('notif.toast.notSupported'), 'error');
      return;
    }
    const perm = await Notification.requestPermission();
    if (perm === 'granted') {
      await DB.setSetting('browserNotifs', true);
      toast(t('notif.toast.enabled'));
    } else {
      toast(t('notif.toast.permDenied'), 'error');
    }
  }
  if (renderApp) renderApp();
}

export async function dismissNotif(id: string): Promise<void> {
  const dismissed: string[] = (await DB.getSetting('dismissedNotifs')) || [];
  if (!dismissed.includes(id)) {
    dismissed.push(id);
    await DB.setSetting('dismissedNotifs', dismissed);
  }
  _notifCache = _notifCache.filter((n) => n.id !== id);
}

export async function clearAllNotifs(): Promise<void> {
  const dismissed: string[] = (await DB.getSetting('dismissedNotifs')) || [];
  _notifCache.forEach((n) => {
    if (!dismissed.includes(n.id)) dismissed.push(n.id);
  });
  await DB.setSetting('dismissedNotifs', dismissed);
  _notifCache = [];
  toast(t('notif.toast.allCleared'));
}

export function snoozeNotif(id: string): void {
  _snoozedNotifs.add(id);
  setTimeout(() => _snoozedNotifs.delete(id), 4 * 3600000);
  _notifCache = _notifCache.filter((n) => n.id !== id);
  toast(t('notif.toast.snoozed4h'));
}

export function setNotifFilter(filter: string): void {
  _notifFilter = filter;
}

export function toggleNotifPanel(forceState?: boolean): void {
  const store = useAppStore.getState();
  if (typeof forceState === 'boolean') {
    store.setNotifPanelOpen(forceState);
  } else {
    store.toggleNotifPanel();
  }
}

export const buildAppNotifications = buildNotifications;
export const getNotifs = buildNotifications;

// ===== SCHEDULE UPCOMING NATIVE NOTIFICATIONS =====
export async function scheduleUpcomingNotifications(): Promise<void> {
  const isNative = Capacitor.isNativePlatform();
  if (!isNative) return;

  try {
    const prefs: NotifPrefs = (await DB.getSetting('notifPrefs')) || { bills: true };
    if (!prefs.bills) return;

    const pending: PendingResult = await LocalNotifications.getPending();
    if (pending.notifications.length > 0) {
      await LocalNotifications.cancel({ notifications: pending.notifications });
    }

    const bills = await DB.getBills();
    const now = new Date();
    const toSchedule: Array<{
      title: string;
      body: string;
      id: number;
      schedule: { at: Date };
      sound: string;
    }> = [];

    bills
      .filter((b) => !b.isPaid)
      .forEach((b, idx) => {
        const due = new Date(b.dueDate);
        if (due > now) {
          toSchedule.push({
            title: t('notif.scheduledBill'),
            body: `${b.name} • ${b.amount} ${useSettingsStore.getState().baseCurrency}`,
            id: (idx + 1) * 1000 + (b.id.charCodeAt(0) || 0),
            schedule: { at: due },
            sound: 'default'
          });
        }
      });

    if (toSchedule.length > 0) {
      await LocalNotifications.schedule({ notifications: toSchedule });
    }
  } catch (e) {
    silentFail('[Notifications] Scheduling Error')(e);
  }
}
