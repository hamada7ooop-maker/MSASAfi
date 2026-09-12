import { describe, it, expect, beforeEach } from 'vitest';
import {
  CURRENCIES,
  CURRENCY_RATES,
  setCurrencyRates,
  detectUserCurrency,
} from '../../src/core/currency';
import {
  refreshSystemNotifications,
  triggerNotificationRefresh,
} from '../../src/core/notificationManager';
import { db as DB } from '../../src/core/db/core';
import { useAppStore } from '../../src/store/appStore';

describe('Currency Service & NotificationManager Unit Tests', () => {
  beforeEach(async () => {
    await DB.notifications.clear();
    await DB.bills.clear();
    await DB.accounts.clear();
    await DB.budgets.clear();
    await DB.transactions.clear();
  });

  describe('Currency Service (currency.ts)', () => {
    it('contains metadata for global and regional currencies', () => {
      expect(CURRENCIES.SAR.symbol).toBe('﷼');
      expect(CURRENCIES.USD.symbol).toBe('$');
      expect(CURRENCIES.EUR.symbol).toBe('€');
      expect(CURRENCIES.KWD.decimals).toBe(3);
    });

    it('updates currency conversion rates dynamically', () => {
      setCurrencyRates({ SAR: 3.75, EUR: 0.92 });
      expect(CURRENCY_RATES.SAR).toBe(3.75);
      expect(CURRENCY_RATES.EUR).toBe(0.92);
    });

    it('detects user currency offline using timezone and locale', async () => {
      const guessed = await detectUserCurrency();
      expect(typeof guessed).toBe('string');
      expect(guessed.length).toBe(3);
    });
  });

  describe('Notification Manager (notificationManager.ts)', () => {
    it('generates overdue bill warnings and negative balance alerts', async () => {
      const pastDate = '2020-01-01';

      // Add overdue bill
      await DB.bills.add({
        id: 'bill_past',
        name: 'Internet Fiber',
        amount: 350,
        dueDate: pastDate,
        isPaid: false,
        type: 'bill',
      });

      // Add negative account
      await DB.accounts.add({
        id: 'acc_neg',
        name: 'Overdrawn Card',
        type: 'credit',
        balance: -500,
        currency: 'SAR',
        icon: 'credit_card',
        color: '#1',
      });

      const count = await refreshSystemNotifications();
      expect(count).toBeGreaterThanOrEqual(1);

      const unreadCount = await triggerNotificationRefresh();
      expect(useAppStore.getState().notifCount).toBe(unreadCount);
    });

    it('generates budget overrun and warning notifications', async () => {
      await DB.budgets.add({
        id: 'b_food',
        category: 'مطاعم',
        limit: 500,
      });

      const now = new Date().toISOString();
      await DB.transactions.add({
        id: 'txn_heavy',
        amount: 550,
        type: 'expense',
        category: 'مطاعم',
        date: now,
      });

      const count = await refreshSystemNotifications();
      expect(count).toBeGreaterThanOrEqual(1);
    });
  });
});
