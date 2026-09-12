import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../../core/db/core';
import type { Category } from '../../../types';
import { toast } from '../../../toast';
import { useI18n } from '../../../i18n/index';

export function useCategories() {
  const { t } = useI18n();

  const categories = useLiveQuery(
    () => db.categories.orderBy('order').toArray(),
    [],
    [] as Category[]
  );

  const isLoading = categories === undefined;

  const addCategory = async (data: Partial<Category>) => {
    await (db.addCategory as (d: unknown) => Promise<string>)(data);
    toast(t('action.saved') || 'Saved successfully', 'success');
  };

  const updateCategory = async (id: string, data: Partial<Category>) => {
    await db.updateCategory(id, data);
  };

  const deleteCategory = async (id: string) => {
    await db.deleteCategory(id);
    toast(t('action.deleted') || 'Deleted', 'success');
  };

  const reorderCategories = async (reorderedIds: string[]) => {
    const updates = reorderedIds.map((id, index) => ({
      id,
      changes: { order: index }
    }));
    
    await db.transaction('rw', db.categories, async () => {
      for (const update of updates) {
        await db.categories.update(update.id, update.changes);
      }
    });
  };

  return {
    categories: categories || [],
    isLoading,
    addCategory,
    updateCategory,
    deleteCategory,
    reorderCategories
  };
}
