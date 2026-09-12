import { describe, test, expect, beforeEach } from 'vitest';
import { db } from '@/core/db/core';
import { AccountRepository } from '@/core/db/repositories/accounts';
import { TransactionRepository } from '@/core/db/repositories/transactions';

describe('Integration Tests', () => {
  beforeEach(async () => {
    await db.transactions.clear();
    await db.accounts.clear();
  });

  test('full transaction flow — add account and transaction', async () => {
    // 1. Add account
    const acc = await AccountRepository.add({ name: 'Test', type: 'cash', balance: 1000 });
    expect(acc.id).toBeDefined();

    // 2. Add transaction linked to account
    const txn = await TransactionRepository.add({
      type: 'expense',
      amount: 100,
      category: 'طعام',
      accountId: acc.id
    });
    expect(txn.id).toBeDefined();

    // 3. Verify account exists
    const updatedAccount = await AccountRepository.getById(acc.id);
    expect(updatedAccount).toBeDefined();
    expect(updatedAccount?.id).toBe(acc.id);
  });
});
