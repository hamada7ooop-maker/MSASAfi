import { describe, it, expect, beforeEach } from 'vitest';
import { db as DB } from '../../src/core/db/core';
import { AssetRepository } from '../../src/core/db/repositories/assets';
import { CategoryInitService } from '../../src/core/db/services/categoryInitService';
import { DemoDataService } from '../../src/core/db/seed/demoData';
import type { Asset } from '../../src/types';

describe('AssetRepository & Asset Lifecycle Unit Tests', () => {
  beforeEach(async () => {
    await DB.assets.clear();
    await DB.settings.clear();
  });

  it('adds, updates, retrieves, and permanently deletes an asset without resurrection', async () => {
    const initialAssets = await AssetRepository.getAll();
    expect(initialAssets).toHaveLength(0);

    const newAsset = await AssetRepository.add({
      name: 'سيارة تويوتا كامري 2024',
      category: 'vehicle',
      purchasePrice: 110000,
      purchaseDate: '2024-01-15',
      lifespanYears: 10,
      salvageValue: 30000,
      depreciationMethod: 'straight_line',
      notes: 'سيارة خاصة'
    });

    expect(newAsset.id).toBeDefined();
    expect(newAsset.id).toMatch(/^asset_/);

    const all = await AssetRepository.getAll();
    expect(all).toHaveLength(1);
    expect(all[0].name).toBe('سيارة تويوتا كامري 2024');

    await AssetRepository.update(newAsset.id, { purchasePrice: 115000 });
    const updated = await DB.assets.get(newAsset.id);
    expect(updated?.purchasePrice).toBe(115000);

    await AssetRepository.delete(newAsset.id);
    const afterDelete = await AssetRepository.getAll();
    expect(afterDelete).toHaveLength(0);
  });

  it('cleans up duplicate assets and purges rogue demo assets when hasDemoData is not set', async () => {
    const rogueAssets: Asset[] = [
      {
        id: 'asset_rogue_1',
        name: 'شقة سكنية - حي الياسمين بجدة',
        category: 'real_estate',
        purchasePrice: 950000,
        purchaseDate: '2021-01-01',
        lifespanYears: 30,
        salvageValue: 150000,
        depreciationMethod: 'straight_line',
        isDemo: 1
      },
      {
        id: 'asset_rogue_2',
        name: 'شقة سكنية - حي الياسمين بجدة',
        category: 'real_estate',
        purchasePrice: 950000,
        purchaseDate: '2021-01-01',
        lifespanYears: 30,
        salvageValue: 150000,
        depreciationMethod: 'straight_line',
        isDemo: 1
      },
      {
        id: 'asset_real_user',
        name: 'معدات تصوير فوتوغرافي',
        category: 'electronics',
        purchasePrice: 8500,
        purchaseDate: '2024-03-01',
        lifespanYears: 4,
        salvageValue: 1000,
        depreciationMethod: 'straight_line'
      }
    ];

    await DB.assets.bulkPut(rogueAssets);
    expect(await DB.assets.count()).toBe(3);

    await CategoryInitService.cleanupDuplicateAssets(DB);

    const remaining = await DB.assets.toArray();
    expect(remaining).toHaveLength(1);
    expect(remaining[0].id).toBe('asset_real_user');
  });

  it('deduplicates assets by name and category when demo data is enabled', async () => {
    await DB.setSetting('hasDemoData', true);

    const duplicateAssets: Asset[] = [
      {
        id: 'asset_d1',
        name: 'سيارة تسلا موديل Y (2023)',
        category: 'vehicle',
        purchasePrice: 215000,
        purchaseDate: '2023-01-01',
        lifespanYears: 10,
        salvageValue: 35000,
        depreciationMethod: 'double_declining',
        isDemo: 1
      },
      {
        id: 'asset_d2',
        name: 'سيارة تسلا موديل Y (2023)',
        category: 'vehicle',
        purchasePrice: 215000,
        purchaseDate: '2023-01-01',
        lifespanYears: 10,
        salvageValue: 35000,
        depreciationMethod: 'double_declining',
        isDemo: 1
      }
    ];

    await DB.assets.bulkPut(duplicateAssets);
    expect(await DB.assets.count()).toBe(2);

    await CategoryInitService.cleanupDuplicateAssets(DB);

    const remaining = await DB.assets.toArray();
    expect(remaining).toHaveLength(1);
    expect(remaining[0].name).toBe('سيارة تسلا موديل Y (2023)');
  });

  it('seeds rich assets into demoData when user explicitly requests demo dataset', async () => {
    await DemoDataService.seedDemoData(DB, true);

    const seededAssets = await DB.assets.toArray();
    expect(seededAssets.length).toBeGreaterThanOrEqual(3);

    const jeddahApt = seededAssets.find(a => a.name.includes('الياسمين'));
    expect(jeddahApt).toBeDefined();
    expect(jeddahApt?.purchasePrice).toBe(950000);
    expect(jeddahApt?.isDemo).toBe(1);

    await DemoDataService.clearDemoData(DB);
    const afterClear = await DB.assets.toArray();
    expect(afterClear).toHaveLength(0);
  });
});
