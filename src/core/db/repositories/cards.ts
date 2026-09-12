import { db } from '../core';
import type { BankCard } from '@/types';

export const CardRepository = {
  async getAll(): Promise<BankCard[]> {
    return await db.cards.toArray();
  },
  
  async add(c: Omit<BankCard, 'id'>): Promise<BankCard> {
    const id = 'card_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
    const item: BankCard = { ...c, id };
    await db.cards.put(item);
    return item;
  },

  async update(id: string, data: Partial<BankCard>): Promise<void> {
    await db.cards.update(id, data);
  },

  async delete(id: string): Promise<void> {
    await db.cards.delete(id);
  }
};
