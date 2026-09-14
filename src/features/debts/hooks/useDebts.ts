import { useState, useEffect, useCallback } from 'react';
import { db as DB } from '@/core/db/core';
import { silentFail } from '../../../core/utils';
import { toError } from '../../../core/hooks/useLiveQuerySafe';
import type { Debt, Account } from '../../../types';
import { useAppStore } from '../../../store/appStore';
import { useShallow } from 'zustand/react/shallow';
import { useIsMounted } from '../../../hooks/useIsMounted';

export function useDebts() {
  const isMounted = useIsMounted();
  const { selectedItems, clearSelection } = useAppStore(
    useShallow((s) => ({
      selectedItems: s.selectedItems,
      clearSelection: s.clearSelection
    }))
  );
  
  const [debts, setDebts] = useState<Debt[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPaying, setIsPaying] = useState(false);
  // Directive 16: distinguish "no debts" from "query failed".
  const [error, setError] = useState<Error | null>(null);

  const fetchDebts = useCallback(async () => {
    try {
      if (isMounted.current) setIsLoading(true);
      const [fetchedDebts, fetchedAccounts] = await Promise.all([
        DB.getDebts(),
        DB.getAccounts()
      ]);
      if (isMounted.current) {
        setDebts(fetchedDebts);
        setAccounts(fetchedAccounts);
        setError(null);
      }
    } catch (err) {
      silentFail('[useDebts] Error fetching data')(err);
      if (isMounted.current) setError(toError(err));
    } finally {
      if (isMounted.current) {
        setIsLoading(false);
      }
    }
  }, [isMounted]);

  useEffect(() => {
    fetchDebts();
  }, [fetchDebts]);

  const owedDebts = debts.filter(d => d.type === 'owed');
  const lentDebts = debts.filter(d => d.type === 'lent');

  const addDebt = async (data: Partial<Debt>) => {
    await (DB.addDebt as (d: unknown) => Promise<string>)(data);
    await fetchDebts();
  };

  const updateDebt = async (id: string, data: Partial<Debt>) => {
    await DB.updateDebt(id, data);
    await fetchDebts();
  };

  const deleteDebt = async (id: string) => {
    await DB.deleteDebt(id);
    await fetchDebts();
  };

  const payDebt = async (id: string, amount: number, accountId: string) => {
    if (isPaying) return;
    try {
      setIsPaying(true);
      await DB.payDebt(id, amount, accountId);
      await fetchDebts();
    } finally {
      setIsPaying(false);
    }
  };

  const bulkDeleteDebts = async () => {
    if (selectedItems.length === 0) return;
    for (const id of selectedItems) {
      await DB.deleteDebt(id);
    }
    clearSelection();
    await fetchDebts();
  };

  return {
    debts,
    owedDebts,
    lentDebts,
    accounts,
    isLoading,
    isPaying,
    error,
    retry: fetchDebts,
    addDebt,
    updateDebt,
    deleteDebt,
    payDebt,
    bulkDeleteDebts,
    refresh: fetchDebts
  };
}
