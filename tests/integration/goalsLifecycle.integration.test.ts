import { describe, it, expect, beforeEach } from 'vitest';
import { db as DB } from '@/core/db/core';
import { GoalService } from '../../src/core/db/services/goalService';
import type { Account, Goal } from '../../src/types';

describe('Goals Lifecycle Integration Tests (Goal Creation → Deposits → Account Deductions → Completion)', () => {
  beforeEach(async () => {
    await DB.goals.clear();
    await DB.accounts.clear();
    await DB.transactions.clear();
    if (DB.auditLog) await DB.auditLog.clear();
  });

  it('should execute full goal lifecycle across DB, account balance and linked transactions', async () => {
    // 1. Setup account
    const acc: Account = {
      id: 'acc_emergency',
      name: 'Emergency Fund Account',
      balance: 20000,
      color: '#10b981',
      icon: 'savings',
      type: 'savings'
    };
    await DB.accounts.add(acc);

    // 2. Create Goal
    const goal: Goal = {
      id: 'goal_emergency_fund',
      name: '6 Months Expenses Reserve',
      target: 15000,
      saved: 0,
      accountId: 'acc_emergency'
    };
    await DB.goals.add(goal);

    // 3. Deposit Phase 1 (5,000 SAR)
    await GoalService.addToGoal(DB, 'goal_emergency_fund', 5000, 'acc_emergency');

    let g = await DB.goals.get('goal_emergency_fund');
    let a = await DB.accounts.get('acc_emergency');
    expect(g?.saved).toBe(5000);
    expect(a?.balance).toBe(15000); // 20000 - 5000

    // 4. Deposit Phase 2 (10,000 SAR - Complete Goal)
    await GoalService.addToGoal(DB, 'goal_emergency_fund', 10000, 'acc_emergency');

    g = await DB.goals.get('goal_emergency_fund');
    a = await DB.accounts.get('acc_emergency');
    expect(g?.saved).toBe(15000); // 100% reached
    expect(a?.balance).toBe(5000); // 15000 - 10000

    // 5. Verify goal transaction history
    const history = await GoalService.getGoalTransactions(DB, 'goal_emergency_fund');
    expect(history.length).toBe(2);
    expect(history[0].amount).toBe(5000);
    expect(history[1].amount).toBe(10000);
  });
});
