import { useState, useCallback, useEffect } from 'react';
import { db as DB } from '@/core/db/core';
import type { Investment } from '../../../types';
import { toast } from '../../../toast';
import { useI18n } from '../../../i18n/index';
import { silentFail } from '../../../core/utils';
import { toError } from '../../../core/hooks/useLiveQuerySafe';

export function useInvestments() {
  const { t } = useI18n();
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  // Directive 16: distinguish "no investments" from "query failed".
  const [error, setError] = useState<Error | null>(null);

  const fetchInvestments = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await DB.getInvestments();
      setInvestments(data || []);
      setError(null);
    } catch (err) {
      silentFail('[useInvestments] Fetch error')(err);
      setError(toError(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchInvestments(); }, [fetchInvestments]);

  const addInvestment = async (data: Partial<Investment>) => {
    await (DB.addInvestment as (d: unknown) => Promise<string>)(data);
    await fetchInvestments();
    toast(t('investment.added') || 'Investment added', 'success');
  };

  const updateInvestment = async (id: string, data: Partial<Investment>) => {
    await DB.updateInvestment(id, data);
    await fetchInvestments();
  };

  const deleteInvestment = async (id: string) => {
    await DB.deleteInvestment(id);
    await fetchInvestments();
    toast(t('action.deleted') || 'Deleted', 'success');
  };

  const deleteInvestments = async (ids: string[]) => {
    for (const id of ids) {
      await DB.deleteInvestment(id);
    }
    await fetchInvestments();
    toast(t('investment.deletedMany') || 'Investments deleted', 'success');
  };

  const totalCost = investments.reduce((sum, inv) => sum + (inv.cost || 0), 0);
  const totalValue = investments.reduce((sum, inv) => sum + (inv.value || 0), 0);
  const totalProfit = totalValue - totalCost;
  const totalProfitPercent = totalCost > 0 ? (totalProfit / totalCost) * 100 : 0;

  return {
    investments,
    totalCost,
    totalValue,
    totalProfit,
    totalProfitPercent,
    isLoading,
    error,
    retry: fetchInvestments,
    addInvestment,
    updateInvestment,
    deleteInvestment,
    deleteInvestments,
    refresh: fetchInvestments,
  };
}
