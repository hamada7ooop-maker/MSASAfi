import { describe, it, expect, beforeEach } from 'vitest';
import { db as DB } from '@/core/db/core';

describe('MasarifiDB Schema Comprehensive Tests (schema.ts)', () => {
  beforeEach(async () => {
    await DB.clearAll();
  });

  describe('Category & Account Initialization & Cleanup Services', () => {
    it('initializes default categories and accounts', async () => {
      await DB.initDefaultCategories(true);
      const categories = await DB.getCategories();
      expect(categories.length).toBeGreaterThan(0);

      await DB.initDefaultAccounts();
      const accounts = await DB.getAccounts();
      expect(accounts.length).toBeGreaterThan(0);
    });

    it('cleans up duplicate categories and repairs missing categories', async () => {
      await DB.initDefaultCategories(true);
      await DB.cleanupDuplicateCategories();
      await DB.appendMissingDefaultCategories();
      await DB.repairCategories();

      const cats = await DB.getCategories();
      expect(cats.length).toBeGreaterThan(0);
    });

    it('cleans up duplicate assets gracefully', async () => {
      await DB.cleanupDuplicateAssets();
      const assets = await DB.getAssets();
      expect(Array.isArray(assets)).toBe(true);
    });
  });

  describe('Financial Delegation Methods (Goals, Debts, Bills, Subs)', () => {
    it('adds to goal and retrieves goal transactions', async () => {
      const accId = await DB.addAccount({
        name: 'Goal Savings Acc',
        balance: 5000,
        currency: 'SAR',
        type: 'savings',
        color: '#1',
        icon: 'wallet'
      });

      const goalId = await DB.addGoal({
        name: 'New Car',
        targetAmount: 20000,
        currentAmount: 1000,
        deadline: '2027-01-01',
        category: 'Transport',
        color: '#ff0000',
        icon: 'directions_car',
        isCompleted: false
      });

      const updatedGoal = await DB.addToGoal(goalId, 500, accId);
      expect(updatedGoal).toBeDefined();

      const goalTxns = await DB.getGoalTransactions(goalId);
      expect(Array.isArray(goalTxns)).toBe(true);
    });

    it('pays debt and records payment', async () => {
      const accId = await DB.addAccount({
        name: 'Debt Pay Acc',
        balance: 2000,
        currency: 'SAR',
        type: 'checking',
        color: '#2',
        icon: 'bank'
      });

      const debtId = await DB.addDebt({
        person: 'Brother Loan',
        amount: 1000,
        paidAmount: 0,
        type: 'owed',
        dueDate: '2026-12-01',
        isDemo: false
      });

      const res = await DB.payDebt(debtId, 300, accId);
      expect(res).toBeDefined();

      const updated = await DB.getDebt(debtId);
      expect(updated).toBeDefined();
    });

    it('marks bill as paid and pays subscription', async () => {
      const accId = await DB.addAccount({
        name: 'Bills Acc',
        balance: 3000,
        currency: 'SAR',
        type: 'checking',
        color: '#3',
        icon: 'card'
      });

      const billId = await DB.addBill({
        name: 'Water Bill',
        amount: 120,
        dueDate: '2026-10-15',
        category: 'Utilities',
        isPaid: false
      });

      await DB.markBillPaid(billId, accId);
      const bill = await DB.getBill(billId);
      expect(bill?.isPaid).toBe(true);

      const subId = await DB.addSubscription({
        name: 'Spotify Premium',
        amount: 25,
        billingCycle: 'monthly',
        nextBillingDate: '2026-09-15',
        category: 'Entertainment'
      });

      await DB.paySubscription(subId, accId);
      const sub = await DB.getSubscription(subId);
      expect(sub).toBeDefined();
    });
  });

  describe('Recurring Transactions Methods', () => {
    it('manages recurring transactions lifecycle and processing', async () => {
      const id = await DB.addRecurringTransaction({
        description: 'Monthly Salary',
        amount: 8000,
        type: 'income',
        category: 'Salary',
        frequency: 'monthly',
        startDate: '2026-01-01',
        nextDate: '2026-02-01',
        active: true
      });

      let recurrings = await DB.getRecurringTransactions();
      expect(recurrings.some(r => r.id === id)).toBe(true);

      await DB.updateRecurringTransaction(id, { amount: 8500 });
      recurrings = await DB.getRecurringTransactions();
      expect(recurrings.find(r => r.id === id)?.amount).toBe(8500);

      await expect(DB.processRecurringTransactions()).resolves.not.toThrow();

      await DB.deleteRecurringTransaction(id);
      recurrings = await DB.getRecurringTransactions();
      expect(recurrings.some(r => r.id === id)).toBe(false);
    });
  });

  describe('Demo Data & Wipe Methods', () => {
    it('seeds and clears demo data correctly', async () => {
      await DB.seedDemoData(true);
      const seededTxns = await DB.getTransactions();
      expect(seededTxns.length).toBeGreaterThan(0);

      const clearedCount = await DB.clearDemoData();
      expect(clearedCount).toBeGreaterThanOrEqual(0);

      await DB.clearAll();
      const emptyTxns = await DB.getTransactions();
      expect(emptyTxns.length).toBe(0);
    });
  });

  describe('CRUD Helpers & Summary Aggregations', () => {
    it('saves transaction, computes total balance, monthly stats, and category breakdown', async () => {
      const accId = await DB.addAccount({
        name: 'Cash Pocket',
        balance: 1000,
        currency: 'SAR',
        type: 'cash',
        color: '#4',
        icon: 'payments'
      });

      const txnId = await DB.saveTransaction({
        amount: 200,
        type: 'expense',
        category: 'Food',
        date: '2026-09-01',
        description: 'Lunch with team',
        accountId: accId
      });

      expect(txnId).toBeDefined();
      const txn = await DB.getTransaction(txnId);
      expect(txn?.amount).toBe(200);

      await DB.updateTransaction(txnId, { description: 'Updated Lunch' });
      const updatedTxn = await DB.getTransaction(txnId);
      expect(updatedTxn?.description).toBe('Updated Lunch');

      // Balance & aggregations
      const totalBal = await DB.getTotalBalance();
      expect(typeof totalBal).toBe('number');

      const monthlyStats = await DB.getMonthlyStats(2026, 8); // month is 0-indexed (8 = September)
      expect(monthlyStats).toHaveProperty('income');
      expect(monthlyStats).toHaveProperty('expense');

      const breakdown = await DB.getCategoryBreakdown(2026, 8);
      expect(breakdown).toHaveProperty('Food');

      await DB.deleteTransaction(txnId);
      const deletedTxn = await DB.getTransaction(txnId);
      expect(deletedTxn).toBeUndefined();
    });

    it('performs CRUD for Category, Budget, and Installment', async () => {
      // Category
      const catId = await DB.addCategory({
        name: 'Custom Utilities',
        type: 'expense',
        icon: 'bolt',
        color: '#f59e0b'
      });
      expect(await DB.getCategory(catId)).toBeDefined();
      await DB.updateCategory(catId, { name: 'Energy & Power' });
      expect((await DB.getCategory(catId))?.name).toBe('Energy & Power');
      await DB.deleteCategory(catId);
      expect(await DB.getCategory(catId)).toBeUndefined();

      // Budget
      const budId = await DB.addBudget({
        category: 'Food',
        limit: 1500,
        period: 'monthly'
      });
      expect(await DB.getBudget(budId)).toBeDefined();
      await DB.updateBudget(budId, { limit: 1800 });
      expect((await DB.getBudget(budId))?.limit).toBe(1800);
      await DB.deleteBudget(budId);
      expect(await DB.getBudget(budId)).toBeUndefined();

      // Installment
      const instId = await DB.addInstallment({
        title: 'MacBook Pro',
        totalAmount: 9600,
        monthlyAmount: 800,
        paidPayments: 1,
        totalPayments: 12,
        dueDate: '2026-10-01',
        isDemo: false
      });
      expect(await DB.getInstallments()).toHaveLength(1);
      await DB.updateInstallment(instId, { paidPayments: 2 });
      await DB.deleteInstallment(instId);
      expect(await DB.getInstallments()).toHaveLength(0);

      // Investment
      const invId = await DB.addInvestment({
        name: 'Tech ETF',
        type: 'crypto',
        initialAmount: 5000,
        currentValue: 6000,
        purchaseDate: '2026-01-01',
        isDemo: false
      });
      expect(await DB.getInvestment(invId)).toBeDefined();
      await DB.updateInvestment(invId, { currentValue: 6500 });
      expect((await DB.getInvestment(invId))?.currentValue).toBe(6500);
      await DB.deleteInvestment(invId);
      expect(await DB.getInvestment(invId)).toBeUndefined();

      // Subscription
      const subId = await DB.addSubscription({
        name: 'GitHub Copilot',
        amount: 38,
        billingCycle: 'monthly',
        nextBillingDate: '2026-10-01',
        category: 'Work'
      });
      expect(await DB.getSubscription(subId)).toBeDefined();
      await DB.updateSubscription(subId, { amount: 40 });
      expect((await DB.getSubscription(subId))?.amount).toBe(40);
      await DB.deleteSubscription(subId);
      expect(await DB.getSubscription(subId)).toBeUndefined();

      // Challenge
      const chId = await DB.addChallenge({
        title: 'No Dining Out',
        description: 'Cook at home for a week',
        target: 7,
        current: 3,
        reward: 'Master Chef Badge',
        isCompleted: false,
        progress: 42,
        isDemo: false
      });
      expect(await DB.getChallenge(chId)).toBeDefined();
      await DB.updateChallenge(chId, { progress: 100, isCompleted: true });
      expect((await DB.getChallenge(chId))?.isCompleted).toBe(true);
      await DB.deleteChallenge(chId);
      expect(await DB.getChallenge(chId)).toBeUndefined();
    });

    it('records and prunes audit log entries', async () => {
      await DB.recordAction('schema_test_action', 'Testing audit log retention', { k: 'v' });
      const logs = await DB.getAuditLog();
      expect(logs.length).toBeGreaterThan(0);
      expect(logs.some(l => l.action === 'schema_test_action')).toBe(true);

      await expect(DB.pruneAuditLog(0)).resolves.toBeUndefined();
    });
  });
});
