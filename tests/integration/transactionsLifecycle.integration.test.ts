import { describe, it, expect, beforeEach } from 'vitest';
import { db as DB } from '@/core/db/core';
import { TransactionRepository } from '../../src/core/db/repositories/transactions';
import type { Account } from '../../src/types';

describe('Transactions Lifecycle Integration Tests (Add → DB → Calculations → Balance Reconcile)', () => {
  beforeEach(async () => {
    await DB.transactions.clear();
    await DB.accounts.clear();
    if (DB.auditLog) await DB.auditLog.clear();
  });

  it('should execute full cycle: Add Expense → Account Balance Deducted → Query Transactions List', async () => {
    // 1. Setup Bank Account
    const acc: Account = {
      id: 'acc_lifecycle_1',
      name: 'Primary Bank',
      balance: 5000,
      color: '#3b82f6',
      icon: 'account_balance',
      type: 'bank'
    };
    await DB.accounts.add(acc);

    // 2. Add Expense Transaction via TransactionRepository
    const tx = await TransactionRepository.add({
      amount: 450,
      type: 'expense',
      category: 'مواد غذائية',
      description: 'Weekly Groceries',
      date: '2026-05-10',
      accountId: 'acc_lifecycle_1',
      account: 'Primary Bank'
    });

    expect(tx).toBeDefined();
    expect(tx.id).toBeDefined();

    // 3. Verify Account Balance Automatically Decremented (5000 - 450 = 4550)
    const updatedAcc = await DB.accounts.get('acc_lifecycle_1');
    expect(updatedAcc?.balance).toBe(4550);

    // 4. Verify Transaction persisted and queryable
    const allTxns = await DB.getTransactions();
    expect(allTxns.length).toBe(1);
    expect(allTxns[0].description).toBe('Weekly Groceries');
    expect(allTxns[0].amount).toBe(450);

    // 5. Add Income Transaction (e.g. Salary 10000)
    await TransactionRepository.add({
      amount: 10000,
      type: 'income',
      category: 'راتب',
      description: 'May Salary',
      date: '2026-05-25',
      accountId: 'acc_lifecycle_1',
      account: 'Primary Bank'
    });

    const finalAcc = await DB.accounts.get('acc_lifecycle_1');
    // 4550 + 10000 = 14550
    expect(finalAcc?.balance).toBe(14550);

    // 6. Delete Transaction (Soft delete) & Reconcile
    await TransactionRepository.delete(tx.id);
    const restoredAcc = await DB.accounts.get('acc_lifecycle_1');
    // Deleting 450 expense restores balance: 14550 + 450 = 15000
    expect(restoredAcc?.balance).toBe(15000);
  });
});
