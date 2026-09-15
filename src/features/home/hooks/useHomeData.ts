import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useLiveQuerySafe } from '../../../core/hooks/useLiveQuerySafe';
import { useIsMounted } from '../../../hooks/useIsMounted';
import { TransactionRepository } from '../../../core/db/repositories/transactions';
import { BudgetRepository } from '../../../core/db/repositories/budgets';
import { GoalRepository } from '../../../core/db/repositories/goals';
import { DebtRepository } from '../../../core/db/repositories/debts';
import { BillRepository } from '../../../core/db/repositories/bills';
import { AccountRepository } from '../../../core/db/repositories/accounts';
import { StatisticsService, calculateFinancialScore } from '../../../core/services/StatisticsService';
import { silentFail } from '../../../core/utils';
import type { Goal, Bill, Debt, Budget, Transaction, SmartRecommendation } from '@/types';
import type { EconomicIndicator, CryptoCoin, MarketNewsItem } from '../components/dashboard/PulseStrip';

export interface SustainabilityInfo {
  status: 'sunny' | 'cloudy' | 'stormy';
  basis: 'budget' | 'income';
  daysLeft: number;
}

export interface AnomalyItem {
  category: string;
  increase: number;
}

export interface PredictionInfo {
  daysLeft: number;
  predictedBalance: number;
}

export interface NetWorthPoint {
  label: string;
  value: number;
  timestamp: number;
  month?: string;
  netWorth?: number;
  assets?: number;
  liabilities?: number;
}

export interface HomeMarketData {
  news: MarketNewsItem[] | 'missing' | null;
  economic: EconomicIndicator[] | 'missing' | null;
  crypto: CryptoCoin[] | null;
}

// Module-scoped cache for market data to prevent duplicate fetching
const marketCache: {
  financialNews: MarketNewsItem[] | 'missing' | null;
  isNewsLoading: boolean;
  economicIndicators: EconomicIndicator[] | 'missing' | null;
  isEconomicLoading: boolean;
  cryptoPrices: CryptoCoin[] | null;
  isCryptoLoading: boolean;
} = {
  financialNews: null,
  isNewsLoading: false,
  economicIndicators: null,
  isEconomicLoading: false,
  cryptoPrices: null,
  isCryptoLoading: false,
};

