import { useState, useEffect } from 'react';
import { TransactionRepository } from '../../../core/db/repositories/transactions';
import { useAppStore } from '../../../store/appStore';
import { useShallow } from 'zustand/react/shallow';
import { useIsMounted } from '../../../hooks/useIsMounted';
import { silentFail } from '../../../core/utils';
import type { Transaction } from '../../../types';

export interface MonthTrendStats {
  year: number;
  month: number;
  income: number;
  expense: number;
  count: number;
  balance?: number;
}

/**
 * useReportsData Hook - Fetches and aggregates reporting data based on the current period.
 */
export function useReportsData() {
  const isMounted = useIsMounted();
  const { reportPeriod, customRange } = useAppStore(
    useShallow((s) => ({
      reportPeriod: s.reportPeriod,
      customRange: s.customRange
    }))
  );
  const [data, setData] = useState<{
    monthlyStats: { income: number; expense: number; count: number };
    prevStats: { income: number; expense: number; count: number } | null;
    last6Months: MonthTrendStats[];
    topExpenses: Transaction[];
    weeklyStats: { income: number; expense: number; count: number };
    categoryBreakdown: Record<string, number>;
    isLoading: boolean;
  }>({
    monthlyStats: { income: 0, expense: 0, count: 0 },
    prevStats: null,
    last6Months: [],
    topExpenses: [],
    weeklyStats: { income: 0, expense: 0, count: 0 },
    categoryBreakdown: {},
    isLoading: true,
  });

  const fetchData = async () => {
    try {
      if (isMounted.current) {
        setData(prev => ({ ...prev, isLoading: true }));
      }
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth();

      // 1. Current Month Stats
      const stats = await TransactionRepository.getMonthlyStats(year, month);

      // 2. Previous Month Stats (for comparison)
      const prevDate = new Date(year, month - 1, 1);
      const prevStats = await TransactionRepository.getMonthlyStats(prevDate.getFullYear(), prevDate.getMonth());

      // 3. Last 6 Months (for trend chart)
      const last6Months = await TransactionRepository.getLast6MonthsStats();

      // 4. Top Expenses (Current Month)
      const allTxns = await TransactionRepository.getByMonth(year, month);
      const topExpenses = allTxns
        .filter(t => t.type === 'expense')
        .sort((a, b) => (b.amount || 0) - (a.amount || 0))
        .slice(0, 5);

      // 5. Weekly Stats (Current week)
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - now.getDay());
      const weekTxns = allTxns.filter(t => {
        const d = new Date(t.date || t.createdAt || Date.now());
        return d >= weekStart;
      });
      const weekIncome = weekTxns.filter(t => t.type === 'income').reduce((s, t) => s + (t.amount || 0), 0);
      const weekExpense = weekTxns.filter(t => t.type === 'expense').reduce((s, t) => s + (t.amount || 0), 0);

      // 6. Category Breakdown
      const breakdown = await TransactionRepository.getCategoryBreakdown(year, month);

      // Handle custom range if active
      let finalStats = stats;
      if (reportPeriod === 'custom' && customRange) {
         const rangeTxns = await TransactionRepository.getByRange(customRange.from, customRange.to);
         const rInc = rangeTxns.filter(t => t.type === 'income').reduce((s, t) => s + (t.amount || 0), 0);
         const rExp = rangeTxns.filter(t => t.type === 'expense').reduce((s, t) => s + (t.amount || 0), 0);
         finalStats = { income: rInc, expense: rExp, count: rangeTxns.length };
      }

      if (isMounted.current) {
        setData({
          monthlyStats: finalStats,
          prevStats,
          last6Months,
          topExpenses,
          weeklyStats: { income: weekIncome, expense: weekExpense, count: weekTxns.length },
          categoryBreakdown: breakdown,
          isLoading: false,
        });
      }
    } catch (error) {
      silentFail('[useReportsData] Error fetching reports')(error);
      if (isMounted.current) {
        setData(prev => ({ ...prev, isLoading: false }));
      }
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportPeriod, customRange]);

  return { ...data, refresh: fetchData };
}
