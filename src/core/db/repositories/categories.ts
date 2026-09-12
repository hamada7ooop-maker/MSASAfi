import { db } from '../core';
import type { Category } from '@/types';

export const CategoryRepository = {
  async getAll(): Promise<Category[]> {
    return await db.categories.orderBy('order').toArray();
  },

  async add(c: Omit<Category, 'id'> & { id?: string }): Promise<Category> {
    const id = c.id || `cat_${Date.now()}`;
    const item: Category = { ...c, id };
    await db.categories.put(item);
    return item;
  },

  async update(id: string, data: Partial<Category>): Promise<void> {
    await db.categories.update(id, data);
  },

  async delete(id: string): Promise<void> {
    await db.categories.delete(id);
  },

  async bulkPut(items: Category[]): Promise<void> {
    await db.categories.bulkPut(items);
  }
};
