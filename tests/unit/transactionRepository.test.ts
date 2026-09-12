import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../../src/core/db/core';
import { TransactionRepository } from '../../src/core/db/repositories/transactions';
import { AccountRepository } from '../../src/core/db/repositories/accounts';
import type { Account } from '@/types';

describe('TransactionRepository Unit Tests', () => {
  let testAccount: Account;

  beforeEach(async () => {
    await db.transactions.clear();
    await db.accounts.clear();
    await db.auditLog.clear();

    testAccount = await AccountRepository.add({
      name: 'Main Wallet',
      type: 'cash',
      balance: 5000,
      currency: 'USD',
      color: '#2563eb',
      icon: 'account_balance_wallet',
    });
  });

  it('adds an expense transaction and updates linked account balance', async () => {
    const created = await TransactionRepository.add({
      amount: 250,
      type: 'expense',
      category: 'مطاعم',
      accountId: testAccount.id,
      date: '2026-08-30',
      description: 'Dinner with family',
    });

    expect(created.id).toBeDefined();
    expect(created.amount).toBe(250);

    const acc = await AccountRepository.getById(testAccount.id);
    expect(acc?.balance).toBe(4750);
  });

  it('adds an income transaction and increases account balance', async () => {
    await TransactionRepository.add({
      amount: 1000,
      type: 'income',
      category: 'راتب',
      accountId: testAccount.id,
      date: '2026-08-30',
      description: 'Freelance payment',
    });

    const acc = await AccountRepository.getById(testAccount.id);
    expect(acc?.balance).toBe(6000);
  });

  it('duplicates a transaction correctly', async () => {
    const original = await TransactionRepository.add({
      amount: 150,
      type: 'expense',
      category: 'تسوق',
      accountId: testAccount.id,
      date: '2026-08-30',
      description: 'Book purchase',
    });

    const duplicated = await TransactionRepository.duplicate(original.id);
    expect(duplicated).not.toBeNull();
    expect(duplicated?.id).not.toBe(original.id);
    expect(duplicated?.amount).toBe(150);
    expect(duplicated?.description).toBe('Book purchase');
  });

  it('handles soft deletion and balance reversion', async () => {
    const txn = await TransactionRepository.add({
      amount: 500,
      type: 'expense',
      category: 'سكن',
      accountId: testAccount.id,
      date: '2026-08-30',
    });

    let acc = await AccountRepository.getById(testAccount.id);
    expect(acc?.balance).toBe(4500);

    await TransactionRepository.delete(txn.id);

    acc = await AccountRepository.getById(testAccount.id);
    expect(acc?.balance).toBe(5000);

    const deleted = await TransactionRepository.getDeleted();
    expect(deleted.some((d) => d.id === txn.id)).toBe(true);
  });
});
