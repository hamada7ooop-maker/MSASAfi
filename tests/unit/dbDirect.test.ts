import { describe, test, expect, beforeEach } from 'vitest';
import { db } from '@/core/db/core';
import { TransactionRepository } from '@/core/db/repositories/transactions';
import { AccountRepository } from '@/core/db/repositories/accounts';

describe('Database Tests (Unit)', () => {
  beforeEach(async () => {
    await db.transactions.clear();
    await db.accounts.clear();
  });

  test('should add transaction and return object with id', async () => {
    const txn = {
      type: 'expense' as const,
      amount: 100,
      category: 'طعام',
      description: 'غداء'
    };

    const result = await TransactionRepository.add(txn);
    expect(result).toBeDefined();
    expect(result.id).toBeDefined();
  });

  test('getTotalBalance should return a number', async () => {
    const balance = await AccountRepository.getTotalBalance();
    expect(typeof balance).toBe('number');
  });
});
