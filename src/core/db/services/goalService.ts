import type { MasarifiDB } from '../schema';
import type { Goal, Transaction } from '@/types';
import { t } from '@/i18n/engine';

export const GoalService = {
  async getGoalTransactions(db: MasarifiDB, goalId: string): Promise<Transaction[]> {
    return db.transactions.where('goalId').equals(goalId).sortBy('date');
  },

  async addToGoal(db: MasarifiDB, goalId: string, amount: number, accountId?: string): Promise<Goal | undefined> {
    const goal = await db.goals.get(goalId);
    if (!goal) return undefined;
    const newSaved = (goal.saved || 0) + amount;
    await db.goals.update(goalId, { saved: newSaved });
    
    const accId = accountId || goal.accountId || (await db.accounts.toCollection().first())?.id;
    if (accId) {
      const acc = await db.accounts.get(accId);
      if (acc) {
        await db.accounts.update(accId, { balance: (acc.balance || 0) - amount });
        await db.addTransaction({
          amount,
          type: 'expense',
          category: 'استثمار',
          description: t('goal.depositDesc', { name: goal.name }),
          date: new Date().toISOString().slice(0, 10),
          createdAt: new Date().toISOString(),
          accountId: accId,
          account: acc.name,
          goalId: goalId
        });
      }
    }
    await db.recordAction('add_to_goal', `Added ${amount} to goal: ${goal.name}`);
    return { ...goal, saved: newSaved };
  }
};
