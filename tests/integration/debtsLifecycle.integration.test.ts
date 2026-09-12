import { describe, it, expect, beforeEach } from 'vitest';
import { db as DB } from '@/core/db/core';
import { DebtService } from '../../src/core/db/services/debtService';
import type { Account, Debt } from '../../src/types';

describe('Debts Lifecycle Integration Tests (Debt Creation → Installment Payments → Account Adjustments → Settlement)', () => {
  beforeEach(async () => {
    await DB.debts.clear();
    await DB.accounts.clear();
    await DB.transactions.clear();
    if (DB.auditLog) await DB.auditLog.clear();
  });

  it('should handle owed debt payments until full settlement with accurate account deductions', async () => {
    const acc: Account = {
      id: 'acc_debt_pay',
      name: 'Checking Account',
      balance: 10000,
      color: '#3b82f6',
      icon: 'account_balance',
      type: 'bank'
    };
    await DB.accounts.add(acc);

    const debt: Debt = {
      id: 'debt_loan_3000',
      name: 'Electronics Store Loan',
      type: 'owed',
      total: 3000,
      paid: 0,
      accountId: 'acc_debt_pay'
    };
    await DB.debts.add(debt);

    // Payment 1: 1000 SAR
    await DebtService.payDebt(DB, 'debt_loan_3000', 1000, 'acc_debt_pay');
    let d = await DB.debts.get('debt_loan_3000');
    let a = await DB.accounts.get('acc_debt_pay');
    expect(d?.paid).toBe(1000);
    expect(a?.balance).toBe(9000); // 10000 - 1000

    // Payment 2: 2000 SAR (Full settlement)
    await DebtService.payDebt(DB, 'debt_loan_3000', 2000, 'acc_debt_pay');
    d = await DB.debts.get('debt_loan_3000');
    a = await DB.accounts.get('acc_debt_pay');
    expect(d?.paid).toBe(3000); // 100% paid
    expect(a?.balance).toBe(7000); // 9000 - 2000

    // Verify 2 transaction records generated
    const txs = await DB.transactions.toArray();
    expect(txs.length).toBe(2);
    expect(txs[0].amount).toBe(1000);
    expect(txs[1].amount).toBe(2000);
  });
});
