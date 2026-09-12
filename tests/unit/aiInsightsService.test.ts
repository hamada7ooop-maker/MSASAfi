import { describe, it, expect, beforeEach } from 'vitest';
import {
  generateAIChallenges,
  generateSmartRecommendations,
  generateDeepInsights,
} from '../../src/core/ai/insightsService';
import { useSettingsStore } from '../../src/store/settingsStore';
import type { Transaction, Budget, Debt } from '@/types';

describe('AI Insights Service Unit Tests (insightsService.ts)', () => {
  beforeEach(() => {
    useSettingsStore.setState({
      hourlyRate: 50,
      isWorkHoursEnabled: true,
    });
  });

  describe('generateAIChallenges', () => {
    it('generates dining and shopping restraint challenges', () => {
      const txns: Transaction[] = [
        { id: '1', amount: 500, type: 'expense', category: 'مطاعم', date: '2026-08-30' },
        { id: '2', amount: 800, type: 'expense', category: 'تسوق', date: '2026-08-30' },
      ];

      const challenges = generateAIChallenges({
        transactions: txns,
        monthStats: { income: 2000, expense: 1800 },
      });

      expect(challenges.some((c) => c.id === 'challenge_dining')).toBe(true);
      expect(challenges.some((c) => c.id === 'challenge_shopping')).toBe(true);
      expect(challenges.some((c) => c.id === 'challenge_savings_boost')).toBe(true);
    });

    it('generates challenges for English IDs and multilingual category names correctly', () => {
      const txns: Transaction[] = [
        { id: '1', amount: 350, type: 'expense', category: 'dining', date: '2026-08-30' },
        { id: '2', amount: 450, type: 'expense', category: 'shopping', date: '2026-08-30' },
      ];

      const challenges = generateAIChallenges({
        transactions: txns,
        monthStats: { income: 1000, expense: 900 },
      });

      expect(challenges.some((c) => c.id === 'challenge_dining')).toBe(true);
      expect(challenges.some((c) => c.id === 'challenge_shopping')).toBe(true);
    });
  });

  describe('generateSmartRecommendations', () => {
    it('generates high-priority overspend, spike and budget overrun recommendations', () => {
      const txns: Transaction[] = [
        { id: '1', amount: 6000, type: 'expense', category: 'سفر', date: '2026-08-30' },
      ];
      const budgets: Budget[] = [{ id: 'b1', category: 'سفر', limit: 2000 }];

      const recs = generateSmartRecommendations({
        transactions: txns,
        budgets,
        monthStats: { income: 3000, expense: 6000 },
        prevMonthStats: { expense: 2000 },
      });

      expect(recs.some((r) => r.id === 'overspend')).toBe(true);
      expect(recs.some((r) => r.id === 'spike')).toBe(true);
      expect(recs.some((r) => r.id.startsWith('budget-over-'))).toBe(true);
    });

    it('generates subscriptions and high debt recommendations', () => {
      const txns: Transaction[] = [
        { id: 'sub_1', amount: 500, type: 'expense', category: 'اشتراكات', date: '2026-08-30' },
      ];
      const debts: Debt[] = [{ id: 'd1', person: 'Omar', total: 20000, paid: 0, type: 'owed' }];

      const recs = generateSmartRecommendations({
        transactions: txns,
        debts,
        monthStats: { income: 3000, expense: 1000 },
      });

      expect(recs.some((r) => r.id === 'subscriptions')).toBe(true);
      expect(recs.some((r) => r.id === 'high-debt')).toBe(true);
    });

    it('generates great savings congratulations when savings rate is >= 30%', () => {
      const recs = generateSmartRecommendations({
        transactions: [],
        monthStats: { income: 10000, expense: 5000 },
      });

      expect(recs.some((r) => r.id === 'great-savings')).toBe(true);
    });
  });

  describe('generateDeepInsights', () => {
    it('generates deep financial narrative summary', async () => {
      const txns: Transaction[] = [
        { id: '1', amount: 1200, type: 'expense', category: 'مطاعم', date: '2026-08-30' },
      ];
      const budgets: Budget[] = [{ id: 'b1', category: 'مطاعم', limit: 1000 }];

      const summary = await generateDeepInsights({
        transactions: txns,
        budgets,
        monthStats: { income: 5000, expense: 1200, net: 3800 },
      });

      expect(typeof summary).toBe('string');
      expect(summary.length).toBeGreaterThan(0);
    });
  });
});
