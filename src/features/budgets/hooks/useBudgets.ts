import { useState, useEffect, useCallback } from 'react';
import { db as DB } from '@/core/db/core';
import { silentFail } from '../../../core/utils';
import { toError } from '../../../core/hooks/useLiveQuerySafe';
import type { Budget, Category } from '../../../types';

export function useBudgets() {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryBreakdown, setCategoryBreakdown] = useState<Record<string, number>>({});
  const [prevMonthBreakdown, setPrevMonthBreakdown] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  // Directive 16: distinguish "no budgets" from "query failed".
  const [error, setError] = useState<Error | null>(null);

  const fetchBudgets = useCallback(async () => {
    try {
      setIsLoading(true);
      const [fetchedBudgets, fetchedCats] = await Promise.all([
        DB.getBudgets(),
        DB.getCategories()
      ]);
      
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      
      let prevMonth = currentMonth - 1;
      let prevYear = currentYear;
      if (prevMonth < 0) {
        prevMonth = 11;
        prevYear--;
      }

      const [breakdown, prevBreakdown] = await Promise.all([
        DB.getCategoryBreakdown(currentYear, currentMonth),
        DB.getCategoryBreakdown(prevYear, prevMonth)
      ]);

      setBudgets(fetchedBudgets);
      setCategories(fetchedCats.filter(c => c.type === 'expense' || c.type === 'both'));
      setCategoryBreakdown(breakdown as Record<string, number>);
      setPrevMonthBreakdown(prevBreakdown as Record<string, number>);
      setError(null);
    } catch (err) {
      silentFail('[useBudgets] Error fetching data')(err);
      setError(toError(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBudgets();
  }, [fetchBudgets]);

  const getRolloverForBudget = (budget: Budget) => {
    if (!budget.rollover) return 0;
    const cats_arr = budget.categories && budget.categories.length > 0 ? budget.categories : [budget.category];
    const spentPrev = cats_arr.reduce((cs: number, cat: string) => cs + (prevMonthBreakdown[cat] || 0), 0);
    const surplus = (budget.limit || 0) - spentPrev;
    return surplus > 0 ? surplus : 0;
  };

  const getEffectiveLimit = (budget: Budget) => {
    return (budget.limit || 0) + getRolloverForBudget(budget);
  };

  const totalBudget = budgets.reduce((sum, b) => sum + getEffectiveLimit(b), 0);
  
  const totalSpent = budgets.reduce((sum, b) => {
    const cats_arr = b.categories && b.categories.length > 0 ? b.categories : [b.category];
    return sum + cats_arr.reduce((cs: number, cat: string) => cs + (categoryBreakdown[cat] || 0), 0);
  }, 0);

  const getSpentForBudget = (budget: Budget) => {
    const cats_arr = budget.categories && budget.categories.length > 0 ? budget.categories : [budget.category];
    return cats_arr.reduce((cs: number, cat: string) => cs + (categoryBreakdown[cat] || 0), 0);
  };

  const addBudget = async (data: Partial<Budget>) => {
    await (DB.addBudget as (d: unknown) => Promise<string>)(data);
    await fetchBudgets();
  };

  const updateBudget = async (id: string, data: Partial<Budget>) => {
    await DB.updateBudget(id, data);
    await fetchBudgets();
  };

  const deleteBudget = async (id: string) => {
    await DB.deleteBudget(id);
    await fetchBudgets();
  };

  return {
    budgets,
    categories,
    categoryBreakdown,
    totalBudget,
    totalSpent,
    isLoading,
    error,
    retry: fetchBudgets,
    getSpentForBudget,
    getRolloverForBudget,
    getEffectiveLimit,
    addBudget,
    updateBudget,
    deleteBudget,
    refresh: fetchBudgets
  };
}
