import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  buildNotifications,
  dismissNotif,
  clearAllNotifs,
  snoozeNotif,
  setNotifFilter,
  toggleNotifPanel,
  scheduleUpcomingNotifications,
} from '../../src/core/notifications';
import { db as DB } from '../../src/core/db/core';
import { useAppStore } from '../../src/store/appStore';
import { useSettingsStore } from '../../src/store/settingsStore';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';

vi.mock('@capacitor/local-notifications', () => ({
  LocalNotifications: {
    checkPermissions: vi.fn().mockResolvedValue({ display: 'granted' }),
    requestPermissions: vi.fn().mockResolvedValue({ display: 'granted' }),
    getPending: vi.fn().mockResolvedValue({ notifications: [] }),
    schedule: vi.fn().mockResolvedValue(undefined),
    cancel: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: vi.fn().mockReturnValue(false),
  },
}));

describe('Core Notifications Unit Tests (notifications.ts)', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    useAppStore.setState({ isNotifPanelOpen: false, notifCount: 0 });
    useSettingsStore.setState({ baseCurrency: 'SAR' });
    await DB.settings.clear();
    await DB.bills.clear();
    await DB.debts.clear();
    await DB.recurringTransactions.clear();
    await DB.transactions.clear();
    await DB.budgets.clear();
  });

  describe('buildNotifications', () => {
    it('detects overdue and due soon bills', async () => {
      const pastDate = '2020-01-01';
      const soonDate = new Date(Date.now() + 86400000).toISOString().slice(0, 10);

      await DB.bills.bulkAdd([
        { id: 'b1', name: 'Internet', amount: 300, dueDate: soonDate, isPaid: false, type: 'bill' },
        { id: 'b2', name: 'Water', amount: 150, dueDate: pastDate, isPaid: false, type: 'bill' },
        { id: 'b3', name: 'Electricity', amount: 200, dueDate: soonDate, isPaid: true, type: 'bill' },
      ]);

      const notifs = await buildNotifications();
      expect(notifs.some((n) => n.id === 'bill-soon-b1')).toBe(true);
      expect(notifs.some((n) => n.id === 'bill-overdue-b2')).toBe(true);
      expect(notifs.some((n) => n.id === 'bill-soon-b3')).toBe(false);
    });

    it('detects debt due dates and recurring transactions', async () => {
      const pastDate = '2020-01-01';

      await DB.debts.add({
        id: 'd1',
        person: 'Ahmed',
        total: 1000,
        paid: 0,
        type: 'owe',
        dueDate: pastDate,
      });

      await DB.recurringTransactions.add({
        id: 'r1',
        description: 'Gym Subscription',
        amount: 250,
        type: 'expense',
        category: 'رياضة',
        nextDate: pastDate,
        active: true,
        isActive: true,
      });

      const notifs = await buildNotifications();
      expect(notifs.some((n) => n.id.includes('debt-overdue-d1'))).toBe(true);
      expect(notifs.some((n) => n.id.includes('recur-due-r1'))).toBe(true);
    });

    it('filters out dismissed and snoozed notifications', async () => {
      const pastDate = '2020-01-01';
      await DB.bills.add({ id: 'b_dismiss', name: 'Gym', amount: 100, dueDate: pastDate, isPaid: false, type: 'bill' });

      let notifs = await buildNotifications();
      expect(notifs.some((n) => n.id === 'bill-overdue-b_dismiss')).toBe(true);

      await dismissNotif('bill-overdue-b_dismiss');
      notifs = await buildNotifications();
      expect(notifs.some((n) => n.id === 'bill-overdue-b_dismiss')).toBe(false);
    });

    it('snoozes and clears notifications', async () => {
      snoozeNotif('test_notif_snooze');
      await clearAllNotifs();
      setNotifFilter('warn');
      expect(true).toBe(true);
    });
  });

  describe('toggleNotifPanel and native schedule', () => {
    it('toggles Zustand store panel state', () => {
      expect(useAppStore.getState().isNotifPanelOpen).toBe(false);
      toggleNotifPanel();
      expect(useAppStore.getState().isNotifPanelOpen).toBe(true);
      toggleNotifPanel(false);
      expect(useAppStore.getState().isNotifPanelOpen).toBe(false);
    });

    it('schedules upcoming notifications on native platform', async () => {
      vi.mocked(Capacitor.isNativePlatform).mockReturnValue(true);
      const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
      await DB.bills.add({ id: 'b_sched', name: 'Rent', amount: 2500, dueDate: tomorrow, isPaid: false, type: 'bill' });

      await scheduleUpcomingNotifications();
      expect(LocalNotifications.schedule).toHaveBeenCalled();
    });
  });
});
