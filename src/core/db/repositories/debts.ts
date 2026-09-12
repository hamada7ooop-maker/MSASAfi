import { db } from '../core';
import type { Debt } from '@/types';

export const DebtRepository = {
  async getAll(): Promise<Debt[]> {
    return await db.debts.toArray();
  },

  async getOwed(): Promise<Debt[]> {
    const all = await this.getAll();
    return all.filter(d => d.type === 'owed');
  },

  async add(d: Omit<Debt, 'id' | 'createdAt'>): Promise<Debt> {
    const id = Date.now().toString(36) + Math.random().toString(36).substring(2, 11);
    const item: Debt = { ...d, id, createdAt: new Date().toISOString() };
    await db.debts.put(item);
    return item;
  },

  async update(id: string, data: Partial<Debt>): Promise<void> {
    await db.debts.update(id, data);
  },

  async delete(id: string): Promise<void> {
    await db.debts.delete(id);
  }
};
