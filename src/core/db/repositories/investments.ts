import { db } from '../core';
import type { Investment } from '@/types';

export const InvestmentRepository = {
  async getAll(): Promise<Investment[]> {
    return await db.investments.toArray();
  },

  async add(i: Omit<Investment, 'id' | 'createdAt'>): Promise<Investment> {
    const id = Date.now().toString(36) + Math.random().toString(36).substring(2, 11);
    const item: Investment = { ...i, id, createdAt: new Date().toISOString() };
    await db.investments.put(item);
    return item;
  },

  async update(id: string, data: Partial<Investment>): Promise<void> {
    await db.investments.update(id, data);
  },

  async delete(id: string): Promise<void> {
    await db.investments.delete(id);
  }
};
