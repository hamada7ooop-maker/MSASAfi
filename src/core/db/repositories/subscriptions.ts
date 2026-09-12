import { db } from '../core';
import type { Subscription } from '@/types';

export const SubscriptionRepository = {
  async getAll(): Promise<Subscription[]> {
    return await db.subscriptions.toArray();
  },

  async add(s: Omit<Subscription, 'id' | 'createdAt'>): Promise<Subscription> {
    const id = Date.now().toString(36) + Math.random().toString(36).substring(2, 11);
    const item: Subscription = { ...s, id, createdAt: new Date().toISOString() };
    await db.subscriptions.put(item);
    return item;
  },

  async update(id: string, data: Partial<Subscription>): Promise<void> {
    await db.subscriptions.update(id, data);
  },

  async delete(id: string): Promise<void> {
    await db.subscriptions.delete(id);
  }
};
