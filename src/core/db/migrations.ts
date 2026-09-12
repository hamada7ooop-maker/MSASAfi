import localforage from 'localforage';
import type { MasarifiDB } from './schema';
import { logger } from '../logger';

const lfStores: Record<string, LocalForage> = {
  transactions: localforage.createInstance({ name: 'masarifi', storeName: 'transactions' }),
  budgets: localforage.createInstance({ name: 'masarifi', storeName: 'budgets' }),
  goals: localforage.createInstance({ name: 'masarifi', storeName: 'goals' }),
  debts: localforage.createInstance({ name: 'masarifi', storeName: 'debts' }),
  bills: localforage.createInstance({ name: 'masarifi', storeName: 'bills' }),
  accounts: localforage.createInstance({ name: 'masarifi', storeName: 'accounts' }),
  subscriptions: localforage.createInstance({ name: 'masarifi', storeName: 'subscriptions' }),
  investments: localforage.createInstance({ name: 'masarifi', storeName: 'investments' }),
  challenges: localforage.createInstance({ name: 'masarifi', storeName: 'challenges' }),
  categories: localforage.createInstance({ name: 'masarifi', storeName: 'categories' }),
  recurringTransactions: localforage.createInstance({ name: 'masarifi', storeName: 'recurringTransactions' }),
  settings: localforage.createInstance({ name: 'masarifi', storeName: 'settings' }),
  auditLog: localforage.createInstance({ name: 'masarifi', storeName: 'auditLog' }),
};

/**
 * Migrates data from old localForage stores to Dexie.
 * Stores the migration state inside Dexie settings to prevent data overwrites if localStorage is wiped.
 */
export async function migrateToDexie(db: MasarifiDB): Promise<void> {
  try {
    const isMigratedInDb = db.getSetting
      ? await db.getSetting('dexie_migrated')
      : (await db.settings?.get('dexie_migrated'))?.value;
    const isMigratedInLs = typeof localStorage !== 'undefined' ? localStorage.getItem('dexie_migrated') : null;
    
    if (isMigratedInDb || isMigratedInLs) {
      if (!isMigratedInDb && db.settings) {
        await db.settings.put({ id: 'dexie_migrated', key: 'dexie_migrated', value: 'true' });
      }
      return;
    }

    logger.info('Dexie', 'Starting migration from localForage...');
    
    for (const [name, lfStore] of Object.entries(lfStores)) {
      const table = db.table<Record<string, unknown>>(name);
      if (!table) continue;

      const items: Record<string, unknown>[] = [];
      await lfStore.iterate((v: unknown, k: string) => {
        if (name === 'settings') {
          items.push({ id: k, value: v });
        } else if (v && typeof v === 'object') {
          items.push(v as Record<string, unknown>);
        }
      });

      if (items.length > 0) {
        await table.bulkPut(items);
      }
    }

    if (db.settings) {
      await db.settings.put({ id: 'dexie_migrated', key: 'dexie_migrated', value: 'true' });
    }
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('dexie_migrated', 'true');
    }
    logger.info('Dexie', 'Migration complete!');
  } catch (error) {
    logger.error('Migrations', 'migrateToDexie failed', error);
    throw error;
  }
}
