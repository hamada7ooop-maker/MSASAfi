import { fmt, silentFail } from '../utils';
import { t } from '../../i18n/engine';
import { useSettingsStore } from '../../store/settingsStore';
import { CATEGORY_ALIASES } from './constants';
import { StatisticsService } from '../services/StatisticsService';
import type { Transaction, Budget, Goal, Debt } from '@/types';

export { CATEGORY_ALIASES };

export interface GeneratedChallenge {
  id: string;
  icon: string;
  title: string;
  body: string;
  reward: number;
  type: 'saving' | 'restraint' | 'goal';
}

export function getCategorySpending(catMap: Record<string, number>, canonicalId: string): number {
  const aliases = CATEGORY_ALIASES[canonicalId] || [canonicalId];
  let total = 0;
  const matched = new Set<string>();

  for (const [catName, amount] of Object.entries(catMap)) {
    const lowerName = catName.toLowerCase().trim();
    if (aliases.some(alias => lowerName === alias.toLowerCase() || lowerName.includes(alias.toLowerCase()))) {
      if (!matched.has(catName)) {
        matched.add(catName);
        total += Number(amount) || 0;
      }
    }
  }

  return total || catMap[canonicalId] || 0;
}

export function isCategoryMatching(categoryName: string, canonicalId: string): boolean {
  if (!categoryName) return false;
  const aliases = CATEGORY_ALIASES[canonicalId] || [canonicalId];
  const lower = categoryName.toLowerCase().trim();
  return aliases.some(alias => lower === alias.toLowerCase() || lower.includes(alias.toLowerCase()));
}

export function generateAIChallenges(data: {
  transactions?: Transaction[];
  monthStats?: { income?: number; expense?: number };
}): GeneratedChallenge[] {
  try {
    const { transactions = [], monthStats = {} } = data;
    const challenges: GeneratedChallenge[] = [];
    const catMap: Record<string, number> = {};
    transactions.filter(tx => tx.type === 'expense').forEach(tx => {
      catMap[tx.category] = (catMap[tx.category] || 0) + (Number(tx.amount) || 0);
    });

    const diningSpent = getCategorySpending(catMap, 'dining');
    if (diningSpent > 0) {
      challenges.push({
        id: 'challenge_dining',
        icon: '🍽️',
        title: t('ai.challenge.dining'),
        body: t('ai.challenge.diningBody'),
        reward: 150,
        type: 'saving'
      });
    }

    const shoppingSpent = getCategorySpending(catMap, 'shopping');
    if (shoppingSpent > 0) {
      challenges.push({
        id: 'challenge_shopping',
        icon: '🛍️',
        title: t('ai.challenge.shopping'),
        body: t('ai.challenge.shoppingBody'),
        reward: 200,
        type: 'restraint'
      });
    }

    const expense = monthStats.expense || 0;
    const income = monthStats.income || 0;
    if (income > 0 && expense / income > 0.8) {
      challenges.push({
        id: 'challenge_savings_boost',
        icon: '💰',
        title: t('ai.advisor.score'),
        body: t('ai.advisor.scoreDesc'),
        reward: 300,
        type: 'goal'
      });
    }

    return challenges.slice(0, 3);
  } catch (err) {
    silentFail('[AI] Challenges error')(err);
    return [];
  }
}

export interface SmartRecommendation {
  id: string;
  priority: 'high' | 'medium' | 'low';
  icon: string;
  title: string;
  body: string;
  action: string | null;
}

