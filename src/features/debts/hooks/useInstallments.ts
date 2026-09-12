import { useState, useEffect, useCallback } from 'react';
import { db as DB } from '@/core/db/core';
import type { Installment, Account } from '../../../types';
import { InstallmentRepository } from '../../../core/db/repositories/installments';
import { useIsMounted } from '../../../hooks/useIsMounted';
import { silentFail } from '../../../core/utils';

export function useInstallments() {
  const isMounted = useIsMounted();
  const [installments, setInstallments] = useState<Installment[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchInstallments = useCallback(async () => {
    try {
      if (isMounted.current) setIsLoading(true);
      const [fetchedInsts, fetchedAccounts] = await Promise.all([
        DB.getInstallments(),
        DB.getAccounts()
      ]);
      if (isMounted.current) {
        setInstallments(fetchedInsts);
        setAccounts(fetchedAccounts);
      }
    } catch (err) {
      silentFail('[useInstallments] Error fetching data')(err);
    } finally {
      if (isMounted.current) {
        setIsLoading(false);
      }
    }
  }, [isMounted]);

  useEffect(() => {
    fetchInstallments();
  }, [fetchInstallments]);

  const addInstallment = async (data: Omit<Installment, 'id'>) => {
    await InstallmentRepository.add(data);
    await fetchInstallments();
  };

  const updateInstallment = async (id: string, data: Partial<Installment>) => {
    await InstallmentRepository.update(id, data);
    await fetchInstallments();
  };

  const deleteInstallment = async (id: string) => {
    await InstallmentRepository.delete(id);
    await fetchInstallments();
  };

  const payInstallment = async (id: string, accountId?: string) => {
    await InstallmentRepository.payInstallment(id, accountId);
    await fetchInstallments();
  };

  return {
    installments,
    accounts,
    isLoading,
    addInstallment,
    updateInstallment,
    deleteInstallment,
    payInstallment,
    refresh: fetchInstallments
  };
}
