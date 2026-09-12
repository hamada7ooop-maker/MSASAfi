import { describe, it, expect, beforeEach, vi } from 'vitest';
import { db as DB } from '@/core/db/core';
import {
  buildNotifications,
  sendNotification,
  requestBrowserNotifs,
  dismissNotif,
  clearAllNotifs,
  snoozeNotif,
  setNotifFilter,
  toggleNotifPanel,
  scheduleUpcomingNotifications
} from '@/core/notifications';
import { useAppStore } from '@/store/appStore';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';

vi.mock('@capacitor/local-notifications', () => ({
  LocalNotifications: {
    checkPermissions: vi.fn().mockResolvedValue({ display: 'granted' }),
    requestPermissions: vi.fn().mockResolvedValue({ display: 'granted' }),
    schedule: vi.fn().mockResolvedValue(undefined),
    getPending: vi.fn().mockResolvedValue({ notifications: [] }),
    cancel: vi.fn().mockResolvedValue(undefined)
  }
}));

describe('Notifications System Deep Unit Tests (notifications.ts)', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await DB.clearAll();
    useAppStore.setState({ isNotifPanelOpen: false });
  });

  describe('buildNotifications Scenarios', () => {
    it('generates overdue, today, and soon notifications for bills', async () => {
      const now = new Date();
      const pastDate = new Date(now.getTime() - 2 * 86400000).toISOString().slice(0, 10);
      const todayDate = now.toISOString().slice(0, 10);
      const soonDate = new Date(now.getTime() + 2 * 86400000).toISOString().slice(0, 10);

      await DB.bills.bulkAdd([
        { id: 'b_overdue', name: 'Overdue Electricity', amount: 350, dueDate: pastDate, isPaid: false, category: 'Bills' },
        { id: 'b_today', name: 'Today Water', amount: 80, dueDate: todayDate, isPaid: false, category: 'Bills' },
        { id: 'b_soon', name: 'Soon Internet', amount: 200, dueDate: soonDate, isPaid: false, category: 'Bills' },
        { id: 'b_paid', name: 'Paid Rent', amount: 2000, dueDate: pastDate, isPaid: true, category: 'Bills' }
      ]);

      const notes = await buildNotifications();
      expect(notes.some(n => n.id === 'bill-overdue-b_overdue')).toBe(true);
      expect(notes.some(n => n.id === 'bill-today-b_today')).toBe(true);
      expect(notes.some(n => n.id === 'bill-soon-b_soon')).toBe(true);
      expect(notes.some(n => n.id === 'bill-overdue-b_paid')).toBe(false);
    });

    it('generates budget overrun and near-limit notifications', async () => {
      const currentMonth = new Date().toISOString().slice(0, 7);
      await DB.budgets.bulkAdd([
        { id: 'bud_food', category: 'Food', limit: 500, period: 'monthly' },
        { id: 'bud_fun', category: 'Entertainment', limit: 1000, period: 'monthly' }
      ]);

      await DB.transactions.bulkAdd([
        // Food spent: 550 (>= 100% of 500)
        { id: 't_food1', amount: 550, category: 'Food', type: 'expense', date: `${currentMonth}-05` },
        // Entertainment spent: 880 (>= 85% of 1000)
        { id: 't_fun1', amount: 880, category: 'Entertainment', type: 'expense', date: `${currentMonth}-06` }
      ]);

      const notes = await buildNotifications();
      expect(notes.some(n => n.id === 'budget-exceeded-Food')).toBe(true);
      expect(notes.some(n => n.id === 'budget-near-Entertainment')).toBe(true);
    });

    it('generates subscription renewal notifications', async () => {
      const todayDom = String(new Date().getDate());
      const todayIso = new Date().toISOString().slice(0, 10);
      await DB.subscriptions.bulkAdd([
        { id: 'sub_active_today', name: 'Netflix', amount: 45, renewDate: todayDom, active: true, billingCycle: 'monthly', category: 'Subs' },
        { id: 'sub_modern_today', name: 'Spotify', amount: 30, nextBillingDate: todayIso, category: 'Subs' }
      ]);

      const notes = await buildNotifications();
      expect(notes.some(n => n.id === 'sub-today-sub_active_today')).toBe(true);
      expect(notes.some(n => n.id === 'sub-today-sub_modern_today')).toBe(true);
    });

    it('generates goal milestones (reached and near)', async () => {
      await DB.goals.bulkAdd([
        { id: 'g_done', name: 'Completed Goal', target: 1000, current: 1000, targetAmount: 1000, currentAmount: 1000, deadline: '2026-12-31', color: '#1', icon: 'flag' },
        { id: 'g_near', name: 'Near Goal', target: 1000, current: 800, targetAmount: 1000, currentAmount: 800, deadline: '2026-12-31', color: '#2', icon: 'flag' },
        { id: 'g_modern_done', name: 'Modern Done Goal', target: 500, saved: 500, color: '#3', icon: 'star' },
        { id: 'g_modern_near', name: 'Modern Near Goal', target: 1000, saved: 850, color: '#4', icon: 'star' }
      ]);

      const notes = await buildNotifications();
      expect(notes.some(n => n.id === 'goal-reached-g_done')).toBe(true);
      expect(notes.some(n => n.id === 'goal-near-g_near')).toBe(true);
      expect(notes.some(n => n.id === 'goal-reached-g_modern_done')).toBe(true);
      expect(notes.some(n => n.id === 'goal-near-g_modern_near')).toBe(true);
    });

    it('generates debt overdue and due notifications', async () => {
      const now = new Date();
      const pastDate = new Date(now.getTime() - 2 * 86400000).toISOString().slice(0, 10);
      const soonDate = new Date(now.getTime() + 2 * 86400000).toISOString().slice(0, 10);

      await DB.debts.bulkAdd([
        { id: 'd_overdue', person: 'Friend Loan', total: 1000, paid: 200, amount: 800, type: 'owe', dueDate: pastDate },
        { id: 'd_soon', person: 'Cousin Loan', total: 500, paid: 100, amount: 400, type: 'owe', dueDate: soonDate },
        { id: 'd_modern_overdue', name: 'Car Loan', person: 'Bank', total: 2000, paid: 500, type: 'owed', dueDate: pastDate },
        { id: 'd_modern_soon', name: 'Rent Loan', person: 'Landlord', total: 1500, paid: 200, type: 'owed', dueDate: soonDate }
      ]);

      const notes = await buildNotifications();
      expect(notes.some(n => n.id === 'debt-overdue-d_overdue')).toBe(true);
      expect(notes.some(n => n.id === 'debt-due-d_soon')).toBe(true);
      expect(notes.some(n => n.id === 'debt-overdue-d_modern_overdue')).toBe(true);
      expect(notes.some(n => n.id === 'debt-due-d_modern_soon')).toBe(true);
    });

    it('generates recurring transaction due notification', async () => {
      const todayDate = new Date().toISOString().slice(0, 10);
      await DB.recurringTransactions.bulkAdd([
        {
          id: 'rec_gym',
          description: 'Gym Membership',
          amount: 150,
          nextDate: todayDate,
          active: true,
          frequency: 'monthly',
          category: 'Health',
          type: 'expense',
          startDate: todayDate
        },
        {
          id: 'rec_modern_cloud',
          description: 'Cloud Server',
          amount: 80,
          nextDate: todayDate,
          isActive: true,
          frequency: 'monthly',
          category: 'Bills',
          type: 'expense',
          createdAt: todayDate
        }
      ]);

      const notes = await buildNotifications();
      expect(notes.some(n => n.id === 'recur-due-rec_gym')).toBe(true);
      expect(notes.some(n => n.id === 'recur-due-rec_modern_cloud')).toBe(true);
    });

    it('filters dismissed notifications', async () => {
      await DB.bills.add({
        id: 'b_dismissable',
        name: 'Electric',
        amount: 200,
        dueDate: '2026-01-01',
        isPaid: false,
        category: 'Bills'
      });

      let notes = await buildNotifications();
      expect(notes.some(n => n.id === 'bill-overdue-b_dismissable')).toBe(true);

      await dismissNotif('bill-overdue-b_dismissable');
      notes = await buildNotifications();
      expect(notes.some(n => n.id === 'bill-overdue-b_dismissable')).toBe(false);
    });

    it('formats all notifications with localized titles and bodies without raw i18n keys', async () => {
      const now = new Date();
      const currentMonth = now.toISOString().slice(0, 7);
      const todayDate = now.toISOString().slice(0, 10);
      const soonDate = new Date(now.getTime() + 86400000).toISOString().slice(0, 10);

      await DB.budgets.add({ id: 'b_exceeded', category: 'Travel', limit: 100, period: 'monthly' });
      await DB.transactions.add({ id: 'tx_exceeded', amount: 150, category: 'Travel', type: 'expense', date: `${currentMonth}-01` });
      await DB.subscriptions.add({ id: 'sub_soon', name: 'Spotify Family', amount: 131.25, nextBillingDate: soonDate, category: 'Subs' });
      await DB.recurringTransactions.add({ id: 'rec_gym', description: 'Gym Club', amount: 200, nextDate: todayDate, isActive: true, frequency: 'monthly', category: 'Health', type: 'expense' });

      const notes = await buildNotifications();
      expect(notes.length).toBeGreaterThanOrEqual(3);

      for (const note of notes) {
        expect(note.title).not.toMatch(/^notif\./);
        expect(note.title).not.toContain('notif.budgetExceeded');
        expect(note.title).not.toContain('notif.subRenewsSoon');
        expect(note.title).not.toContain('notif.recurringDue');
        expect(note.body).not.toContain('notif.inDays');
        expect(note.body).not.toMatch(/notif\.[a-zA-Z]+/);
      }
    });
  });

  describe('Notification Actions and Settings Controllers', () => {
    it('handles clearAllNotifs and snoozeNotif', async () => {
      snoozeNotif('test_snooze_id');
      await clearAllNotifs();
      const dismissed = await DB.getSetting<string[]>('dismissedNotifs');
      expect(dismissed).toBeDefined();
    });

    it('sets notification filter and toggles notification panel state', () => {
      setNotifFilter('bills');
      expect(useAppStore.getState().isNotifPanelOpen).toBe(false);

      toggleNotifPanel(true);
      expect(useAppStore.getState().isNotifPanelOpen).toBe(true);

      toggleNotifPanel(false);
      expect(useAppStore.getState().isNotifPanelOpen).toBe(false);

      toggleNotifPanel();
      expect(useAppStore.getState().isNotifPanelOpen).toBe(true);
    });

    it('sends native notification when enabled on native platform', async () => {
      await DB.setSetting('browserNotifs', true);
      vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(true);

      await sendNotification({
        id: 'test_notif_send',
        title: 'Native Alert',
        body: 'Testing native notification scheduler',
        type: 'info',
        icon: 'notifications'
      });

      expect(LocalNotifications.schedule).toHaveBeenCalled();
    });

    it('toggles browser notifications permission request', async () => {
      vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(true);

      // 1. Enable
      await requestBrowserNotifs();
      const enabled = await DB.getSetting('browserNotifs');
      expect(enabled).toBe(true);

      // 2. Disable
      await requestBrowserNotifs();
      const disabled = await DB.getSetting('browserNotifs');
      expect(disabled).toBe(false);
    });

    it('schedules upcoming notifications on native platform', async () => {
      vi.spyOn(Capacitor, 'isNativePlatform').mockReturnValue(true);
      await DB.bills.add({
        id: 'b_upcoming',
        name: 'Upcoming Rent',
        amount: 3000,
        dueDate: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
        isPaid: false,
        category: 'Bills'
      });

      await expect(scheduleUpcomingNotifications()).resolves.toBeUndefined();
    });
  });
});
