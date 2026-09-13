import { fmt } from '../utils';
import { t } from '../../i18n/engine';
import type { Transaction, Budget } from '@/types';

export function detectAnomalies(
  newTx: { amount: number; category: string },
  history: Transaction[] = []
): { isAnomaly: boolean; reason?: string } {
  if (!history || history.length < 5 || !newTx || !newTx.amount) {
    return { isAnomaly: false };
  }

  const categoryTxs = history.filter(t => t.type === 'expense' && t.category === newTx.category);
  if (categoryTxs.length < 3) {
    return { isAnomaly: false };
  }

  const amounts = categoryTxs.map(t => Number(t.amount) || 0);
  const mean = amounts.reduce((a, b) => a + b, 0) / amounts.length;
  
  // Sample standard deviation (Bessel's correction, n-1). These amounts are a
  // sample of the user's spending, not the whole population, and dividing by n
  // understates the spread — at the n=3 minimum that made the detector fire on
  // ordinary transactions.
  const variance =
    amounts.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
    Math.max(1, amounts.length - 1);
  const stdDev = Math.sqrt(variance);

  // If standard deviation is too small, fallback to multiplier check
  if (stdDev < 5) {
    if (newTx.amount > mean * 3 && newTx.amount > 100) {
      return { 
        isAnomaly: true, 
        reason: t('ai.anomaly.highMult', { mult: '3', mean: fmt(mean) }) || `المبلغ أعلى بكثير من متوسط صرفك في ${newTx.category} (${fmt(mean)})`
      };
    }
    return { isAnomaly: false };
  }

  // Z-Score >= 2.5 is considered an anomaly (top ~1%)
  const zScore = (newTx.amount - mean) / stdDev;
  if (zScore >= 2.5 && newTx.amount > mean * 2) {
    return {
      isAnomaly: true,
      reason: t('ai.anomaly.highZ', { mean: fmt(mean) }) || `هذه العملية أعلى بشكل غير معتاد مقارنة بنمط صرفك في ${newTx.category} (المتوسط: ${fmt(mean)})`
    };
  }

  return { isAnomaly: false };
}

export function generateSavingTips(transactions: Transaction[] = [], budgets: Budget[] = []): string[] {
  const tips: string[] = [];
  if (!transactions.length) return [t('ai.tips.start') || 'ابدأ بتسجيل مصاريفك اليومية لاكتشاف فرص التوفير!'];

  const expenses = transactions.filter(t => t.type === 'expense');
  const catTotals: Record<string, number> = {};
  expenses.forEach(t => {
    catTotals[t.category] = (catTotals[t.category] || 0) + (Number(t.amount) || 0);
  });

  const sortedCats = Object.entries(catTotals).sort((a, b) => b[1] - a[1]);
  if (sortedCats.length > 0) {
    const [topCat, topAmt] = sortedCats[0];
    tips.push(t('ai.tips.topCategory', { cat: topCat, amt: fmt(topAmt) }) || `أعلى تصنيف في إنفاقك هو "${topCat}" بإجمالي ${fmt(topAmt)}. حاول وضع سقف محدد له.`);
  }

  const overBudgets = budgets.filter(b => {
    const spent = catTotals[b.category] || 0;
    return spent > (b.limit || 0);
  });

  if (overBudgets.length > 0) {
    tips.push(t('ai.tips.overBudget', { count: String(overBudgets.length) }) || `لديك ${overBudgets.length} ميزانية تجاوزت الحد المحدد هذا الشهر.`);
  }

  return tips;
}

export { getRandomTip } from '../categoryUtils';
export { calculateFinancialScore } from '../services/StatisticsService';
