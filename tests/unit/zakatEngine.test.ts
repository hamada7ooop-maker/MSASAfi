import { describe, it, expect } from 'vitest';
import {
  calculateZakat,
  evaluateHawl,
  toPureGoldEquivalent,
  NISAB_GOLD_GRAMS,
  NISAB_SILVER_GRAMS,
  ZAKAT_RATE,
  HAWL_DAYS,
} from '@/core/zakatEngine';

const PRICES = { goldPricePerGram: 500, silverPricePerGram: 9 };

describe('zakatEngine — nisab thresholds', () => {
  it('uses 85g of gold for the gold nisab', () => {
    const r = calculateZakat({ assets: { cash: 0 }, ...PRICES, nisabMethod: 'gold' });
    expect(r.nisab).toBe(NISAB_GOLD_GRAMS * 500); // 42,500
  });

  it('uses 595g of silver for the silver nisab', () => {
    const r = calculateZakat({ assets: { cash: 0 }, ...PRICES, nisabMethod: 'silver' });
    expect(r.nisab).toBe(NISAB_SILVER_GRAMS * 9); // 5,355
  });

  it('charges nothing below nisab', () => {
    const r = calculateZakat({ assets: { cash: 10_000 }, ...PRICES, nisabMethod: 'gold' });
    expect(r.isAboveNisab).toBe(false);
    expect(r.zakatAmount).toBe(0);
  });

  it('charges 2.5% at or above nisab', () => {
    const r = calculateZakat({ assets: { cash: 100_000 }, ...PRICES, nisabMethod: 'gold' });
    expect(r.isAboveNisab).toBe(true);
    expect(r.zakatAmount).toBeCloseTo(2_500, 6);
    expect(ZAKAT_RATE).toBe(0.025);
  });

  it('treats exactly-at-nisab as above', () => {
    const r = calculateZakat({ assets: { cash: 42_500 }, ...PRICES, nisabMethod: 'gold' });
    expect(r.isAboveNisab).toBe(true);
  });
});

describe('zakatEngine — the 2.5% base excludes non-monetary wealth', () => {
  it('excludes crops, livestock and real estate from the 2.5% base', () => {
    const r = calculateZakat({
      assets: { cash: 100_000, crops: 50_000, livestock: 30_000, realestate: 200_000 },
      ...PRICES,
      nisabMethod: 'gold',
    });

    // Only the cash is charged. Crops (5/10%), livestock (in-kind) and
    // real estate (no zakat on the asset) must not be swept into 2.5%.
    expect(r.monetaryTotal).toBe(100_000);
    expect(r.zakatAmount).toBeCloseTo(2_500, 6);
    expect(r.excludedTotal).toBe(280_000);
    expect(r.excludedBreakdown.map((e) => e.key).sort()).toEqual([
      'crops',
      'livestock',
      'realestate',
    ]);
  });

  it('includes cash, gold, investments and trade goods', () => {
    const r = calculateZakat({
      assets: { cash: 10_000, gold: 20_000, invest: 30_000, trade: 40_000 },
      ...PRICES,
      nisabMethod: 'gold',
    });
    expect(r.monetaryTotal).toBe(100_000);
    expect(r.zakatAmount).toBeCloseTo(2_500, 6);
  });
});

describe('zakatEngine — liabilities are deducted', () => {
  it('subtracts debts from the zakatable base', () => {
    const r = calculateZakat({
      assets: { cash: 100_000 },
      liabilities: 50_000,
      ...PRICES,
      nisabMethod: 'gold',
    });
    expect(r.netZakatableBase).toBe(50_000);
    expect(r.zakatAmount).toBeCloseTo(1_250, 6);
  });

  it('can drop the payer below nisab', () => {
    const r = calculateZakat({
      assets: { cash: 50_000 },
      liabilities: 20_000,
      ...PRICES,
      nisabMethod: 'gold',
    });
    expect(r.netZakatableBase).toBe(30_000);
    expect(r.isAboveNisab).toBe(false); // 30k < 42.5k
    expect(r.zakatAmount).toBe(0);
  });

  it('never produces a negative base', () => {
    const r = calculateZakat({
      assets: { cash: 10_000 },
      liabilities: 999_999,
      ...PRICES,
      nisabMethod: 'gold',
    });
    expect(r.netZakatableBase).toBe(0);
    expect(r.zakatAmount).toBe(0);
  });
});

describe('zakatEngine — hawl (lunar year)', () => {
  const now = new Date('2025-09-13T00:00:00Z');

  it('reports unknown when no date was recorded', () => {
    const h = evaluateHawl(null, now);
    expect(h.status).toBe('unknown');
  });

  it('reports incomplete before 354 days', () => {
    const start = new Date(now.getTime() - 100 * 86_400_000).toISOString();
    const h = evaluateHawl(start, now);
    expect(h.status).toBe('incomplete');
    expect(h.daysRemaining).toBe(HAWL_DAYS - 100);
  });

  it('reports complete at 354 days', () => {
    const start = new Date(now.getTime() - HAWL_DAYS * 86_400_000).toISOString();
    expect(evaluateHawl(start, now).status).toBe('complete');
  });

  it('does not treat a future date as a completed hawl', () => {
    const start = new Date(now.getTime() + 30 * 86_400_000).toISOString();
    expect(evaluateHawl(start, now).status).toBe('incomplete');
  });

  it('is not due when above nisab but the hawl is incomplete', () => {
    const start = new Date(now.getTime() - 10 * 86_400_000).toISOString();
    const r = calculateZakat({
      assets: { cash: 100_000 },
      ...PRICES,
      nisabMethod: 'gold',
      nisabReachedDate: start,
      now,
    });
    expect(r.isAboveNisab).toBe(true);
    expect(r.isDueNow).toBe(false); // the whole point
  });

  it('is due when above nisab and the hawl is complete', () => {
    const start = new Date(now.getTime() - 400 * 86_400_000).toISOString();
    const r = calculateZakat({
      assets: { cash: 100_000 },
      ...PRICES,
      nisabMethod: 'gold',
      nisabReachedDate: start,
      now,
    });
    expect(r.isDueNow).toBe(true);
  });

  it('stays not-due while the hawl is unknown', () => {
    const r = calculateZakat({ assets: { cash: 100_000 }, ...PRICES, nisabMethod: 'gold', now });
    expect(r.hawl.status).toBe('unknown');
    expect(r.isDueNow).toBe(false);
  });
});

describe('zakatEngine — karat conversion', () => {
  it('converts 21k to pure gold equivalent', () => {
    expect(toPureGoldEquivalent(100, 21)).toBeCloseTo(87.5, 6);
  });

  it('leaves 24k unchanged', () => {
    expect(toPureGoldEquivalent(100, 24)).toBe(100);
  });

  it('handles 18k', () => {
    expect(toPureGoldEquivalent(48, 18)).toBeCloseTo(36, 6);
  });

  it('guards against nonsense input', () => {
    expect(toPureGoldEquivalent(-5, 21)).toBe(0);
    expect(toPureGoldEquivalent(100, 0)).toBe(0);
    expect(toPureGoldEquivalent(100, 99)).toBe(100); // capped at 24k
  });
});
