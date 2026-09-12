import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFormat } from '../../src/core/hooks/useFormat';
import { useCategories } from '../../src/features/categories/hooks/useCategories';
import { useSettingsStore } from '../../src/store/settingsStore';
import { useAppStore } from '../../src/store/appStore';
import { db as DB } from '../../src/core/db/core';

describe('React Hooks Unit Tests (useFormat & useCategories)', () => {
  beforeEach(async () => {
    useSettingsStore.setState({
      baseCurrency: 'SAR',
      language: 'ar',
      numberSystem: 'latn',
      decimalPlaces: 2,
      numberSeparator: 'comma_dot',
      currencyDisplayMode: 'symbol',
    });
    useAppStore.setState({ incognito: false });
    await DB.categories.clear();
  });

  describe('useFormat Hook', () => {
    it('formats numbers and handles incognito mode', () => {
      const { result } = renderHook(() => useFormat());

      expect(result.current.fmt(1500)).toContain('1,500.00');
      expect(result.current.fmtRaw(1500, 1)).toBe('1,500.0');
      expect(result.current.fmtShort(1500)).toBe('1500');

      act(() => {
        useAppStore.setState({ incognito: true });
      });

      expect(result.current.fmt(1500)).toBe('•••••');
      expect(result.current.fmtShort(1500)).toBe('•••');
    });

    it('parses numbers and formats currency symbols', () => {
      const { result } = renderHook(() => useFormat());

      expect(result.current.parseNum('2,450.50')).toBe(2450.5);
      expect(result.current.getCurrencySymbol()).toBeDefined();
    });
  });

  describe('useCategories Hook', () => {
    it('provides CRUD and reordering functions on categories', async () => {
      const { result } = renderHook(() => useCategories());

      await act(async () => {
        await result.current.addCategory({
          name: 'Fitness',
          icon: 'fitness_center',
          color: '#ef4444',
          type: 'expense',
        });
      });

      const all = await DB.categories.toArray();
      const catInDb = all.find((c) => c.name === 'Fitness');
      expect(catInDb).toBeDefined();

      if (catInDb) {
        await act(async () => {
          await result.current.updateCategory(catInDb.id, { color: '#3b82f6' });
        });

        const updated = await DB.categories.get(catInDb.id);
        expect(updated?.color).toBe('#3b82f6');

        await act(async () => {
          await result.current.reorderCategories([catInDb.id]);
        });

        await act(async () => {
          await result.current.deleteCategory(catInDb.id);
        });

        const deleted = await DB.categories.get(catInDb.id);
        expect(deleted).toBeUndefined();
      }
    });
  });

  describe('useIsMounted Hook', () => {
    it('returns true while mounted and false after unmount', async () => {
      const { useIsMounted } = await import('../../src/hooks/useIsMounted');
      const { result, unmount } = renderHook(() => useIsMounted());

      expect(result.current.current).toBe(true);
      unmount();
      expect(result.current.current).toBe(false);
    });
  });
});
