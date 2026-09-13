import { useState, useEffect } from 'react';
import { useHomeData } from '../../home/hooks/useHomeData';
import { generateAIChallenges, generateDeepInsights, getTransactionNecessity, type GeneratedChallenge } from '../../../ai';
import { TransactionRepository } from '../../../core/db/repositories/transactions';
import { silentFail } from '../../../core/utils';

export function useAdvisorData() {
  const homeData = useHomeData();
  const [challenges, setChallenges] = useState<GeneratedChallenge[]>([]);
  const [deepInsights, setDeepInsights] = useState<string>('');
  const [necessityStats, setNecessityStats] = useState({
    need: 0,
    want: 0,
    needPct: 0,
    wantPct: 0,
    total: 0
  });
  const [isAdvisorLoading, setIsAdvisorLoading] = useState(true);

  useEffect(() => {
    if (homeData.isLoading) return;
    let isMounted = true;

    (async () => {
      try {
        const allTxns = await TransactionRepository.getAll(300); // More for deep analysis
        const challengesData = generateAIChallenges({
          transactions: allTxns,
          monthStats: homeData.monthlyStats
        });
        
        const insights = await generateDeepInsights({
          transactions: allTxns,
          monthStats: homeData.monthlyStats,
          budgets: homeData.budgets,
          balance: homeData.balance,
          goals: homeData.goals
        });

        // Filter and compute current month's expenses need vs want
        const now = new Date();
        const cy = now.getFullYear();
        const cm = now.getMonth();
        const currentMonthExpenses = allTxns.filter(tx => {
          if (tx.type !== 'expense') return false;
          const d = new Date(tx.date || tx.createdAt!);
          return d.getFullYear() === cy && d.getMonth() === cm;
        });

        let needSum = 0;
        let wantSum = 0;
        
        currentMonthExpenses.forEach(tx => {
          let amt = Number(tx.amount) || 0;
          if (tx.shared && tx.splitBy && tx.splitBy > 1) {
            amt = amt / tx.splitBy;
          }
          const necessityType = tx.necessity || getTransactionNecessity(tx);
          if (necessityType === 'need') {
            needSum += amt;
          } else {
            wantSum += amt;
          }
        });

        const totalSum = needSum + wantSum;
        const needPct = totalSum > 0 ? Math.round((needSum / totalSum) * 100) : 0;
        const wantPct = totalSum > 0 ? Math.round((wantSum / totalSum) * 100) : 0;

        if (isMounted) {
          setChallenges(challengesData);
          setDeepInsights(insights);
          setNecessityStats({
            need: needSum,
            want: wantSum,
            needPct,
            wantPct,
            total: totalSum
          });
        }
      } catch (err) {
        silentFail('[AdvisorHook] Error')(err);
      } finally {
        if (isMounted) {
          setIsAdvisorLoading(false);
        }
      }
    })();

    return () => {
      isMounted = false;
    };
    // `budgets` and `goals` ARE read above (generateDeepInsights), so they
    // belong here: without them the advisor kept serving insights computed
    // from a stale budget or goal list. Their identities are stable thanks to
    // the memoised fallbacks in useHomeData.
  }, [
    homeData.isLoading,
    homeData.monthlyStats,
    homeData.balance,
    homeData.budgets,
    homeData.goals,
  ]);

  return {
    ...homeData,
    challenges,
    deepInsights,
    necessityStats,
    isAdvisorLoading: isAdvisorLoading || homeData.isLoading
  };
}
