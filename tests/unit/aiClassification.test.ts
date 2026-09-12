import { describe, it, expect } from 'vitest';
import { 
  getCategoryIcon, 
  getCategoryColor, 
  classifyTransaction, 
  classifyTransactionSmart,
  recordCategoryFeedback,
  getTransactionNecessity,
  calculateZakat,
  calculateVAT,
  simulateRetirement,
  detectSubscriptions,
  detectDuplicates,
  parseVoiceInput,
  detectAnomalies,
  generateSavingTips,
  calculateFinancialScore,
  generateAIChallenges,
  generateSmartRecommendations,
  CATEGORY_MAP 
} from '../../src/ai';
import type { Transaction } from '../../src/types';

describe('AI Engine & Category Classification Unit Tests', () => {
  it('should return correct icons and colors for standard categories', () => {
    expect(getCategoryIcon('groceries')).toBe('🛒');
    expect(getCategoryIcon('dining')).toBe('🍽️');
    expect(getCategoryIcon('unknown_cat')).toBe('📦');

    expect(getCategoryColor('groceries')).toBe('#10b981');
    expect(getCategoryColor('dining')).toBe('#f59e0b');
    expect(getCategoryColor('')).toBe('#94a3b8');
  });

  it('should have standard categories mapped in CATEGORY_MAP', () => {
    expect(CATEGORY_MAP['groceries']).toBe('مواد غذائية');
    expect(CATEGORY_MAP['dining']).toBe('مطاعم');
    expect(CATEGORY_MAP['transport']).toBe('مواصلات');
    expect(CATEGORY_MAP['salary']).toBe('راتب');
  });

  it('classifies transactions correctly using keywords and rules', async () => {
    expect(classifyTransaction('')).toBe('category.canonical.other');
    const diningMatch = classifyTransaction('عشاء في مطعم');
    expect(typeof diningMatch).toBe('string');

    const smartRes = await classifyTransactionSmart('شراء قهوة و وجبة خفيفة');
    expect(typeof smartRes).toBe('string');

    await recordCategoryFeedback('قهوة سريعة', 'مطاعم');
  });

  it('determines transaction necessity correctly (need vs want)', () => {
    expect(getTransactionNecessity({ necessity: 'need' })).toBe('need');
    expect(getTransactionNecessity({ necessity: 'want' })).toBe('want');
    expect(getTransactionNecessity({ category: 'مواد غذائية' })).toBe('need');
    expect(getTransactionNecessity({ category: 'ترفيه' })).toBe('want');
  });

  it('calculates Zakat accurately with nisab threshold', () => {
    const zakatBelow = calculateZakat(1000, 250);
    expect(zakatBelow.isAboveNisab).toBe(false);
    expect(zakatBelow.zakatAmount).toBe(0);

    const zakatAbove = calculateZakat(50000, 250);
    expect(zakatAbove.isAboveNisab).toBe(true);
    expect(zakatAbove.zakatAmount).toBe(1250);
  });

  it('calculates VAT correctly', () => {
    const vat = calculateVAT(100, 15);
    expect(vat.vatAmount).toBe(15);
    expect(vat.totalWithVAT).toBe(115);
  });

  it('simulates retirement trajectory correctly', () => {
    const sim = simulateRetirement({
      currentAge: 30,
      retireAge: 35,
      currentSavings: 10000,
      monthlyContribution: 1000,
      expectedReturn: 8,
      inflationRate: 3,
    });
    expect(sim.length).toBe(6);
    expect(sim[0].age).toBe(30);
    expect(sim[sim.length - 1].age).toBe(35);
    expect(sim[sim.length - 1].balance).toBeGreaterThan(10000);
  });

  it('detects subscriptions based on recurring transaction pattern', () => {
    const history: Transaction[] = [
      { id: '1', amount: 50, category: 'اشتراكات', type: 'expense', description: 'Netflix Monthly', date: '2026-05-01' },
      { id: '2', amount: 50, category: 'اشتراكات', type: 'expense', description: 'Netflix Monthly', date: '2026-06-01' },
      { id: '3', amount: 50, category: 'اشتراكات', type: 'expense', description: 'Netflix Monthly', date: '2026-07-01' },
    ];
    const subs = detectSubscriptions(history);
    expect(subs.length).toBeGreaterThanOrEqual(1);
    expect(subs[0].description).toBe('Netflix Monthly');
    expect(subs[0].amount).toBe(50);
  });

  it('detects duplicate transactions occurring on the same day', () => {
    const today = new Date().toISOString().split('T')[0];
    const existing: Transaction[] = [
      { id: '1', amount: 120, category: 'تسوق', type: 'expense', description: 'Zara Shirt', date: today },
    ];

    const dupes = detectDuplicates({ amount: 120, category: 'تسوق', description: 'Zara Shirt' }, existing);
    expect(dupes.length).toBe(1);

    const nonDupes = detectDuplicates({ amount: 200, category: 'تسوق', description: 'Zara Shirt' }, existing);
    expect(nonDupes.length).toBe(0);
  });

  it('parses voice input intelligently', async () => {
    const parsed = await parseVoiceInput('دفعت 150 ريال غداء في مطعم');
    expect(parsed).not.toBeNull();
    expect(parsed?.amount).toBe(150);
    expect(parsed?.type).toBe('expense');
  });

  it('generates saving tips and financial scores', () => {
    const transactions: Transaction[] = [
      { id: '1', amount: 500, category: 'مطاعم', type: 'expense', date: '2026-05-01' },
      { id: '2', amount: 200, category: 'بقالة', type: 'expense', date: '2026-05-02' },
    ];
    const tips = generateSavingTips(transactions, [{ id: 'b1', category: 'مطاعم', limit: 400 }]);
    expect(tips.length).toBeGreaterThan(0);

    const score = calculateFinancialScore({
      monthStats: { income: 5000, expense: 2000 },
      budgets: [{ id: 'b1', category: 'مطاعم', limit: 400 }],
      savings: 1000,
    });
    expect(score).toBeGreaterThan(50);
  });

  it('generates AI challenges and smart recommendations', () => {
    const transactions: Transaction[] = [
      { id: '1', amount: 800, category: 'مطاعم', type: 'expense', date: '2026-05-01' },
      { id: '2', amount: 600, category: 'تسوق', type: 'expense', date: '2026-05-02' },
    ];
    const challenges = generateAIChallenges({ transactions, monthStats: { income: 2000, expense: 1800 } });
    expect(challenges.length).toBeGreaterThan(0);

    const recs = generateSmartRecommendations({
      transactions,
      monthStats: { income: 2000, expense: 2500 },
      budgets: [{ id: 'b1', category: 'مطاعم', limit: 500 }],
    });
    expect(recs.length).toBeGreaterThan(0);
    expect(recs.some(r => r.priority === 'high')).toBe(true);
  });

  it('should detect anomalies in unusual spending amounts for a category', () => {
    const history: Transaction[] = [
      { id: '1', amount: 50, category: 'مطاعم', type: 'expense', date: '2026-05-01' },
      { id: '2', amount: 60, category: 'مطاعم', type: 'expense', date: '2026-05-02' },
      { id: '3', amount: 55, category: 'مطاعم', type: 'expense', date: '2026-05-03' },
      { id: '4', amount: 45, category: 'مطاعم', type: 'expense', date: '2026-05-04' },
      { id: '5', amount: 70, category: 'مطاعم', type: 'expense', date: '2026-05-05' },
    ];

    // Normal expense (50-70 range)
    const normalCheck = detectAnomalies({ amount: 65, category: 'مطاعم' }, history);
    expect(normalCheck.isAnomaly).toBe(false);

    // Extreme spike (e.g. 5000 SAR on restaurants where average is 56)
    const spikeCheck = detectAnomalies({ amount: 5000, category: 'مطاعم' }, history);
    expect(spikeCheck.isAnomaly).toBe(true);
  });

  it('should not flag anomaly if history is too sparse', () => {
    const sparseHistory: Transaction[] = [
      { id: '1', amount: 50, category: 'مطاعم', type: 'expense', date: '2026-05-01' }
    ];
    const check = detectAnomalies({ amount: 5000, category: 'مطاعم' }, sparseHistory);
    expect(check.isAnomaly).toBe(false);
  });
});
