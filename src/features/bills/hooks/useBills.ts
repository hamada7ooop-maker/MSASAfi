import { useState, useEffect, useCallback } from 'react';
import { db as DB } from '@/core/db/core';
import { useIsMounted } from '../../../hooks/useIsMounted';
import type { Bill, Subscription } from '../../../types';
import { toast } from '../../../toast';
import { useI18n } from '../../../i18n/index';
import { silentFail } from '../../../core/utils';

export function useBills() {
  const { t } = useI18n();
  const isMounted = useIsMounted();
  const [bills, setBills] = useState<Bill[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      if (isMounted.current) setIsLoading(true);
      const [billsData, subsData] = await Promise.all([
        DB.getBills(),
        DB.getSubscriptions()
      ]);
      if (isMounted.current) {
        setBills(billsData || []);
        setSubscriptions(subsData || []);
      }
    } catch (err) {
      silentFail('[useBills] Fetch error')(err);
    } finally {
      if (isMounted.current) {
        setIsLoading(false);
      }
    }
  }, [isMounted]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // -- Bills --
  const addBill = async (data: Partial<Bill>) => {
    await (DB.addBill as (d: unknown) => Promise<string>)(data);
    await fetchData();
    toast(t('bill.added') || 'Bill added', 'success');
  };

  const updateBill = async (id: string, data: Partial<Bill>) => {
    await DB.updateBill(id, data);
    await fetchData();
  };

  const deleteBill = async (id: string) => {
    await DB.deleteBill(id);
    await fetchData();
    toast(t('bill.deleted') || 'Bill deleted', 'success');
  };

  const markPaid = async (id: string) => {
    // Legacy marks bill as paid natively via `markBillPaid(id, accId)`
    await DB.markBillPaid(id);
    await fetchData();
    toast(t('bill.paid') || 'Marked as paid ✓', 'success');
  };

  const markUnpaid = async (id: string) => {
    const b = bills.find(x => x.id === id);
    if (!b) return;
    await DB.updateBill(id, { isPaid: false, paidDate: undefined });
    await fetchData();
  };

  // -- Subscriptions --
  const addSubscription = async (data: Partial<Subscription>) => {
    await (DB.addSubscription as (d: unknown) => Promise<string>)(data);
    await fetchData();
    toast(t('bill.subAdded') || 'Subscription added', 'success');
  };

  const updateSubscription = async (id: string, data: Partial<Subscription>) => {
    const s = subscriptions.find(x => x.id === id);
    if (!s) return;
    await DB.addSubscription({ ...s, ...data });
    await fetchData();
  };

  const deleteSubscription = async (id: string) => {
    await DB.deleteSubscription(id);
    await fetchData();
    toast(t('txn.deleted') || 'Deleted', 'success');
  };

  const paySubscription = async (id: string) => {
    await DB.paySubscription(id);
    await fetchData();
    toast(t('bill.subPaidRecorded') || 'Subscription Paid', 'success');
  };

  // -- Bulk --
  const bulkDelete = async (ids: Set<string>) => {
    if (ids.size === 0) return;
    for (const id of ids) {
      await DB.deleteBill(id);
      await DB.deleteSubscription(id);
    }
    await fetchData();
    toast(t('txn.deletedMany') || 'Deleted selected items');
  };

  // Derived groups for bills
  const today = new Date();
  const upcoming = bills.filter(b => !b.isPaid && new Date(b.dueDate) >= today)
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  const overdue = bills.filter(b => !b.isPaid && new Date(b.dueDate) < today)
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  const paid = bills.filter(b => b.isPaid);
  const totalUnpaid = [...upcoming, ...overdue].reduce((s, b) => s + (b.amount || 0), 0);

  return {
    bills, subscriptions, upcoming, overdue, paid, totalUnpaid,
    isLoading,
    addBill, updateBill, deleteBill, markPaid, markUnpaid,
    addSubscription, updateSubscription, deleteSubscription, paySubscription,
    bulkDelete,
    refresh: fetchData,
  };
}
