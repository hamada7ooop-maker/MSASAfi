import { describe, it, expect, beforeEach } from 'vitest';
import { db as DB } from '../../src/core/db/core';
import { AccountRepository } from '../../src/core/db/repositories/accounts';
import { BudgetRepository } from '../../src/core/db/repositories/budgets';
import { GoalRepository } from '../../src/core/db/repositories/goals';
import { RuleRepository } from '../../src/core/db/repositories/rules';
import { NotificationRepository } from '../../src/core/db/repositories/notifications';
import { BillService } from '../../src/core/db/services/billService';

describe('Comprehensive Repositories & DB Services Unit Tests', () => {
  beforeEach(async () => {
    await DB.accounts.clear();
    await DB.budgets.clear();
    await DB.goals.clear();
    await DB.classificationRules.clear();
    await DB.notifications.clear();
    await DB.bills.clear();
    await DB.transactions.clear();
  });

  describe('AccountRepository', () => {
    it('creates, reads, updates and balances accounts', async () => {
      const created = await AccountRepository.add({
        name: 'Main Bank Account',
        type: 'checking',
        balance: 5000,
        currency: 'SAR',
        icon: 'account_balance',
        color: '#3b82f6',
      });

      const retrieved = await AccountRepository.getById(created.id);
      expect(retrieved?.name).toBe('Main Bank Account');
      expect(retrieved?.balance).toBe(5000);

      // Total balance
      const total = await AccountRepository.getTotalBalance();
      expect(total).toBe(5000);
    });
  });

  describe('BudgetRepository', () => {
    it('manages budgets and retrieves all', async () => {
      const created = await BudgetRepository.add({
        category: 'مطاعم',
        limit: 1500,
        month: '2026-08',
      });

      const all = await BudgetRepository.getAll();
      expect(all).toHaveLength(1);
      expect(all[0].category).toBe('مطاعم');

      await BudgetRepository.delete(created.id);
      const empty = await BudgetRepository.getAll();
      expect(empty).toHaveLength(0);
    });
  });

  describe('GoalRepository', () => {
    it('manages goals lifecycle and progress', async () => {
      const created = await GoalRepository.add({
        name: 'New Car',
        target: 20000,
        saved: 5000,
        category: 'saving',
        color: '#10b981',
      });

      const all = await GoalRepository.getAll();
      expect(all).toHaveLength(1);
      expect(all[0].target).toBe(20000);

      await GoalRepository.update(created.id, { saved: 10000 });
      const updated = (await GoalRepository.getAll()).find((g) => g.id === created.id);
      expect(updated?.saved).toBe(10000);
    });
  });

  describe('RuleRepository', () => {
    it('manages and matches auto-categorization rules', async () => {
      await RuleRepository.add({
        pattern: 'uber',
        category: 'مواصلات',
        matchType: 'contains',
      });

      const matched = await RuleRepository.match('Uber trip to office');
      expect(matched).toBe('مواصلات');

      const nonMatched = await RuleRepository.match('Coffee purchase');
      expect(nonMatched).toBeNull();
    });
  });

  describe('NotificationRepository', () => {
    it('manages app notifications in database', async () => {
      const added = await NotificationRepository.add({
        title: 'Welcome',
        message: 'Welcome to Masarifi!',
        type: 'info',
        icon: 'info',
      });

      const count = await NotificationRepository.getUnreadCount();
      expect(count).toBe(1);

      await NotificationRepository.markAsRead(added.id);
      const countAfter = await NotificationRepository.getUnreadCount();
      expect(countAfter).toBe(0);
    });
  });

  describe('BillService', () => {
    it('processes bill payment and updates account balance', async () => {
      await DB.accounts.add({ id: 'acc_pay', name: 'Salary', balance: 5000, type: 'checking', currency: 'SAR', icon: 'wallet', color: '#1' });
      await DB.bills.add({ id: 'bill_1', name: 'STC Fiber', amount: 300, dueDate: '2026-08-30', isPaid: false, type: 'bill' });

      await BillService.markBillPaid(DB, 'bill_1', 'acc_pay');

      const bill = await DB.bills.get('bill_1');
      expect(bill?.isPaid).toBe(true);

      const acc = await DB.accounts.get('acc_pay');
      expect(acc?.balance).toBe(4700);
    });
  });
});