export function generateSmartRecommendations(data: {
  transactions?: Transaction[];
  budgets?: Budget[];
  goals?: Goal[];
  debts?: Debt[];
  monthStats?: { income?: number; expense?: number };
  prevMonthStats?: { expense?: number };
}): SmartRecommendation[] {
  try {
    const { transactions = [], budgets = [], goals = [], debts = [], monthStats = {}, prevMonthStats } = data;
    const thisInc = monthStats.income || 0;
    const thisExp = monthStats.expense || 0;
    const prevExp = prevMonthStats?.expense || 0;
    const recs: SmartRecommendation[] = [];

    // Work Hours Alert
    const { hourlyRate: hRate, isWorkHoursEnabled } = useSettingsStore.getState();
    const hr = isWorkHoursEnabled ? (hRate || 0) : 0;
    if (hr > 0 && thisExp > 0) {
      const hoursSpent = thisExp / hr;
      if (hoursSpent > 100) {
        recs.push({ 
          id: 'work-time-alert', 
          priority: 'medium', 
          icon: '⏳',
          title: t('ai.rec.workTimeTitle'),
          body: t('ai.rec.workTimeBody', { hours: hoursSpent.toFixed(0) }),
          action: 'reports' 
        });
      }
    }

    if (thisInc > 0 && thisExp > thisInc) {
      recs.push({ id: 'overspend', priority: 'high', icon: '🚨',
        title: t('ai.rec.overspendTitle'),
        body: t('ai.rec.overspendBody', { delta: fmt(thisExp - thisInc) }),
        action: 'reports' });
    }

    if (prevExp > 0 && thisExp > prevExp * 1.25) {
      const pct = Math.round(((thisExp - prevExp) / prevExp) * 100);
      recs.push({ id: 'spike', priority: 'high', icon: '📈',
        title: t('ai.rec.spikeTitle'),
        body: t('ai.rec.spikeBody', { pct: String(pct) }),
        action: 'reports' });
    }

    const catMap: Record<string, number> = {};
    transactions.filter(tx => tx.type === 'expense').forEach(tx => {
      const cat = tx.category || 'other';
      let amt = Number(tx.amount) || 0;
      if (tx.shared && tx.splitBy && tx.splitBy > 1) amt = amt / tx.splitBy;
      catMap[cat] = (catMap[cat] || 0) + amt;
    });

    budgets.forEach(b => {
      const spent = catMap[b.category] || 0;
      const limit = Number(b.limit) || 0;
      const ratio = limit > 0 ? spent / limit : 0;
      if (ratio >= 1) {
        recs.push({ id: `budget-over-${b.id}`, priority: 'high', icon: '💸',
          title: t('ai.rec.budgetOverTitle', { cat: b.category }),
          body: t('ai.rec.budgetOverBody', { spent: fmt(spent), limit: fmt(limit) }),
          action: 'budgets' });
      } else if (ratio >= 0.8) {
        recs.push({ id: `budget-warn-${b.id}`, priority: 'medium', icon: '⚠️',
          title: t('ai.rec.budgetWarnTitle', { cat: b.category }),
          body: t('ai.rec.budgetWarnBody', { pct: String(Math.round(ratio * 100)) }),
          action: 'budgets' });
      }
    });

    const subTotal = transactions
      .filter(tx => tx.type === 'expense' && isCategoryMatching(tx.category, 'subscriptions'))
      .reduce((s, tx) => s + (Number(tx.amount) || 0), 0);
    if (subTotal > 0 && thisInc > 0 && subTotal / thisInc > 0.1) {
      recs.push({ id: 'subscriptions', priority: 'medium', icon: '📱',
        title: t('ai.rec.subTitle'),
        body: t('ai.rec.subBody', { amt: fmt(subTotal) }),
        action: 'transactions' });
    }

    if (thisInc > 0) {
      const savRate = (thisInc - thisExp) / thisInc;
      if (savRate >= 0 && savRate < 0.1) {
        recs.push({ id: 'low-savings', priority: 'medium', icon: '🏦',
          title: t('ai.rec.savingsLowTitle'),
          body: t('ai.rec.savingsLowBody', { pct: String(Math.round(savRate * 100)) }),
          action: 'goals' });
      } else if (savRate >= 0.3) {
        recs.push({ id: 'great-savings', priority: 'low', icon: '🌟',
          title: t('ai.rec.savingsGreatTitle'),
          body: t('ai.rec.savingsGreatBody', { pct: String(Math.round(savRate * 100)) }),
          action: null });
      }
    }

    if (Array.isArray(goals)) {
      goals.forEach(g => {
        const target = Number(g.target) || 0;
        const pct = target > 0 ? (Number(g.saved) || 0) / target : 0;
        const daysSince = (Date.now() - new Date(g.targetDate || Date.now()).getTime()) / 86400000;
        if (daysSince > 30 && pct < 0.05) {
          recs.push({ id: `goal-stale-${g.id}`, priority: 'low', icon: '🎯',
            title: t('ai.rec.goalStaleTitle', { name: g.name || '' }),
            body: t('ai.rec.goalStaleBody'),
            action: 'goals' });
        }
      });
    }

    if (Array.isArray(debts)) {
      const totalOwed = debts.filter(d => d.type === 'owed').reduce((s, d) => s + Math.max(0, (Number(d.total) || 0) - (Number(d.paid) || 0)), 0);
      if (totalOwed > 0 && thisInc > 0 && totalOwed > thisInc * 3) {
        recs.push({ id: 'high-debt', priority: 'high', icon: '⛔',
          title: t('ai.rec.debtHighTitle'),
          body: t('ai.rec.debtHighBody', { amt: fmt(totalOwed) }),
          action: 'debts' });
      }
    }

    const order: Record<string, number> = { high: 0, medium: 1, low: 2 };
    return recs.sort((a, b) => order[a.priority] - order[b.priority]).slice(0, 5);
  } catch (err) {
    silentFail('[AI] Recommendation error')(err);
    return [];
  }
}

