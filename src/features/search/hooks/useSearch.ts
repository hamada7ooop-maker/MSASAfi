import { useState, useEffect, useRef, useCallback } from 'react';
import { TransactionRepository } from '../../../core/db/repositories/transactions';
import { db as DB } from '@/core/db/core';
import { silentFail } from '../../../core/utils';
import { toError } from '../../../core/hooks/useLiveQuerySafe';
import type { Transaction, Account, Category } from '../../../types';

export function useSearch(query: string) {
  const [results, setResults] = useState<{
    transactions: Transaction[];
    accounts: Account[];
    categories: Category[];
  }>({
    transactions: [],
    accounts: [],
    categories: []
  });
  const [isLoading, setIsLoading] = useState(false);
  // Directive 16: a failed search must read as "search failed", not as the
  // "no results" state — they demand different user actions.
  const [error, setError] = useState<Error | null>(null);
  // Bumped by retry() to re-run the search effect for the same query.
  const [retryToken, setRetryToken] = useState(0);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    const q = query.toLowerCase().trim();
    if (!q) {
      setResults({ transactions: [], accounts: [], categories: [] });
      setError(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const timer = setTimeout(async () => {
      try {
        // Search Transactions (capped to 500 candidate pool for performance)
        const allTxns = await TransactionRepository.getAll(500);
        const filteredTxns = allTxns.filter((t: Transaction) => 
          (t.description || '').toLowerCase().includes(q) ||
          (t.notes || '').toLowerCase().includes(q) ||
          (t.category || '').toLowerCase().includes(q) ||
          (t.account || '').toLowerCase().includes(q) ||
          t.amount.toString().includes(q)
        ).slice(0, 50);

        // Search Accounts
        const allAccs = await DB.getAccounts();
        const filteredAccs = allAccs.filter((a: Account) => 
          a.name.toLowerCase().includes(q) || 
          a.type.toLowerCase().includes(q)
        );

        // Search Categories
        const allCats = await DB.getCategories();
        const filteredCats = allCats.filter((c: Category) => 
          (c.name || '').toLowerCase().includes(q) ||
          (c.nameEn || '').toLowerCase().includes(q)
        );

        if (isMounted.current) {
          setResults({
            transactions: filteredTxns,
            accounts: filteredAccs,
            categories: filteredCats
          });
          setError(null);
        }
      } catch (err) {
        silentFail('[Search] Error in useSearch')(err);
        if (isMounted.current) {
          setError(toError(err));
        }
      } finally {
        if (isMounted.current) {
          setIsLoading(false);
        }
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, retryToken]);

  /** Re-runs the search for the current query (Directive 16 retry). */
  const retry = useCallback(() => setRetryToken(t => t + 1), []);

  return { results, isLoading, error, retry };
}
