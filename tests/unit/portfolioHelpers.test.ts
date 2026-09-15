/**
 * Directive 19 — deferred decomposition: unit tests for the new pure
 * primitives the split extracted. The screens' behavior is pinned by
 * assetsPage / investmentsPage characterization suites; these pin the
 * arithmetic itself, edge cases included.
 */
import { describe, it, expect } from 'vitest';
import { investmentMetrics } from '../../src/features/investments/utils/investmentMeta';
import { processAssets, summarizeAssets } from '../../src/features/assets/utils/assetPortfolio';
import type { Asset } from '../../src/types';

const iso = (daysFromNow: number) =>
  new Date(Date.now() + daysFromNow * 86400000).toISOString().slice(0, 10);

describe('investmentMetrics', () => {
  it('computes profit and profit percent', () => {
    expect(investmentMetrics({ cost: 10000, value: 15000 })).toEqual({
      profit: 5000,
      profitPct: 50,
    });
  });

  it('handles losses with a negative percent', () => {
    const m = investmentMetrics({ cost: 8000, value: 6000 });
    expect(m.profit).toBe(-2000);
    expect(m.profitPct.toFixed(2)).toBe('-25.00');
  });

  it('a zero cost cannot divide — percent reads 0, not NaN', () => {
    expect(investmentMetrics({ cost: 0, value: 500 })).toEqual({ profit: 500, profitPct: 0 });
  });

  it('breakeven is exactly zero both ways', () => {
    expect(investmentMetrics({ cost: 4400, value: 4400 })).toEqual({ profit: 0, profitPct: 0 });
  });
});

describe('processAssets + summarizeAssets', () => {
  // Lifespans of 1y with purchases >1y old: the engine's fractional-year
  // interpolation lands on the exact P−S branch, so book value === salvage.
  const ASSETS: Asset[] = [
    { id: 'a1', name: 'A', category: 'real_estate', purchasePrice: 600000, purchaseDate: iso(-375), lifespanYears: 1, salvageValue: 100000, warrantyExpiry: iso(500), depreciationMethod: 'straight_line' },
    { id: 'a2', name: 'B', category: 'vehicle', purchasePrice: 150000, purchaseDate: iso(-380), lifespanYears: 1, salvageValue: 30000, warrantyExpiry: iso(-30), depreciationMethod: 'straight_line' },
    { id: 'a3', name: 'C', category: 'electronics', purchasePrice: 8000, purchaseDate: iso(-370), lifespanYears: 1, salvageValue: 1000, depreciationMethod: 'straight_line' },
  ];

  it('every asset leaves with its engine metrics', () => {
    const processed = processAssets(ASSETS);
    expect(processed).toHaveLength(3);
    for (const { asset, metrics } of processed) {
      expect(metrics.currentBookValue).toBe(asset.salvageValue);
      expect(metrics.accumulatedDepreciation).toBe(asset.purchasePrice - asset.salvageValue);
    }
  });

  it('the summary folds purchase, depreciation, book and ACTIVE warranties only', () => {
    const s = summarizeAssets(processAssets(ASSETS));
    expect(s.totalPurchasePrice).toBe(758000);
    expect(s.totalAccumulatedDepreciation).toBe(627000);
    expect(s.totalBookValue).toBe(131000);
    // a1's warranty runs out in the future; a2's already did; a3 has none.
    expect(s.activeWarrantiesCount).toBe(1);
  });

  it('an empty portfolio summarizes to zeros without throwing', () => {
    expect(summarizeAssets([])).toEqual({
      totalPurchasePrice: 0,
      totalAccumulatedDepreciation: 0,
      totalBookValue: 0,
      activeWarrantiesCount: 0,
    });
  });

  it('a purchase price of NaN counts as 0, not NaN (the Number() guard)', () => {
    const weird = [{ ...ASSETS[2], purchasePrice: Number('x') as unknown as number }];
    const s = summarizeAssets(processAssets(weird as Asset[]));
    expect(Number.isNaN(s.totalPurchasePrice)).toBe(false);
    expect(s.totalPurchasePrice).toBe(0);
  });
});
