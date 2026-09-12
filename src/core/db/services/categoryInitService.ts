import type { MasarifiDB } from '../schema';
import type { Category, Account } from '@/types';
import { logger } from '../../logger';

export const CategoryInitService = {
  async initDefaultCategories(db: MasarifiDB, force = false): Promise<void> {
    const count = await db.categories.count();
    if (count > 0 && !force) return;

    const defaults: Array<Omit<Category, 'id' | 'order'>> = [
      { name: 'مواد غذائية', icon: '🛒', color: '#f59e0b', type: 'expense' },
      { name: 'سكن', icon: '🏠', color: '#3b82f6', type: 'expense' },
      { name: 'مواصلات', icon: '🚗', color: '#6366f1', type: 'expense' },
      { name: 'مطاعم', icon: '🍽️', color: '#ef4444', type: 'expense' },
      { name: 'تسوق', icon: '🛍️', color: '#ec4899', type: 'expense' },
      { name: 'فواتير', icon: '📄', color: '#64748b', type: 'expense' },
      { name: 'صحة', icon: '💊', color: '#10b981', type: 'expense' },
      { name: 'ترفيه', icon: '🎬', color: '#8b5cf6', type: 'expense' },
      { name: 'تعليم', icon: '📚', color: '#0ea5e9', type: 'expense' },
      { name: 'اشتراكات', icon: '📱', color: '#475569', type: 'expense' },
      { name: 'جمال وعناية', icon: '💄', color: '#db2777', type: 'expense' },
      { name: 'رياضة', icon: '🏋️', color: '#ea580c', type: 'expense' },
      { name: 'سفر', icon: '✈️', color: '#2563eb', type: 'expense' },
      { name: 'سيارة', icon: '🔧', color: '#4b5563', type: 'expense' },
      { name: 'هدايا', icon: '🎁', color: '#dc2626', type: 'expense' },
      { name: 'ديون', icon: '🤝', color: '#d97706', type: 'expense' },
      { name: 'راتب', icon: '💰', color: '#059669', type: 'income' },
      { name: 'استثمار', icon: '📈', color: '#0284c7', type: 'income' },
      { name: 'عمل حر', icon: '💻', color: '#4f46e5', type: 'income' },
      { name: 'أخرى', icon: '🏷️', color: 'transparent', type: 'both' },
    ];

    if (force) {
      await db.categories.clear();
    }

    const toPut: Category[] = defaults.map((c, i) => ({
      ...c,
      id: `cat_${c.name}`,
      order: i
    }));

    await db.categories.bulkPut(toPut);
    await db.recordAction('add_category', 'Initialized default categories with deterministic IDs');
  },

  async initDefaultAccounts(db: MasarifiDB): Promise<void> {
    const count = await db.accounts.count();
    if (count > 0) return;

    const mainWallet: Account = {
      id: 'acc_main',
      name: 'المحفظة الرئيسية',
      type: 'cash',
      balance: 0,
      initialBalance: 0,
      currency: 'SAR',
      color: '#002b59',
      icon: 'account_balance_wallet'
    };

    await db.accounts.put(mainWallet);
    await db.recordAction('add_account', 'Initialized default main wallet');
  },

  async cleanupDuplicateCategories(db: MasarifiDB): Promise<void> {
    const all = await db.categories.toArray();
    const seen = new Set<string>();
    const toDelete: string[] = [];

    all.forEach(c => {
      if (seen.has(c.name)) {
        toDelete.push(c.id);
      } else {
        seen.add(c.name);
      }
    });

    if (toDelete.length > 0) {
      await db.categories.bulkDelete(toDelete);
      logger.info('DB', `Cleaned up ${toDelete.length} duplicate categories`);
    }
  },

  async appendMissingDefaultCategories(db: MasarifiDB): Promise<void> {
    await this.cleanupDuplicateCategories(db);
    
    const existing = await db.categories.toArray();
    const existingNames = new Set(existing.map(c => c.name));
    
    const defaults: Array<Omit<Category, 'id' | 'order'>> = [
      { name: 'مواد غذائية', icon: '🛒', color: '#f59e0b', type: 'expense' },
      { name: 'سكن', icon: '🏠', color: '#3b82f6', type: 'expense' },
      { name: 'مواصلات', icon: '🚗', color: '#6366f1', type: 'expense' },
      { name: 'مطاعم', icon: '🍽️', color: '#ef4444', type: 'expense' },
      { name: 'تسوق', icon: '🛍️', color: '#ec4899', type: 'expense' },
      { name: 'فواتير', icon: '📄', color: '#64748b', type: 'expense' },
      { name: 'صحة', icon: '💊', color: '#10b981', type: 'expense' },
      { name: 'ترفيه', icon: '🎬', color: '#8b5cf6', type: 'expense' },
      { name: 'تعليم', icon: '📚', color: '#0ea5e9', type: 'expense' },
      { name: 'اشتراكات', icon: '📱', color: '#475569', type: 'expense' },
      { name: 'جمال وعناية', icon: '💄', color: '#db2777', type: 'expense' },
      { name: 'رياضة', icon: '🏋️', color: '#ea580c', type: 'expense' },
      { name: 'سفر', icon: '✈️', color: '#2563eb', type: 'expense' },
      { name: 'سيارة', icon: '🔧', color: '#4b5563', type: 'expense' },
      { name: 'هدايا', icon: '🎁', color: '#dc2626', type: 'expense' },
      { name: 'ديون', icon: '🤝', color: '#d97706', type: 'expense' },
      { name: 'راتب', icon: '💰', color: '#059669', type: 'income' },
      { name: 'استثمار', icon: '📈', color: '#0284c7', type: 'income' },
      { name: 'عمل حر', icon: '💻', color: '#4f46e5', type: 'income' },
      { name: 'أخرى', icon: '🏷️', color: 'transparent', type: 'both' },
    ];

    const missing = defaults.filter(d => !existingNames.has(d.name));
    if (missing.length === 0) return;

    const lastOrder = existing.length > 0 ? Math.max(...existing.map(c => c.order)) : -1;
    const toAdd: Category[] = missing.map((c, i) => ({
      ...c,
      id: `cat_${c.name}`,
      order: lastOrder + i + 1
    }));

    await db.categories.bulkPut(toAdd);
    await db.recordAction('add_category', `Appended ${missing.length} missing default categories`);
  },

  async repairCategories(db: MasarifiDB): Promise<void> {
    const all = await db.categories.toArray();
    const needsRepair = all.some(c => c.order === undefined || c.order === null);
    if (!needsRepair) return;

    logger.info('DB', 'Repairing category orders...');
    const sorted = [...all].sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
    const repaired: Category[] = sorted.map((c, i) => ({ ...c, order: i }));
    await db.categories.bulkPut(repaired);
    await db.recordAction('repair_categories', 'Fixed missing order fields in categories');
  },

  async cleanupDuplicateAssets(db: MasarifiDB): Promise<void> {
    const all = await db.assets.toArray();
    if (all.length === 0) return;

    // 1. If hasDemoData is false/unset, purge any rogue demo assets
    const hasDemoData = (await db.getSetting<boolean>('hasDemoData')) ?? false;
    if (!hasDemoData) {
      const rogueDemoIds = all.filter(a => a.isDemo === 1).map(a => a.id);
      if (rogueDemoIds.length > 0) {
        await db.assets.bulkDelete(rogueDemoIds);
        logger.info('DB', `Purged ${rogueDemoIds.length} rogue demo assets`);
      }
    }

    // 2. Deduplicate remaining assets by trimmed name and category
    const remaining = await db.assets.toArray();
    const seen = new Set<string>();
    const toDelete: string[] = [];

    remaining.forEach(a => {
      const key = `${a.name.trim().toLowerCase()}_${a.category}`;
      if (seen.has(key)) {
        toDelete.push(a.id);
      } else {
        seen.add(key);
      }
    });

    if (toDelete.length > 0) {
      await db.assets.bulkDelete(toDelete);
      logger.info('DB', `Cleaned up ${toDelete.length} duplicate assets`);
    }
  }
};