export async function generateDeepInsights(data: {
  transactions?: Transaction[];
  monthStats?: { income?: number; expense?: number; net?: number };
  budgets?: Budget[];
  balance?: number;
  goals?: Goal[];
}): Promise<string> {
  try {
    const { transactions = [], monthStats = { income: 0, expense: 0, net: 0 }, budgets = [] } = data;
    const insights: string[] = [];
    const catMap: Record<string, number> = {};
    transactions.filter(tx => tx.type === 'expense').forEach(tx => {
      catMap[tx.category] = (catMap[tx.category] || 0) + (Number(tx.amount) || 0);
    });
    const sortedCats = Object.entries(catMap).sort((a, b) => b[1] - a[1]);
    
    if (sortedCats.length > 0) {
      const [topCat, topAmt] = sortedCats[0];
      insights.push(t('chat.ai.deepTopCat', { cat: topCat, amt: fmt(topAmt) }));
    }

    const prevMonth = await StatisticsService.getPreviousMonthSummary(new Date().getFullYear(), new Date().getMonth());
    if (prevMonth && prevMonth.expense > 0) {
      const currentExpense = monthStats.expense || 0;
      const diff = currentExpense - prevMonth.expense;
      const pct = Math.abs(Math.round((diff / prevMonth.expense) * 100));
      const status = diff > 0 ? (t('common.increasing') || 'متزايدة') : (t('common.decreasing') || 'متناقصة');
      insights.push(t('chat.ai.deepTrend', { status, pct }));
    }

    budgets.forEach(b => {
      const spent = catMap[b.category] || 0;
      const limit = Number(b.limit) || 1;
      const pct = Math.round((spent / limit) * 100);
      if (pct >= 80) {
        insights.push(t('chat.ai.deepBudgetWarn', { cat: b.category, pct }));
      }
    });

    const net = monthStats.net ?? ((monthStats.income || 0) - (monthStats.expense || 0));
    if (net > 0) {
      insights.push(t('chat.ai.deepSavingsGreat', { amt: fmt(net) }));
    }

    return insights.length > 0 ? insights.join('\n\n') : t('chat.ai.noTopData');
  } catch (err) {
    silentFail('[AI] DeepInsights error')(err);
    return t('chat.ai.noTopData');
  }
}
