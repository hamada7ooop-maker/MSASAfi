import { db } from '../core';
import type { Budget } from '@/types';
import { triggerNotificationRefresh } from '@/core/events';
import { ignore } from '@/core/utils';

/**
 * Repository for Budget-related database operations.
 */
export const BudgetRepository = {
  
  /**
   * Gets all budgets.
   */
  async getAll(): Promise<Budget[]> {
    const items = await db.budgets.toArray();
    return items.map(b => ({
      ...b,
      name: b.name || b.category,
      categories: b.categories || [b.category]
    }));
  },

  /**
   * Adds a new budget.
   */
  async add(b: Omit<Budget, 'id'>): Promise<Budget> {
    const id = Date.now().toString(36) + Math.random().toString(36).substring(2, 11);
    const item: Budget = { ...b, id };
    await db.budgets.put(item);
    triggerNotificationRefresh().catch(ignore());
    return item;
  },

  /**
   * Updates a budget.
   */
  async update(id: string, data: Partial<Budget>): Promise<void> {
    await db.budgets.update(id, data);
    triggerNotificationRefresh().catch(ignore());
  },

  /**
   * Deletes a budget.
   */
  async delete(id: string): Promise<void> {
    await db.budgets.delete(id);
    triggerNotificationRefresh().catch(ignore());
  }
};
