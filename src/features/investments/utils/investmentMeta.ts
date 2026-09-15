import type { Investment } from '../../../types';

/**
 * Directive 19 — deferred decomposition: the investment display vocabulary.
 *
 * INV_ICONS / INV_COLORS lifted verbatim from Investments.tsx; the profit
 * math (previously inlined in the card) extracted as a pure function so
 * the card renders and the arithmetic is testable apart.
 */

export const INV_ICONS: Record<string, string> = {
  stocks: '📈', crypto: '₿', real_estate: '🏠',
  gold: '🪙', reit: '🏢', other: '📦'
};

export const INV_COLORS: Record<string, string> = {
  stocks: '#3b82f6', crypto: '#f59e0b', real_estate: '#10b981',
  gold: '#fbbf24', reit: '#6366f1', other: '#8b5cf6'
};

export interface InvestmentMetrics {
  profit: number;
  profitPct: number;
}

export function investmentMetrics(inv: Pick<Investment, 'value' | 'cost'>): InvestmentMetrics {
  const profit = inv.value - inv.cost;
  const profitPct = inv.cost > 0 ? (profit / inv.cost) * 100 : 0;
  return { profit, profitPct };
}
