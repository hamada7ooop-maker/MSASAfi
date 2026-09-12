import { db } from '../core';
import type { Bill } from '@/types';

export const BillRepository = {
  async getAll(): Promise<Bill[]> {
    return await db.bills.toArray();
  },

  async getUnpaid(): Promise<Bill[]> {
    const all = await this.getAll();
    return all.filter(b => !b.isPaid);
  },

  async getUpcoming(days: number = 30): Promise<Bill[]> {
    const unpaid = await this.getUnpaid();
    const now = new Date();
    const limitDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
    return unpaid.filter(b => {
      if (!b.dueDate) return true;
      const d = new Date(b.dueDate);
      return d <= limitDate;
    }).sort((a, b) => new Date(a.dueDate || '').getTime() - new Date(b.dueDate || '').getTime());
  },

  async getSubscriptions() {
    return await db.subscriptions.toArray();
  },

  async add(b: Omit<Bill, 'id' | 'createdAt'>): Promise<Bill> {
    const id = Date.now().toString(36) + Math.random().toString(36).substring(2, 11);
    const item: Bill = { ...b, id, createdAt: new Date().toISOString() };
    await db.bills.put(item);
    return item;
  },

  async update(id: string, data: Partial<Bill>): Promise<void> {
    await db.bills.update(id, data);
  },

  async delete(id: string): Promise<void> {
    await db.bills.delete(id);
  }
};
