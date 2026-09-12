import { db } from '../core';

/**
 * Repository for Application Settings.
 * Settings are stored as { id: string, value: unknown }.
 */
export const SettingsRepository = {
  
  /**
   * Gets a setting value by key.
   */
  async get<T = unknown>(key: string): Promise<T | null> {
    const entry = await db.settings.get(key);
    return entry ? (entry.value as T) : null;
  },

  /**
   * Sets a setting value.
   */
  async set(key: string, value: unknown): Promise<void> {
    await db.settings.put({ id: key, value });
  },

  /**
   * Gets all settings as a key-value object.
   */
  async getAll(): Promise<Record<string, unknown>> {
    const all = await db.settings.toArray();
    const settings: Record<string, unknown> = {};
    all.forEach(s => {
      settings[s.id] = s.value;
    });
    return settings;
  },

  /**
   * Bulk updates settings.
   */
  async bulkSet(settings: Record<string, unknown>): Promise<void> {
    const entries = Object.entries(settings).map(([id, value]) => ({ id, value }));
    await db.settings.bulkPut(entries);
  },

  /**
   * Deletes a setting.
   */
  async delete(key: string): Promise<void> {
    await db.settings.delete(key);
  }
};
