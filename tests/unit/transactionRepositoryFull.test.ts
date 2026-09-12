import { describe, it, expect, beforeEach } from 'vitest';
import { db as DB } from '../../src/core/db/core';
import { TransactionRepository } from '../../src/core/db/repositories/transactions';
import type { Account } from '@/types';

describe('TransactionRepository Deep Unit Tests', () => {
  beforeEach(async () => {
    await DB.transactions.clear();
    await DB.accounts.clear();
  });

  describe('CRUD & Lifecycle Transitions', () => {
    it('creates transaction, updates account balance, and duplicates it', async () => {
      const acc: Account = { id: 'acc_test', name: 'Main Wallet', type: 'cash', balance: 1000, currency: 'SAR', icon: 'wallet', color: '#1' };
      await DB.accounts.add(acc);

      const added = await TransactionRepository.add({
        amount: 200,
        type: 'expense',
        category: 'مطاعم',
        description: 'Dinner',
        accountId: 'acc_test',
        date: '2026-08-30',
      });

      expect(added.id).toBeDefined();
      const updatedAcc = await DB.accounts.get('acc_test');
      expect(updatedAcc?.balance).toBe(800); // 1000 - 200

      // Duplicate
      const dup = await TransactionRepository.duplicate(added.id);
      expect(dup).not.toBeNull();
      expect(dup?.description).toBe('Dinner');
      const updatedAcc2 = await DB.accounts.get('acc_test');
      expect(updatedAcc2?.balance).toBe(600); // 800 - 200
    });

    it('handles draft to active and active to draft transitions', async () => {
      const acc: Account = { id: 'acc_draft', name: 'Draft Acc', type: 'cash', balance: 1000, currency: 'SAR', icon: 'wallet', color: '#1' };
      await DB.accounts.add(acc);

      // Create draft transaction (balance should NOT change)
      const draftTxn = await TransactionRepository.add({
        amount: 150,
        type: 'expense',
        category: 'تسوق',
        description: 'Shopping Draft',
        accountId: 'acc_draft',
        isDraft: true,
      });

      let currentAcc = await DB.accounts.get('acc_draft');
      expect(currentAcc?.balance).toBe(1000);

      // Publish draft (transition from draft to active)
      await TransactionRepository.update(draftTxn.id, { isDraft: false });
      currentAcc = await DB.accounts.get('acc_draft');
      expect(currentAcc?.balance).toBe(850); // 1000 - 150

      // Transition back to draft (balance should revert)
      await TransactionRepository.update(draftTxn.id, { isDraft: true });
      currentAcc = await DB.accounts.get('acc_draft');
      expect(currentAcc?.balance).toBe(1000);
    });

    it('handles type change and account change on update', async () => {
      await DB.accounts.add({ id: 'acc_a', name: 'Acc A', type: 'cash', balance: 1000, currency: 'SAR', icon: 'wallet', color: '#1' });
      await DB.accounts.add({ id: 'acc_b', name: 'Acc B', type: 'cash', balance: 1000, currency: 'SAR', icon: 'wallet', color: '#2' });

      // Expense 100 on acc_a -> balance becomes 900
      const txn = await TransactionRepository.add({
        amount: 100,
        type: 'expense',
        category: 'سفر',
        accountId: 'acc_a',
      });

      // Switch to Income 200 on acc_b
      await TransactionRepository.update(txn.id, {
        amount: 200,
        type: 'income',
        accountId: 'acc_b',
      });

      const accA = await DB.accounts.get('acc_a');
      const accB = await DB.accounts.get('acc_b');

      expect(accA?.balance).toBe(1000); // 900 + 100 reverted
      expect(accB?.balance).toBe(1200); // 1000 + 200 income
    });
  });

  describe('Soft Delete, Bulk Soft Delete, Restore & Trash Bin', () => {
    it('soft deletes, restores, and hard deletes transactions', async () => {
      await DB.accounts.add({ id: 'acc_trash', name: 'Trash Acc', type: 'cash', balance: 1000, currency: 'SAR', icon: 'wallet', color: '#1' });

      const txn = await TransactionRepository.add({
        amount: 300,
        type: 'expense',
        category: 'فواتير',
        accountId: 'acc_trash',
      });

      let acc = await DB.accounts.get('acc_trash');
      expect(acc?.balance).toBe(700);

      // Soft delete
      await TransactionRepository.delete(txn.id);
      acc = await DB.accounts.get('acc_trash');
      expect(acc?.balance).toBe(1000); // Balance restored

      const deleted = await TransactionRepository.getDeleted();
      expect(deleted).toHaveLength(1);

      // Restore
      await TransactionRepository.restore(txn.id);
      acc = await DB.accounts.get('acc_trash');
      expect(acc?.balance).toBe(700); // Balance re-deducted

      // Bulk soft delete
      await TransactionRepository.deleteMany([txn.id]);
      expect(await TransactionRepository.getDeleted()).toHaveLength(1);

      // Empty trash
      await TransactionRepository.emptyTrash();
      expect(await TransactionRepository.getDeleted()).toHaveLength(0);
    });
  });

  describe('Query, Filter, and Statistics', () => {
    it('calculates monthly stats and category breakdown with splits', async () => {
      const thisMonth = new Date().toISOString();

      await TransactionRepository.add({
        amount: 5000,
        type: 'income',
        category: 'راتب',
        date: thisMonth,
      });

      await TransactionRepository.add({
        amount: 600,
        type: 'expense',
        category: 'تسوق',
        date: thisMonth,
        splits: [
          { category: 'ملابس', amount: 400 },
          { category: 'إلكترونيات', amount: 200 },
        ],
      });

      const now = new Date();
      const stats = await TransactionRepository.getMonthlyStats(now.getFullYear(), now.getMonth());
      expect(stats.income).toBe(5000);
      expect(stats.expense).toBe(600);
      expect(stats.count).toBe(2);

      const breakdown = await TransactionRepository.getCategoryBreakdown(now.getFullYear(), now.getMonth());
      expect(breakdown['ملابس']).toBe(400);
      expect(breakdown['إلكترونيات']).toBe(200);

      const count = await TransactionRepository.getTransactionsCount();
      expect(count).toBe(2);
    });
  });
});
