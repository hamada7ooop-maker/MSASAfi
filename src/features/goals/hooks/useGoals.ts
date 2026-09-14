import { useState, useEffect, useCallback } from 'react';
import { db as DB } from '@/core/db/core';
import type { Goal, Account } from '../../../types';
import { useAppStore } from '../../../store/appStore';
import { useShallow } from 'zustand/react/shallow';
import { useIsMounted } from '../../../hooks/useIsMounted';
import { toast } from '../../../toast';
import { useI18n } from '../../../i18n/index';
import { silentFail } from '../../../core/utils';
import { toError } from '../../../core/hooks/useLiveQuerySafe';

export function useGoals() {
  const { t } = useI18n();
  const isMounted = useIsMounted();
  const { selectedItems, clearSelection } = useAppStore(
    useShallow((s) => ({
      selectedItems: s.selectedItems,
      clearSelection: s.clearSelection
    }))
  );
  
  const [goals, setGoals] = useState<Goal[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [suggestedAuto, setSuggestedAuto] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  // Directive 16: distinguish "no goals" from "query failed".
  const [error, setError] = useState<Error | null>(null);

  const fetchGoals = useCallback(async () => {
    try {
      setIsLoading(true);
      const [fetchedGoals, fetchedAccounts] = await Promise.all([
        DB.getGoals(),
        DB.getAccounts()
      ]);
      
      const now = new Date();
      const stats = await DB.getMonthlyStats(now.getFullYear(), now.getMonth());
      const surplus = Math.max(0, Math.round((stats.income - stats.expense) * 0.2));

      if (isMounted.current) {
        setGoals(fetchedGoals);
        setAccounts(fetchedAccounts);
        setSuggestedAuto(surplus);
        setError(null);
      }
    } catch (err) {
      silentFail('[useGoals] Error fetching data')(err);
      if (isMounted.current) setError(toError(err));
    } finally {
      if (isMounted.current) {
        setIsLoading(false);
      }
    }
  }, [isMounted]);

  useEffect(() => {
    fetchGoals();
  }, [fetchGoals]);

  const activeGoals = goals.filter(g => (g.saved || 0) < (g.target || 0));

  const addGoal = async (data: Partial<Goal>) => {
    await (DB.addGoal as (d: unknown) => Promise<string>)(data);
    await fetchGoals();
  };

  const updateGoal = async (id: string, data: Partial<Goal>) => {
    await DB.updateGoal(id, data);
    await fetchGoals();
  };

  const deleteGoal = async (id: string) => {
    await DB.deleteGoal(id);
    await fetchGoals();
  };

  const addToGoal = async (id: string, amount: number, accountId: string) => {
    const updatedGoal = await DB.addToGoal(id, amount, accountId);
    await fetchGoals();
    return updatedGoal;
  };

  const runAutopilot = async () => {
    if (activeGoals.length === 0) {
      toast(t('goal.noActive') || 'No active goals', 'info');
      return;
    }
    if (suggestedAuto <= 0) {
      toast(t('goal.noSurplus') || 'No surplus available', 'error');
      return;
    }

    const defaultAccount = accounts.length > 0 ? accounts[0].id : '';
    const perGoal = suggestedAuto / activeGoals.length;
    let savedCount = 0;

    for (const g of activeGoals) {
      const remaining = Math.max(0, (g.target || 0) - (g.saved || 0));
      const amount = Math.min(remaining, perGoal);
      if (amount <= 0) continue;
      
      const accId = g.accountId || defaultAccount;
      if (!accId) continue; 
      
      await DB.addToGoal(g.id, amount, accId);
      savedCount += 1;
    }

    await fetchGoals();
    return savedCount;
  };

  const bulkDeleteGoals = async () => {
    if (selectedItems.length === 0) return;
    for (const id of selectedItems) {
      await DB.deleteGoal(id);
    }
    clearSelection();
    await fetchGoals();
  };

  const getGoalForecast = useCallback(async (goalId: string) => {
    try {
      const goal = goals.find(g => g.id === goalId);
      if (!goal || !goal.target) return null;

      const txns = await DB.getGoalTransactions(goalId);
      if (txns.length < 2) return null; // Need at least 2 deposits to calculate a rate

      const firstDate = new Date(txns[0].date);
      const lastDate = new Date();
      const monthsElapsed = (lastDate.getFullYear() - firstDate.getFullYear()) * 12 + (lastDate.getMonth() - firstDate.getMonth());
      
      // Calculate average monthly saving rate
      const totalSaved = txns.reduce((sum, t) => sum + (t.amount || 0), 0);
      const rate = monthsElapsed > 0 ? totalSaved / monthsElapsed : totalSaved; // If less than a month, rate is total saved

      if (rate <= 0) return null;

      const remaining = goal.target - (goal.saved || 0);
      const monthsToGoal = remaining / rate;
      
      const estimatedDate = new Date();
      estimatedDate.setMonth(estimatedDate.getMonth() + Math.ceil(monthsToGoal));

      return {
        rate,
        monthsToGoal: Math.ceil(monthsToGoal),
        estimatedDate: estimatedDate.toISOString().slice(0, 10),
        isBehind: goal.targetDate ? estimatedDate > new Date(goal.targetDate) : false
      };
    } catch (err) {
      silentFail('[useGoals] Forecast error')(err);
      return null;
    }
  }, [goals]);

  return {
    goals,
    activeGoals,
    accounts,
    suggestedAuto,
    isLoading,
    error,
    retry: fetchGoals,
    addGoal,
    updateGoal,
    deleteGoal,
    addToGoal,
    runAutopilot,
    bulkDeleteGoals,
    getGoalForecast,
    refresh: fetchGoals
  };
}
