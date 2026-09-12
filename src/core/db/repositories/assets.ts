import { db } from '../core';
import type { Asset } from '@/types';

export const AssetRepository = {
  async getAll(): Promise<Asset[]> {
    return await db.assets.toArray();
  },

  async add(asset: Omit<Asset, 'id'> & { id?: string }): Promise<Asset> {
    const id = asset.id || 'asset_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
    const item: Asset = { ...asset, id };
    await db.assets.put(item);
    await db.recordAction('add_asset', `Added asset: ${item.name}`, item as unknown as Record<string, unknown>);
    return item;
  },

  async update(id: string, data: Partial<Asset>): Promise<void> {
    await db.assets.update(id, data);
    await db.recordAction('update_asset', `Updated asset: ${id}`, data as unknown as Record<string, unknown>);
  },

  async delete(id: string): Promise<void> {
    await db.assets.delete(id);
    await db.recordAction('delete_asset', `Deleted asset: ${id}`);
  }
};
