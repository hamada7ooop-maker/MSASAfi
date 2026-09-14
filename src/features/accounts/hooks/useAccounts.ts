import { useState, useEffect, useCallback } from 'react';
import { AccountRepository } from '@/core/db/repositories/accounts';
import { TransactionRepository } from '@/core/db/repositories/transactions';
import type { Account } from '../../../types';
import { toast } from '../../../toast';
import { useI18n } from '../../../i18n/index';
import { silentFail } from '../../../core/utils';
import { toError } from '../../../core/hooks/useLiveQuerySafe';

export function useAccounts() {
  const { t } = useI18n();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  // Directive 16: an empty list is ambiguous between "no accounts" and
  // "the query failed". Exposed so the view can render error ≠ empty.
  const [error, setError] = useState<Error | null>(null);

  const fetchAccounts = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await AccountRepository.getAll();
      setAccounts(data || []);
      setError(null);
    } catch (err) {
      silentFail('[useAccounts] Fetch error')(err);
      setError(toError(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchAccounts(); }, [fetchAccounts]);

  const addAccount = async (data: Partial<Account>) => {
    await AccountRepository.add(data as Omit<Account, 'id'>);
    await fetchAccounts();
    toast(t('account.added') || 'Account added', 'success');
  };

  const updateAccount = async (id: string, data: Partial<Account>) => {
    await AccountRepository.update(id, data);
    await fetchAccounts();
  };

  const deleteAccount = async (id: string) => {
    await AccountRepository.delete(id);
    await fetchAccounts();
    toast(t('account.deleted') || 'Account deleted', 'success');
  };

  const transferBetween = async (fromId: string, toId: string, amount: number): Promise<boolean> => {
    if (!fromId || !toId || fromId === toId || amount <= 0) return false;
    let from = accounts.find(a => a.id === fromId);
    let to = accounts.find(a => a.id === toId);
    if (!from) from = (await AccountRepository.getById(fromId)) || undefined;
    if (!to) to = (await AccountRepository.getById(toId)) || undefined;
    if (!from || !to) return false;

    if ((from.balance || 0) < amount) {
      toast(t('account.insufficientFunds') || 'Insufficient balance', 'error');
      return false;
    }

    const now = new Date().toISOString();

    // 1. Record Debit (Expense) on Source Account — Automatically deducts balance
    await TransactionRepository.add({
      type: 'expense',
      amount,
      category: 'transfer',
      description: `${t('account.transferTo') || 'تحويل إلى'}: ${to.name}`,
      accountId: fromId,
      account: from.name,
      currency: from.currency || 'SAR',
      date: now,
      status: 'cleared'
    });

    // 2. Record Credit (Income) on Target Account — Automatically adds balance
    await TransactionRepository.add({
      type: 'income',
      amount,
      category: 'transfer',
      description: `${t('account.transferFrom') || 'تحويل من'}: ${from.name}`,
      accountId: toId,
      account: to.name,
      currency: to.currency || 'SAR',
      date: now,
      status: 'cleared'
    });

    await fetchAccounts();
    toast(t('account.transferDone') || 'Transfer complete ✓', 'success');
    return true;
  };

  const active   = accounts.filter(a => !a.archived);
  const archived = accounts.filter(a => a.archived);
  const totalBalance = active.reduce((s, a) => s + (a.balance || 0), 0);

  return {
    accounts, active, archived, totalBalance,
    isLoading,
    error,
    retry: fetchAccounts,
    addAccount, updateAccount, deleteAccount, transferBetween,
    refresh: fetchAccounts,
  };
}
