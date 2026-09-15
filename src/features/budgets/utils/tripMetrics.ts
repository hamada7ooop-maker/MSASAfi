import { parseNum } from '../../../core/utils';
import type { Transaction, Trip } from '@/types';

/**
 * Directive 19 — decomposition continuation: the trip's cross-currency math.
 *
 * Lifted verbatim from the card body in TravelBudget.tsx. A trip's budget is
 * held in the foreign currency while spending is recorded in the base
 * currency — this reconciles the two directions (limit × rate forward,
 * spending ÷ rate back). tests/unit/travelBudget.test.tsx pins the rendered
 * figures these produce; tests/unit/tripMetrics.test.ts pins the arithmetic
 * itself.
 */

export interface TripSpendMetrics {
  /** Spending recorded in the base currency. */
  spentPrimary: number;
  /** The same spending expressed in the trip's foreign currency. */
  spentForeign: number;
  /** The foreign budget expressed in the base currency. */
  limitPrimary: number;
  /** Consumption percentage, clamped to 0–100. */
  pct: number;
  isWarning: boolean;
  isDanger: boolean;
}

export function tripSpendMetrics(trip: Trip, txs: Transaction[]): TripSpendMetrics {
  const spentPrimary = txs.reduce((sum, tx) => sum + (parseNum(tx.amount) || 0), 0);
  const spentForeign = spentPrimary / (parseNum(trip.exchangeRate) || 1);
  const limitPrimary = (parseNum(trip.limit) || 0) * (parseNum(trip.exchangeRate) || 1);
  const pct = limitPrimary > 0 ? Math.min(100, Math.max(0, (spentPrimary / limitPrimary) * 100)) : 0;

  const isWarning = pct >= 85 && pct < 100;
  const isDanger = pct >= 100;

  return { spentPrimary, spentForeign, limitPrimary, pct, isWarning, isDanger };
}