export function useHomeData(
  year: number = new Date().getFullYear(),
  month: number = new Date().getMonth()
) {
  const isMounted = useIsMounted();
  // ── Directive 16: error-capturing live queries ────────────────────────────
  // The stock useLiveQuery THROWS when a querier rejects, detonating the whole
  // render up to the nearest ErrorBoundary. useLiveQuerySafe routes the same
  // Dexie.liveQuery subscription's error callback into state, so this hook can
  // expose `error` and `retry` instead of crashing the dashboard.
  // `retryToken` is appended to every query's deps: bumping it resubscribes
  // all of them — a resubscription IS the retry.
  const [retryToken, setRetryToken] = useState(0);
  const retry = useCallback(() => setRetryToken(t => t + 1), []);

  // ── Database Queries via Repositories ─────────────────────────────────────
  const {
    result: recentTransactions,
    error: recentTxnError,
    hasFirstResult: recentTxnLoaded,
  } = useLiveQuerySafe(
    () => TransactionRepository.getRecent(5),
    [retryToken], [] as Transaction[]
  );

  const {
    result: allBudgets,
    error: budgetsError,
    hasFirstResult: budgetsLoaded,
  } = useLiveQuerySafe(
    () => BudgetRepository.getAll(),
    [retryToken], [] as Budget[]
  );

  const {
    result: upcomingBills,
    error: billsError,
  } = useLiveQuerySafe(
    async () => {
      const [unpaidBills, rawSubs] = await Promise.all([
        BillRepository.getUpcoming(30),
        BillRepository.getSubscriptions()
      ]);

      const now = new Date();
      const mappedSubs = rawSubs.map(s => {
        let date = new Date(now.getFullYear(), now.getMonth(), parseInt(s.renewDate || '1'));
        if (date < now) date = new Date(now.getFullYear(), now.getMonth() + 1, parseInt(s.renewDate || '1'));
        return {
          ...s,
          dueDate: date.toISOString().slice(0, 10),
          isSubscription: true
        };
      });

      return [...unpaidBills, ...mappedSubs]
        .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
        .slice(0, 10);
    },
    [retryToken], [] as Array<Bill & { isSubscription?: boolean }>
  );

  const {
    result: allGoals,
    error: goalsError,
  } = useLiveQuerySafe(
    () => GoalRepository.getAll(),
    [retryToken], [] as Goal[]
  );

  const {
    result: owedDebts,
    error: debtsError,
  } = useLiveQuerySafe(async () => {
    const all = await DebtRepository.getOwed();
    return all
      .map(d => ({ ...d, remaining: (Number(d.total) || 0) - (Number(d.paid) || 0) }))
      .filter(d => d.remaining > 0)
      .sort((a, b) => a.remaining - b.remaining);
  }, [retryToken], [] as Array<Debt & { remaining: number }>);

  // Monthly stats via StatisticsService
  const {
    result: monthlyStats,
    error: statsError,
    hasFirstResult: statsLoaded,
  } = useLiveQuerySafe(
    () => StatisticsService.getMonthlySummary(year, month),
    [year, month, retryToken],
    { income: 0, expense: 0, count: 0, breakdown: {}, net: 0, weekly: { income: 0, expense: 0, net: 0 } }
  );

  const {
    result: totalBalance,
    error: balanceError,
  } = useLiveQuerySafe(
    () => AccountRepository.getTotalBalance(),
    [retryToken], 0
  );

  const {
    result: streak,
    error: streakError,
  } = useLiveQuerySafe(async () => {
    const now = new Date();
    const txns = await TransactionRepository.getAll(100);
    const activeDays = new Set(txns.map(t => new Date(t.date || t.createdAt!).toISOString().slice(0, 10)));
    let currentStreak = 0;
    for (let i = 0; i < 60; i++) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      if (activeDays.has(d.toISOString().slice(0, 10))) currentStreak++;
      else break;
    }
    return currentStreak;
  }, [retryToken], 0);

  // First failed live query wins; the dashboard renders one error state for
  // the whole board (one broken table should not show eight panels).
  const liveError =
    recentTxnError || budgetsError || billsError || goalsError ||
    debtsError || statsError || balanceError || streakError || null;

  // ── Derived / heavy computations (run once per fresh data) ───────────────
  const [extras, setExtras] = useState<{
    sustainability: SustainabilityInfo | null;
    recommendations: SmartRecommendation[];
    financialScore: number;
    prediction: PredictionInfo;
    anomalies: AnomalyItem[];
    marketData: HomeMarketData;
    nwPeriod: number;
  }>({
    sustainability: null,
    recommendations: [],
    financialScore: 0,
    prediction: { daysLeft: 30, predictedBalance: 0 },
    anomalies: [],
    marketData: { news: null, economic: null, crypto: null },
    nwPeriod: 6
  });
  const [netWorthHistory, setNetWorthHistory] = useState<NetWorthPoint[]>([]);
  const prevStats = useRef('');

  useEffect(() => {
    if (!monthlyStats) return;
    const key = JSON.stringify({ 
      income: monthlyStats.income, 
      expense: monthlyStats.expense, 
      count: monthlyStats.count, 
      budgetsCount: allBudgets?.length,
      goalsCount: allGoals?.length,
      debtsCount: owedDebts?.length
    });
    if (key === prevStats.current) return;
    prevStats.current = key;

    (async () => {
      try {
        const prevMonthStats = await StatisticsService.getMonthlySummary(
          month === 0 ? year - 1 : year, 
          month === 0 ? 11 : month - 1
        );

        // ── Financial Forecast / Pace Engine ──
        const now = new Date();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const daysPassed = Math.max(1, now.getDate());
        const daysLeft = Math.max(1, daysInMonth - daysPassed);
        const dailyBurnRate = monthlyStats.expense / daysPassed;
        const projectedExpense = dailyBurnRate * daysInMonth;
        const currentBalance = totalBalance || 0;
        const predictedBalance = currentBalance + (monthlyStats.income - projectedExpense);

        // ── Financial Sustainability Engine ──
        const totalBudget = (allBudgets || []).reduce((s, b) => s + (Number(b.limit) || 0), 0);
        let sustStatus: 'sunny' | 'cloudy' | 'stormy' = 'sunny';
        let sustBasis: 'budget' | 'income' = 'budget';

        if (totalBudget > 0) {
          const burnRatio = monthlyStats.expense / totalBudget;
          const timeRatio = daysPassed / daysInMonth;
          if (burnRatio > timeRatio * 1.25 || burnRatio >= 1) {
            sustStatus = 'stormy';
          } else if (burnRatio > timeRatio) {
            sustStatus = 'cloudy';
          }
        } else if (monthlyStats.income > 0) {
          sustBasis = 'income';
          if (monthlyStats.expense > monthlyStats.income) {
            sustStatus = 'stormy';
          } else if (monthlyStats.expense > monthlyStats.income * 0.8) {
            sustStatus = 'cloudy';
          }
        }

        let sustainability: SustainabilityInfo | null = null;
        if (totalBudget > 0 || monthlyStats.income > 0 || monthlyStats.expense > 0) {
          sustainability = { status: sustStatus, basis: sustBasis, daysLeft };
        }

        // --- Anomalies Engine (Alerts Center) ---
        const anomalies: AnomalyItem[] = [];
        const limitBase = totalBudget > 0 ? totalBudget : (monthlyStats.income > 0 ? monthlyStats.income : monthlyStats.expense * 2);
        if (limitBase > 0) {
          for (const [cat, amount] of Object.entries(monthlyStats.breakdown || {})) {
            const pct = (amount as number) / limitBase;
            if (pct >= 0.4) {
              anomalies.push({
                category: cat,
                increase: Math.round(pct * 100)
              });
            }
          }
        }
        
        const score = calculateFinancialScore({
          monthStats: monthlyStats,
          budgets: allBudgets || [],
          savings: totalBalance || 0,
          debts: owedDebts || [],
        });

        // Fetch market data if missing
        const marketData: HomeMarketData = { 
          news: marketCache.financialNews, 
          economic: marketCache.economicIndicators, 
          crypto: marketCache.cryptoPrices 
        };

        const updateMarketState = () => {
          if (!isMounted.current) return;
          setExtras(prev => ({
            ...prev,
            marketData: {
              news: marketCache.financialNews,
              economic: marketCache.economicIndicators,
              crypto: marketCache.cryptoPrices
            }
          }));
        };

        // Auto-fetch News
        if (!marketData.news && !marketCache.isNewsLoading) {
          marketCache.isNewsLoading = true;
          import('../../../services/marketData').then(m => m.fetchFinancialNews()).then(news => {
            marketCache.financialNews = news === null ? 'missing' : (Array.isArray(news) ? news.slice(0, 20) : news);
            marketCache.isNewsLoading = false;
            updateMarketState();
          });
        }

        // Auto-fetch Economic
        if (!marketData.economic && !marketCache.isEconomicLoading) {
          marketCache.isEconomicLoading = true;
          import('../../../services/marketData').then(m => m.fetchEconomicIndicators()).then(data => {
            marketCache.economicIndicators = data === null ? 'missing' : (data as unknown as EconomicIndicator[]);
            marketCache.isEconomicLoading = false;
            updateMarketState();
          });
        }

        // Auto-fetch Crypto
        if (!marketData.crypto && !marketCache.isCryptoLoading) {
          marketCache.isCryptoLoading = true;
          import('../../../services/marketData').then(m => m.fetchCryptoPrices()).then(data => {
            marketCache.cryptoPrices = data || [];
            marketCache.isCryptoLoading = false;
            updateMarketState();
          });
        }

        // Auto-load smart recommendations post-hydration to keep feature-ai separated
        import('../../../core/ai/insightsService').then(({ generateSmartRecommendations }) => {
          const recs = generateSmartRecommendations({
            monthStats: monthlyStats,
            prevMonthStats,
            budgets: allBudgets || [],
            goals: allGoals || [],
            debts: owedDebts || [],
            transactions: recentTransactions || []
          });
          if (isMounted.current) {
            setExtras(prev => ({ ...prev, recommendations: recs }));
          }
        }).catch(silentFail('[useHomeData] recommendations error'));

        if (isMounted.current) {
          setExtras(prev => ({ 
            ...prev,
            sustainability, 
            financialScore: score,
            prediction: { daysLeft, predictedBalance },
            anomalies,
            marketData
          }));
        }
      } catch (err) {
        silentFail('[useHomeData] Computation error')(err);
      }
    })();
  }, [monthlyStats, allBudgets, allGoals, owedDebts, recentTransactions, totalBalance, year, month, isMounted]);

  // Load Net Worth History
  useEffect(() => {
    (async () => {
      try {
        let totalOwed = 0;
        for (const d of (owedDebts || [])) {
          totalOwed += (d.remaining !== undefined ? d.remaining : ((d.total || 0) - (d.paid || 0)));
        }
        const history = await StatisticsService.getNetWorthHistory(extras.nwPeriod || 6, totalBalance, totalOwed);
        if (isMounted.current) {
          setNetWorthHistory(history);
        }
      } catch (err) {
        silentFail('[useHomeData] Net worth history error')(err);
      }
    })();
  }, [extras.nwPeriod, totalBalance, owedDebts, recentTransactions, isMounted]);

  const setNwPeriod = (period: number) => {
    setExtras(prev => ({ ...prev, nwPeriod: period }));
  };

  // ── Reference stability ────────────────────────────────────────────────
  // `x || []` allocates a NEW array on every render while `x` is still
  // undefined (useLiveQuery returns undefined until its first result lands).
  // Consumers that put these values in a dependency array would therefore
  // re-run their effects on every render during loading — which is why
  // several of them carried an eslint-disable instead of honest deps.
  // Memoising the empty fallbacks makes the identities stable, so those
  // dependency arrays can now be correct and complete.
  // ───────────────────────────────────────────────────────────────────────
  const EMPTY = useMemo(() => [] as never[], []);

  const safeMonthlyStats = useMemo(
    () =>
      monthlyStats || {
        income: 0,
        expense: 0,
        count: 0,
        breakdown: {},
        net: 0,
        weekly: { income: 0, expense: 0, net: 0 },
      },
    [monthlyStats]
  );

  return {
    recentTransactions: recentTransactions || EMPTY,
    allBudgets: allBudgets || EMPTY,
    budgets: allBudgets || EMPTY, // Alias for Dashboard compatibility
    upcomingBills: upcomingBills || EMPTY,
    allGoals: allGoals || EMPTY,
    goals: allGoals || EMPTY, // Alias for Advisor compatibility
    owedDebts: owedDebts || EMPTY,
    monthlyStats: safeMonthlyStats,
    categoryBreakdown: safeMonthlyStats.breakdown || {},
    totalBalance: totalBalance || 0,
    balance: totalBalance || 0, // Alias for Dashboard compatibility
    // Directive 17 item 3: "first result" semantics. The seeded defaults are
    // never undefined, so the old `=== undefined` comparisons never fired and
    // this flag was permanently false — the dashboard never showed its
    // skeletons and rendered a flash of empty numbers instead. Loading now
    // genuinely means "the first real result has not arrived yet".
    isLoading: !(recentTxnLoaded && budgetsLoaded && statsLoaded),
    error: liveError,
    retry,
    streak: streak || 0,
    sustainability: extras.sustainability,
    recommendations: extras.recommendations,
    financialScore: extras.financialScore,
    prediction: extras.prediction,
    anomalies: extras.anomalies,
    marketData: extras.marketData,
    netWorthHistory,
    nwPeriod: extras.nwPeriod,
    setNwPeriod
  };
}
