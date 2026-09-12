import { describe, it, expect, beforeEach } from 'vitest';
import { db as DB } from '@/core/db/core';
import { GoalService } from '../../src/core/db/services/goalService';
import type { Goal, Account } from '../../src/types';

describe('GoalService Unit Tests', () => {
  beforeEach(async () => {
    await DB.goals.clear();
    await DB.accounts.clear();
    await DB.transactions.clear();
    if (DB.auditLog) await DB.auditLog.clear();
  });

  it('should deposit money into goal and reduce linked account balance', async () => {
    const acc: Account = {
      id: 'acc_savings',
      name: 'Savings Bank',
      balance: 10000,
      color: '#3b82f6',
      icon: 'savings',
      type: 'savings'
    };
    await DB.accounts.add(acc);

    const goal: Goal = {
      id: 'goal_car_1',
      name: 'Buy a Car',
      target: 50000,
      saved: 5000,
      accountId: 'acc_savings'
    };
    await DB.goals.add(goal);

    const result = await GoalService.addToGoal(DB, 'goal_car_1', 2000, 'acc_savings');

    expect(result).toBeDefined();
    expect(result?.saved).toBe(7000);

    // Verify Goal in DB
    const updatedGoal = await DB.goals.get('goal_car_1');
    expect(updatedGoal?.saved).toBe(7000);

    // Verify Account balance decreased (10000 - 2000 = 8000)
    const updatedAcc = await DB.accounts.get('acc_savings');
    expect(updatedAcc?.balance).toBe(8000);

    // Verify Transaction created with goalId
    const goalTxs = await GoalService.getGoalTransactions(DB, 'goal_car_1');
    expect(goalTxs.length).toBe(1);
    expect(goalTxs[0].amount).toBe(2000);
    expect(goalTxs[0].goalId).toBe('goal_car_1');
  });

  it('returns undefined if goal does not exist', async () => {
    const result = await GoalService.addToGoal(DB, 'non_existent', 500);
    expect(result).toBeUndefined();
  });
});
