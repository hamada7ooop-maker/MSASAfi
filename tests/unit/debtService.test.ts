import { describe, it, expect, beforeEach } from 'vitest';
import { db as DB } from '@/core/db/core';
import { DebtService } from '../../src/core/db/services/debtService';
import type { Debt, Account } from '../../src/types';

describe('DebtService Unit Tests', () => {
  beforeEach(async () => {
    await DB.debts.clear();
    await DB.accounts.clear();
    await DB.transactions.clear();
    if (DB.auditLog) await DB.auditLog.clear();
  });

  it('should correctly process paying back money you owe (owed debt decreases balance)', async () => {
    const acc: Account = {
      id: 'acc_main',
      name: 'Main Bank',
      balance: 5000,
      color: '#3b82f6',
      icon: 'account_balance',
      type: 'bank'
    };
    await DB.accounts.add(acc);

    const debt: Debt = {
      id: 'debt_owed_1',
      name: 'Personal Loan',
      type: 'owed',
      total: 1000,
      paid: 200,
      accountId: 'acc_main'
    };
    await DB.debts.add(debt);

    const result = await DebtService.payDebt(DB, 'debt_owed_1', 300, 'acc_main');

    expect(result).toBeDefined();
    expect(result?.paid).toBe(500);

    // Verify Debt table updated
    const updatedDebt = await DB.debts.get('debt_owed_1');
    expect(updatedDebt?.paid).toBe(500);

    // Verify Account balance decreased (5000 - 300 = 4700)
    const updatedAcc = await DB.accounts.get('acc_main');
    expect(updatedAcc?.balance).toBe(4700);

    // Verify Transaction created
    const txs = await DB.transactions.where('accountId').equals('acc_main').toArray();
    expect(txs.length).toBe(1);
    expect(txs[0].type).toBe('expense');
    expect(txs[0].amount).toBe(300);
  });

  it('should correctly process collecting money you lent (lent debt increases balance)', async () => {
    const acc: Account = {
      id: 'acc_cash',
      name: 'Cash Wallet',
      balance: 1000,
      color: '#10b981',
      icon: 'wallet',
      type: 'cash'
    };
    await DB.accounts.add(acc);

    const debt: Debt = {
      id: 'debt_lent_1',
      name: 'Money lent to friend',
      type: 'lent',
      total: 800,
      paid: 0,
      accountId: 'acc_cash'
    };
    await DB.debts.add(debt);

    const result = await DebtService.payDebt(DB, 'debt_lent_1', 400, 'acc_cash');

    expect(result?.paid).toBe(400);

    // Verify Account balance increased (1000 + 400 = 1400)
    const updatedAcc = await DB.accounts.get('acc_cash');
    expect(updatedAcc?.balance).toBe(1400);

    // Verify Transaction created as income
    const txs = await DB.transactions.where('accountId').equals('acc_cash').toArray();
    expect(txs.length).toBe(1);
    expect(txs[0].type).toBe('income');
    expect(txs[0].amount).toBe(400);
  });

  it('returns undefined if debt does not exist', async () => {
    const result = await DebtService.payDebt(DB, 'non_existent', 100);
    expect(result).toBeUndefined();
  });
});
