import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../../core/db/core';
import type { RecurringTransaction } from '../../../types';
import { toast } from '../../../toast';
import { useI18n } from '../../../i18n/index';
import { silentFail } from '../../../core/utils';

export function useRecurring() {
  const { t } = useI18n();

  const recurringTxns = useLiveQuery(
    () => (db.recurringTransactions ? db.recurringTransactions.toArray() : Promise.resolve([])) as Promise<RecurringTransaction[]>,
    [],
    [] as RecurringTransaction[]
  );

  const isLoading = recurringTxns === undefined;

  const addRecurring = async (data: Partial<RecurringTransaction>) => {
    if (!db.recurringTransactions) return;
    const id = Date.now().toString(36);
    await db.recurringTransactions.put({ ...data, id, isActive: true } as RecurringTransaction);
    toast(t('action.saved') || 'Saved successfully', 'success');
  };

  const deleteRecurring = async (id: string) => {
    try {
      if (!db.recurringTransactions) return;
      await db.recurringTransactions.delete(id);
      toast(t('action.deleted') || 'Deleted', 'success');
    } catch (err) {
      silentFail('[useRecurring] delete error')(err);
      toast(t('common.error'), 'error');
    }
  };

  const toggleActive = async (id: string, current: boolean) => {
    if (!db.recurringTransactions) return;
    await db.recurringTransactions.update(id, { isActive: !current });
  };

  const confirmRecurring = async (rt: RecurringTransaction) => {
    try {
      if (!db.recurringTransactions) return;
      
      // 1. Create actual transaction
      const txId = `tx_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
      const txData = {
        id: txId,
        amount: rt.amount,
        type: rt.type,
        category: rt.category,
        description: `[${rt.frequency === 'daily' ? 'يومي' : rt.frequency === 'weekly' ? 'أسبوعي' : rt.frequency === 'monthly' ? 'شهري' : 'سنوي'}] ${rt.description || rt.category}`,
        date: rt.nextDate,
        createdAt: new Date().toISOString(),
        accountId: rt.accountId || undefined,
        account: rt.account || undefined,
        notes: rt.notes || '',
        tripId: rt.tripId || undefined
      };
      
      await db.transactions.put(txData);

      // 2. Update Account Balance
      const targetAccId = rt.accountId || rt.account;
      if (targetAccId) {
        const acc = await db.accounts.get(targetAccId);
        if (acc) {
          const amt = Number(rt.amount) || 0;
          acc.balance = rt.type === 'income' ? (acc.balance + amt) : (acc.balance - amt);
          await db.accounts.put(acc);
        }
      }

      // 3. Advance next date
      const next = new Date(rt.nextDate);
      if (rt.frequency === 'daily') next.setDate(next.getDate() + 1);
      else if (rt.frequency === 'weekly') next.setDate(next.getDate() + 7);
      else if (rt.frequency === 'monthly') next.setMonth(next.getMonth() + 1);
      else if (rt.frequency === 'yearly') next.setFullYear(next.getFullYear() + 1);

      await db.recurringTransactions.update(rt.id, { 
        nextDate: next.toISOString().slice(0, 10),
        lastProcessed: rt.nextDate
      });

      await db.recordAction('confirm_recurring', `Confirmed recurring transaction: ${rt.description}`, { id: rt.id });
      toast(t('rec.confirmed') || 'تمت إضافة المعاملة وتحديث الرصيد بنجاح! 🎉', 'success');
    } catch (err) {
      silentFail('[useRecurring] confirm error')(err);
      toast(t('common.error'), 'error');
    }
  };

  const skipRecurring = async (rt: RecurringTransaction) => {
    try {
      if (!db.recurringTransactions) return;

      const next = new Date(rt.nextDate);
      if (rt.frequency === 'daily') next.setDate(next.getDate() + 1);
      else if (rt.frequency === 'weekly') next.setDate(next.getDate() + 7);
      else if (rt.frequency === 'monthly') next.setMonth(next.getMonth() + 1);
      else if (rt.frequency === 'yearly') next.setFullYear(next.getFullYear() + 1);

      await db.recurringTransactions.update(rt.id, { 
        nextDate: next.toISOString().slice(0, 10)
      });

      await db.recordAction('skip_recurring', `Skipped recurring occurrence: ${rt.description}`, { id: rt.id });
      toast(t('rec.skipped') || 'تم تخطي هذه الدورة بنجاح! ⏭️', 'info');
    } catch (err) {
      silentFail('[useRecurring] skip error')(err);
      toast(t('common.error'), 'error');
    }
  };

  const postponeRecurring = async (rt: RecurringTransaction, newDate: string) => {
    try {
      if (!db.recurringTransactions) return;

      await db.recurringTransactions.update(rt.id, { 
        nextDate: newDate
      });

      await db.recordAction('postpone_recurring', `Postponed recurring to ${newDate}: ${rt.description}`, { id: rt.id });
      toast(t('rec.postponed') || 'تم تأجيل موعد المعاملة بنجاح! 📅', 'success');
    } catch (err) {
      silentFail('[useRecurring] postpone error')(err);
      toast(t('common.error'), 'error');
    }
  };

  return {
    recurringTxns: recurringTxns || [],
    isLoading,
    addRecurring,
    deleteRecurring,
    toggleActive,
    confirmRecurring,
    skipRecurring,
    postponeRecurring
  };
}
