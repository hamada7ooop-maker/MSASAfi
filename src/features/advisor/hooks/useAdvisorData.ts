import { useState, useEffect, useCallback } from 'react';
import { useHomeData } from '../../home/hooks/useHomeData';
import { generateAIChallenges, generateDeepInsights, getTransactionNecessity, type GeneratedChallenge } from '../../../ai';
import { TransactionRepository } from '../../../core/db/repositories/transactions';
import { silentFail } from '../../../core/utils';
import { toError } from '../../../core/hooks/useLiveQuerySafe';

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
  // Directive 16: this effect's own fetch failure (distinct from the home
  // data live queries) must be distinguishable from "no insights generated".
  const [advisorError, setAdvisorError] = useState<Error | null>(null);
  // Bumped by retry() to re-run the analysis effect.
  const [retryToken, setRetryToken] = useState(0);

  useEffect(() => {
    // Directive 17 item 3: homeData.isLoading now genuinely means "first
    // result not in yet" — wait for real data before analysing. An early
    // failure (error set, first result never arriving) must NOT wait here:
    // the analysis runs on what is available and the error surfaces (an
    // eternal "return" would trap the advisor page in skeletons forever).
    if (homeData.isLoading && !homeData.error) return;
    let isMounted = true;

    (async () => {
      try {
        const allTxns = await TransactionRepository.getAll(300); // More for deep analysis
        setAdvisorError(null);
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
        if (isMounted) setAdvisorError(toError(err));
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
    //
    // `homeData.error` is a CONTROL input of the guard above, not just an
    // observation: when an early failure arrives (error null → Error while
    // isLoading is still true), the effect must re-run so the analysis can
    // proceed on what is available — otherwise it would wait forever for a
    // first result that will never come and the page would hang in
    // skeletons. (This was caught live by the mutation-style test in
    // firstResultLoading.test.tsx — and by eslint's exhaustive-deps, which
    // was right.)
  }, [
    homeData.isLoading,
    homeData.error,
    homeData.monthlyStats,
    homeData.balance,
    homeData.budgets,
    homeData.goals,
    retryToken,
  ]);

  /** Retries both the advisor analysis and the underlying home data. */
  const homeRetry = homeData.retry;
  const retry = useCallback(() => {
    setRetryToken(t => t + 1);
    homeRetry();
  }, [homeRetry]);

  return {
    ...homeData,
    challenges,
    deepInsights,
    necessityStats,
    // Directive 17 item 3: `homeData.isLoading` is now a live signal (true
    // until the first result). A persistent early failure keeps it true
    // forever — but that is not "loading", it is an error the page will
    // display (the `&& !error` guard mirrors the skeleton guard in
    // AdvisorPage). Without it, the page would show skeletons forever
    // instead of the error state.
    isAdvisorLoading: isAdvisorLoading || (homeData.isLoading && !homeData.error),
    // Advisor's own failure wins; otherwise surface the home data failure
    // that flows in through the spread above.
    error: advisorError || homeData.error,
    retry
  };
}
