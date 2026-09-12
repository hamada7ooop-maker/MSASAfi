import { describe, it, expect, beforeEach } from 'vitest';
import { db as DB } from '../../src/core/db/core';
import { CategoryInitService } from '../../src/core/db/services/categoryInitService';
import { AccountRepository } from '../../src/core/db/repositories/accounts';
import { SettingsRepository } from '../../src/core/db/repositories/settings';

describe('CategoryInitService & SettingsRepository Unit Tests', () => {
  beforeEach(async () => {
    await DB.categories.clear();
    await DB.accounts.clear();
    await DB.settings.clear();
    await DB.transactions.clear();
  });

  describe('CategoryInitService', () => {
    it('initializes default categories and handles forced re-initialization', async () => {
      await CategoryInitService.initDefaultCategories(DB);
      const count = await DB.categories.count();
      expect(count).toBeGreaterThan(15);

      // Duplicate cleanup and append
      await DB.categories.add({
        id: 'cat_dup',
        name: 'مواد غذائية',
        icon: '🛒',
        color: '#f59e0b',
        type: 'expense',
        order: 99,
      });

      await CategoryInitService.appendMissingDefaultCategories(DB);
      const cleanedCount = await DB.categories.count();
      expect(cleanedCount).toBe(count);
    });

    it('initializes default accounts if empty', async () => {
      await CategoryInitService.initDefaultAccounts(DB);
      const accounts = await DB.accounts.toArray();
      expect(accounts).toHaveLength(1);
      expect(accounts[0].name).toBe('المحفظة الرئيسية');
    });

    it('repairs missing category order fields', async () => {
      await DB.categories.add({
        id: 'cat_no_order',
        name: 'Custom Unordered',
        icon: 'star',
        color: '#3b82f6',
        type: 'expense',
        order: undefined as unknown as number,
      });

      await CategoryInitService.repairCategories(DB);
      const repaired = await DB.categories.get('cat_no_order');
      expect(repaired?.order).toBeDefined();
    });
  });

  describe('Account Balance Repair (repairBalances)', () => {
    it('repairs corrupted NaN balances automatically', async () => {
      sessionStorage.clear();
      await DB.accounts.add({
        id: 'acc_corrupted',
        name: 'Corrupted Account',
        type: 'cash',
        balance: NaN,
        initialBalance: 1000,
        currency: 'SAR',
        icon: 'wallet',
        color: '#1',
      });

      await DB.transactions.add({
        id: 'tx_rec',
        amount: 300,
        type: 'expense',
        category: 'سفر',
        accountId: 'acc_corrupted',
      });

      await AccountRepository.repairBalances();
      const repaired = await DB.accounts.get('acc_corrupted');
      expect(repaired?.balance).toBe(700); // 1000 - 300
    });
  });

  describe('SettingsRepository', () => {
    it('handles get, set, bulkSet, getAll, and delete', async () => {
      await SettingsRepository.set('theme', 'dark');
      const theme = await SettingsRepository.get<string>('theme');
      expect(theme).toBe('dark');

      await SettingsRepository.bulkSet({
        language: 'en',
        baseCurrency: 'USD',
      });

      const all = await SettingsRepository.getAll();
      expect(all.theme).toBe('dark');
      expect(all.language).toBe('en');
      expect(all.baseCurrency).toBe('USD');

      await SettingsRepository.delete('theme');
      expect(await SettingsRepository.get('theme')).toBeNull();
    });
  });
});
