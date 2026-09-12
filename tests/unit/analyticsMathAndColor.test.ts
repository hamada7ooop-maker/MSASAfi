import { describe, it, expect } from 'vitest';
import { oklchToRgb, oklabToRgb } from '../../src/features/reports/utils/colorUtils';
import {
  calculateFreedomData,
  calculateDayOfWeekSpending,
  calculateTimeOfDaySpending,
  calculateSeasonalSpending,
  calculateNeedsVsWants,
  calculateWastedSpending,
  calculateMoodSpending,
  calculateHeatmapData,
  calculateTotalWealth,
  calculateCurrentMonthExpenses,
  getEffectiveAmount,
} from '../../src/features/reports/utils/analyticsMath';
import type { Account, Transaction } from '../../src/types';

describe('Analytics Math & Color Utilities', () => {
  describe('colorUtils (oklchToRgb & oklabToRgb)', () => {
    it('converts valid oklch strings to rgb/rgba', () => {
      const input = 'color: oklch(0.6 0.25 120);';
      const output = oklchToRgb(input);
      expect(output).toMatch(/rgb\(\d+,\s*\d+,\s*\d+\)/);
      expect(output).not.toContain('oklch');
    });

    it('converts oklch with percentage lightness and alpha', () => {
      const input = 'oklch(70% 0.15 240 / 80%)';
      const output = oklchToRgb(input);
      expect(output).toMatch(/rgba\(\d+,\s*\d+,\s*\d+,\s*0\.8\)/);
    });

    it('converts valid oklab strings to rgb/rgba', () => {
      const input = 'background-color: oklab(0.7 -0.1 0.1);';
      const output = oklabToRgb(input);
      expect(output).toMatch(/rgb\(\d+,\s*\d+,\s*\d+\)/);
      expect(output).not.toContain('oklab');
    });

    it('leaves standard strings unchanged', () => {
      const input = 'color: #ff0000; display: block;';
      expect(oklchToRgb(input)).toBe(input);
      expect(oklabToRgb(input)).toBe(input);
    });
  });

  describe('analyticsMath calculations', () => {
    const now = new Date();
    const currentMonthIso = now.toISOString();

    const sampleTransactions: Transaction[] = [
      {
        id: 'tx1',
        amount: 300,
        type: 'expense',
        category: 'مواد غذائية',
        date: currentMonthIso,
        accountId: 'acc1',
        description: 'Groceries',
        mood: 'happy',
      },
      {
        id: 'tx2',
        amount: 200,
        type: 'expense',
        category: 'ترفيه',
        date: currentMonthIso,
        accountId: 'acc1',
        description: 'Cinema',
        mood: 'impulse',
      },
      {
        id: 'tx3',
        amount: 5000,
        type: 'income',
        category: 'راتب',
        date: currentMonthIso,
        accountId: 'acc1',
        description: 'Monthly Salary',
      },
    ];

    const sampleAccounts: Account[] = [
      { id: 'acc1', name: 'Bank', balance: 15000, type: 'bank', color: '#000', icon: 'account_balance' },
      { id: 'acc2', name: 'Cash', balance: 2500, type: 'cash', color: '#000', icon: 'payments' },
    ];

    it('calculates effective amount handling shared and split transactions', () => {
      const normalTx = sampleTransactions[0];
      expect(getEffectiveAmount(normalTx)).toBe(300);

      const sharedTx: Transaction = {
        ...normalTx,
        shared: true,
        splitBy: 3,
        amount: 600,
      };
      expect(getEffectiveAmount(sharedTx)).toBe(200); // 600 / 3
    });

    it('calculates total wealth across accounts', () => {
      expect(calculateTotalWealth(sampleAccounts)).toBe(17500);
    });

    it('calculates current month expenses', () => {
      const totalExp = calculateCurrentMonthExpenses(sampleTransactions);
      expect(totalExp).toBe(500); // 300 + 200
    });

    it('computes financial freedom metrics using 4% rule', () => {
      const res = calculateFreedomData(100000, 2000);
      expect(res.annualExpenses).toBe(24000);
      expect(res.requiredCapital).toBe(600000); // 24000 / 0.04
      expect(res.monthsOfSecurity).toBe(50); // 100000 / 2000
    });

    it('computes day of week spending array', () => {
      const days = calculateDayOfWeekSpending(sampleTransactions);
      expect(days.length).toBe(7);
      const total = days.reduce((s, v) => s + v, 0);
      expect(total).toBe(500);
    });

    it('computes time of day spending breakdown', () => {
      const res = calculateTimeOfDaySpending(sampleTransactions);
      expect(res.amounts).toBeDefined();
      const sum = Object.values(res.amounts).reduce((s, v) => s + v, 0);
      expect(sum).toBe(500);
    });

    it('computes seasonal spending percentages', () => {
      const res = calculateSeasonalSpending(sampleTransactions);
      expect(res.winter + res.spring + res.summer + res.autumn).toBeCloseTo(100, 0);
    });

    it('computes needs vs wants ratio based on categories', () => {
      const res = calculateNeedsVsWants(sampleTransactions);
      expect(res.needs).toBe(300); // مواد غذائية is Need
      expect(res.wants).toBe(200); // ترفيه is Want
      expect(res.needsPct + res.wantsPct).toBeCloseTo(100, 0);
    });

    it('computes wasted and emotional spending', () => {
      const res = calculateWastedSpending(sampleTransactions);
      expect(res.amount).toBe(200); // tx2 mood: impulse
      expect(res.rate).toBe(40); // 200 / 500 = 40%
    });

    it('computes mood spending counts and amounts', () => {
      const res = calculateMoodSpending(sampleTransactions);
      expect(res.moods.happy.amount).toBe(300);
      expect(res.moods.happy.count).toBe(1);
    });

    it('computes heatmap data for visual matrix', () => {
      const d = new Date();
      const res = calculateHeatmapData(sampleTransactions, d.getFullYear(), d.getMonth());
      expect(res.totalDays).toBeGreaterThan(27);
      expect(res.maxDailySpend).toBeGreaterThanOrEqual(300);
      expect(res.dailySpending[d.getDate()].amount).toBeGreaterThanOrEqual(300);
    });
  });
});
