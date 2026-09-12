import { describe, it, expect, beforeEach } from 'vitest';
import { db as DB } from '@/core/db/core';
import { DebtService } from '../../src/core/db/services/debtService';
import { GoalService } from '../../src/core/db/services/goalService';
import { SettingsRepository } from '../../src/core/db/repositories/settings';
import type { Debt, Goal } from '../../src/types';

describe('Error Paths & Fault-Tolerance Tests', () => {
  beforeEach(async () => {
    await DB.debts.clear();
    await DB.accounts.clear();
    await DB.goals.clear();
    await DB.transactions.clear();
    await DB.settings.clear();
  });

  describe('DebtService Error Scenarios', () => {
    it('handles payDebt gracefully when specified accountId does not exist', async () => {
      const debt: Debt = {
        id: 'debt_orphan_1',
        name: 'Car Loan',
        type: 'owed',
        total: 5000,
        paid: 1000
      };
      await DB.debts.add(debt);

      // Attempt payment referencing a non-existent account
      const result = await DebtService.payDebt(DB, 'debt_orphan_1', 500, 'non_existent_account_id');

      expect(result).toBeDefined();
      expect(result?.paid).toBe(1500);

      // Debt is updated, but no orphan transaction was created and app did not crash
      const updatedDebt = await DB.debts.get('debt_orphan_1');
      expect(updatedDebt?.paid).toBe(1500);
      const txCount = await DB.transactions.count();
      expect(txCount).toBe(0);
    });

    it('handles payDebt gracefully when no accounts exist in DB at all', async () => {
      const debt: Debt = {
        id: 'debt_no_acc_1',
        name: 'Friend Loan',
        type: 'lent',
        total: 1000,
        paid: 0
      };
      await DB.debts.add(debt);

      // No account passed, and DB has 0 accounts
      const result = await DebtService.payDebt(DB, 'debt_no_acc_1', 300);

      expect(result).toBeDefined();
      expect(result?.paid).toBe(300);
      const txCount = await DB.transactions.count();
      expect(txCount).toBe(0);
    });

    it('returns undefined when paying a non-existent debt ID', async () => {
      const result = await DebtService.payDebt(DB, 'ghost_debt', 500);
      expect(result).toBeUndefined();
    });
  });

  describe('GoalService Error Scenarios', () => {
    it('handles addToGoal gracefully when specified accountId does not exist', async () => {
      const goal: Goal = {
        id: 'goal_err_1',
        title: 'Emergency Fund',
        target: 10000,
        saved: 2000,
        category: 'savings',
        color: '#10b981',
        icon: 'savings'
      };
      await DB.goals.add(goal);

      const result = await GoalService.addToGoal(DB, 'goal_err_1', 1000, 'invalid_account_id');

      expect(result).toBeDefined();
      expect(result?.saved).toBe(3000);
      
      const updatedGoal = await DB.goals.get('goal_err_1');
      expect(updatedGoal?.saved).toBe(3000);
      const txCount = await DB.transactions.count();
      expect(txCount).toBe(0);
    });

    it('returns undefined when depositing into non-existent goal ID', async () => {
      const result = await GoalService.addToGoal(DB, 'ghost_goal', 500);
      expect(result).toBeUndefined();
    });
  });

  describe('SettingsRepository Error & Missing Key Handling', () => {
    it('returns null safely when key does not exist in DB', async () => {
      const val = await SettingsRepository.get('unregistered_random_key');
      expect(val).toBeNull();
    });

    it('returns default fallback object from getAll when settings table is empty', async () => {
      const allSettings = await SettingsRepository.getAll();
      expect(allSettings).toBeDefined();
      expect(typeof allSettings).toBe('object');
      expect(Object.keys(allSettings).length).toBe(0);
    });
  });
});
