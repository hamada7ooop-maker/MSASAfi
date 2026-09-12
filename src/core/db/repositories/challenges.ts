import { db } from '../core';
import type { Challenge } from '@/types';

export const ChallengeRepository = {
  async getAll(): Promise<Challenge[]> {
    return await db.challenges.toArray();
  },

  async add(c: Omit<Challenge, 'id' | 'createdAt'>): Promise<Challenge> {
    const id = Date.now().toString(36) + Math.random().toString(36).substring(2, 11);
    const item: Challenge = { ...c, id, createdAt: new Date().toISOString() };
    await db.challenges.put(item);
    return item;
  },

  async update(id: string, data: Partial<Challenge>): Promise<void> {
    await db.challenges.update(id, data);
  },

  async delete(id: string): Promise<void> {
    await db.challenges.delete(id);
  }
};
