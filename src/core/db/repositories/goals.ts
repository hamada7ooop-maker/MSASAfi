import { db } from '../core';
import type { Goal } from '@/types';

export const GoalRepository = {
  async getAll(): Promise<Goal[]> {
    return await db.goals.toArray();
  },
  
  async add(g: Omit<Goal, 'id' | 'createdAt'>): Promise<Goal> {
    const id = Date.now().toString(36) + Math.random().toString(36).substring(2, 11);
    const item: Goal = { ...g, id, createdAt: new Date().toISOString() };
    await db.goals.put(item);
    return item;
  },

  async update(id: string, data: Partial<Goal>): Promise<void> {
    await db.goals.update(id, data);
  },

  async delete(id: string): Promise<void> {
    await db.goals.delete(id);
  }
};
