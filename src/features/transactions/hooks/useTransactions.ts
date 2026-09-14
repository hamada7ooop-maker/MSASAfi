import { useState, useEffect, useCallback } from 'react';
import { TransactionRepository } from '../../../core/db/repositories/transactions';
import { useAppStore } from '../../../store/appStore';
import { useShallow } from 'zustand/react/shallow';
import { useIsMounted } from '../../../hooks/useIsMounted';
import { silentFail } from '../../../core/utils';
import { toError } from '../../../core/hooks/useLiveQuerySafe';
import type { Transaction } from '../../../types';

const TXN_PER_PAGE = 30;

/**
 * useTransactions Hook - Handles searching, filtering, and pagination for transactions.
 */
export function useTransactions() {
  const isMounted = useIsMounted();
  const { txnQuery, txnFilter, txnPage, setTxnPage } = useAppStore(
    useShallow((s) => ({
      txnQuery: s.txnQuery,
      txnFilter: s.txnFilter,
      txnPage: s.txnPage,
      setTxnPage: s.setTxnPage
    }))
  );
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  // Directive 16: distinguish "no transactions yet" from "query failed".
  const [error, setError] = useState<Error | null>(null);

  const fetchTransactions = useCallback(async () => {
    try {
      setIsLoading(true);
      const activeQuery = txnQuery.toLowerCase().trim();
      const activeFilter = txnFilter;
      
      // Calculate total visible limit
      const limit = (txnPage + 1) * TXN_PER_PAGE;

      let results: Transaction[] = [];
      let totalFiltered = 0;

      if (activeFilter === 'ALL' && !activeQuery) {
        // Optimized path for default view
        results = await TransactionRepository.getAll(limit);
        totalFiltered = await TransactionRepository.getTransactionsCount();
      } else {
        // Fetch all and filter in memory (matching legacy behavior for now)
        // Optimization: In a real production app, this would be DB-level search
        const all = await TransactionRepository.getAll();
        const filtered = all.filter(t => {
          let matchesFilter = true;
          if (activeFilter !== 'ALL') {
            if (activeFilter === 'INCOME') matchesFilter = t.type === 'income';
            else if (activeFilter === 'EXPENSE') matchesFilter = t.type === 'expense';
            else matchesFilter = t.category === activeFilter;
          }

          let matchesQuery = true;
          if (activeQuery) {
             const desc = (t.description || t.category || '').toLowerCase();
             const notes = (t.notes || '').toLowerCase();
             matchesQuery = desc.includes(activeQuery) || 
                            (t.category || '').toLowerCase().includes(activeQuery) ||
                            notes.includes(activeQuery);
          }
          return matchesFilter && matchesQuery;
        });

        totalFiltered = filtered.length;
        results = filtered.slice(0, limit);
      }

      if (isMounted.current) {
        setTransactions(results);
        setTotalCount(totalFiltered);
        setHasMore(totalFiltered > results.length);
        setError(null);
        setIsLoading(false);
      }
    } catch (err) {
      silentFail('[useTransactions] Fetch error')(err);
      if (isMounted.current) {
        setError(toError(err));
        setIsLoading(false);
      }
    }
  }, [txnQuery, txnFilter, txnPage, isMounted]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const loadMore = () => {
    if (hasMore && !isLoading) {
      setTxnPage(txnPage + 1);
    }
  };

  const refresh = () => fetchTransactions();

  const duplicateTransaction = async (id: string) => {
    await TransactionRepository.duplicate(id);
    refresh();
  };

  const getAllFilteredIds = useCallback(async (): Promise<string[]> => {
    try {
      const activeQuery = txnQuery.toLowerCase().trim();
      const activeFilter = txnFilter;

      if (activeFilter === 'ALL' && !activeQuery) {
        const all = await TransactionRepository.getAll();
        return all.map(t => t.id);
      } else {
        const all = await TransactionRepository.getAll();
        const filtered = all.filter(t => {
          let matchesFilter = true;
          if (activeFilter !== 'ALL') {
            if (activeFilter === 'INCOME') matchesFilter = t.type === 'income';
            else if (activeFilter === 'EXPENSE') matchesFilter = t.type === 'expense';
            else matchesFilter = t.category === activeFilter;
          }

          let matchesQuery = true;
          if (activeQuery) {
             const desc = (t.description || t.category || '').toLowerCase();
             const notes = (t.notes || '').toLowerCase();
             matchesQuery = desc.includes(activeQuery) || 
                            (t.category || '').toLowerCase().includes(activeQuery) ||
                            notes.includes(activeQuery);
          }
          return matchesFilter && matchesQuery;
        });
        return filtered.map(t => t.id);
      }
    } catch (err) {
      silentFail('[useTransactions] getAllFilteredIds error')(err);
      return [];
    }
  }, [txnQuery, txnFilter]);

  return {
    transactions,
    isLoading,
    error,
    retry: refresh,
    hasMore,
    totalCount,
    loadMore,
    refresh,
    duplicateTransaction,
    getAllFilteredIds
  };
}
