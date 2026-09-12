import { describe, it, expect, beforeEach } from 'vitest';
import { db as DB } from '@/core/db/core';
import { RecurringService } from '../../src/core/db/services/recurringService';
import type { RecurringTransaction, Account } from '../../src/types';

describe('RecurringService Unit Tests', () => {
  beforeEach(async () => {
    await DB.recurringTransactions.clear();
    await DB.accounts.clear();
    await DB.transactions.clear();
    if (DB.auditLog) await DB.auditLog.clear();
  });

  it('should process past due recurring transactions and update account balance', async () => {
    const acc: Account = {
      id: 'acc_salary',
      name: 'Salary Account',
      balance: 1000,
      color: '#3b82f6',
      icon: 'account_balance',
      type: 'bank'
    };
    await DB.accounts.add(acc);

    // Create recurring transaction due yesterday
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 1);
    const pastDateStr = pastDate.toISOString().slice(0, 10);

    const recurring: RecurringTransaction = {
      id: 'rec_sub_1',
      description: 'Netflix Subscription',
      amount: 50,
      type: 'expense',
      category: 'اشتراكات',
      frequency: 'monthly',
      nextDate: pastDateStr,
      isActive: true,
      autoConfirm: true,
      accountId: 'acc_salary'
    };
    await DB.recurringTransactions.add(recurring);

    await RecurringService.processRecurringTransactions(DB);

    // Verify transaction created
    const txs = await DB.transactions.toArray();
    expect(txs.length).toBeGreaterThanOrEqual(1);
    expect(txs[0].amount).toBe(50);
    expect(txs[0].type).toBe('expense');

    // Verify account balance deducted (1000 - 50 = 950)
    const updatedAcc = await DB.accounts.get('acc_salary');
    expect(updatedAcc?.balance).toBe(950);

    // Verify recurring nextDate updated to future
    const updatedRec = await DB.recurringTransactions.get('rec_sub_1');
    expect(updatedRec?.nextDate).toBeDefined();
    expect(updatedRec?.nextDate).not.toBe(pastDateStr);
  });

  it('should skip inactive recurring transactions', async () => {
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 1);

    const recurring: RecurringTransaction = {
      id: 'rec_inactive',
      description: 'Gym',
      amount: 100,
      type: 'expense',
      category: 'صحة',
      frequency: 'monthly',
      nextDate: pastDate.toISOString().slice(0, 10),
      isActive: false,
      autoConfirm: true
    };
    await DB.recurringTransactions.add(recurring);

    await RecurringService.processRecurringTransactions(DB);

    const txs = await DB.transactions.toArray();
    expect(txs.length).toBe(0);
  });
});
