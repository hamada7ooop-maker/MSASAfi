import { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, db as DB } from '@/core/db/core';
import { FAMILY_SHARED_CATEGORY_KEY } from '../../../core/categoryConstants';
import { useIsMounted } from '../../../hooks/useIsMounted';
import type { Transaction, Account } from '../../../types';
import { toast, confirmSheet } from '../../../toast';
import { useI18n } from '../../../i18n/index';

export interface FamilyMember {
  id: string;
  name: string;
  relation: string;
}

export function useFamily() {
  const { t } = useI18n();
  const isMounted = useIsMounted();
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  
  const sharedTransactions = useLiveQuery(
    async () => {
      const allTxns = await db.transactions.toArray();
      // Filter for transactions that are marked as shared or have the family_shared category, excluding drafts
      return allTxns.filter(t => !t.isDraft && (t.shared || t.category === FAMILY_SHARED_CATEGORY_KEY))
                    .sort((a, b) => new Date(b.date || b.createdAt || Date.now()).getTime() - new Date(a.date || a.createdAt || Date.now()).getTime());
    },
    [],
    [] as Transaction[]
  );

  const loadData = async () => {
    const m = (await DB.getSetting('familyMembers')) as FamilyMember[] | undefined;
    const accs = await DB.getAccounts();
    if (isMounted.current) {
      setMembers(Array.isArray(m) ? m : []);
      setAccounts(accs);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMounted]);

  const isLoading = sharedTransactions === undefined;

  const totalSharedExpenses = sharedTransactions
    ?.filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + (t.amount || 0), 0) ?? 0;

  const yourShare = sharedTransactions
    ?.filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + ((t.amount || 0) / (t.splitBy || 2)), 0) ?? 0;

  const whatTheyOweYou = totalSharedExpenses - yourShare;

  const addMember = async (name: string, relation: string) => {
    const newMembers = [...members, { id: Date.now().toString(), name, relation }];
    await DB.setSetting('familyMembers', newMembers);
    setMembers(newMembers);
    toast(t('family.memberAdded'));
  };

  const updateMember = async (id: string, name: string, relation: string) => {
    const newMembers = members.map(m => m.id === id ? { ...m, name, relation } : m);
    await DB.setSetting('familyMembers', newMembers);
    setMembers(newMembers);
    toast(t('family.memberUpdated') || 'تم تحديث بيانات العضو بنجاح');
  };

  const deleteMember = async (id: string) => {
    confirmSheet(
      t('family.removeMemberConfirm'),
      async () => {
        const newMembers = members.filter(m => m.id !== id);
        await DB.setSetting('familyMembers', newMembers);
        setMembers(newMembers);
        toast(t('family.memberRemoved'));
      },
      t('action.delete') || 'حذف',
      t('action.cancel') || 'إلغاء'
    );
  };

  const saveSharedExpense = async (
    desc: string, 
    amount: number, 
    splitMode: 'equal' | 'custom', 
    splitCount: number, 
    accountId: string, 
    icon: string, 
    selectedMembers: { id: string, name: string }[], 
    customSplits: Record<string, number>, 
    editId?: string
  ) => {
    if (accounts.length === 0) {
      toast(t('txn.noAccountsMsg'), 'error');
      return false;
    }
    if (!accountId) {
      toast(t('txn.selectAccountMsg'), 'error');
      return false;
    }

    let finalSplitBy = splitCount;
    let finalCustomSplits = null;

    if (splitMode === 'custom') {
      finalCustomSplits = customSplits;
      finalSplitBy = 1; // Handled by custom splits
    }

    const txData: Partial<Transaction> = {
      type: 'expense', 
      amount: amount, 
      category: FAMILY_SHARED_CATEGORY_KEY,
      description: desc, 
      shared: true, 
      splitBy: finalSplitBy,
      accountId: accountId, 
      icon: icon, 
      includedMembers: selectedMembers.map(m => m.name),
      customSplits: finalCustomSplits || undefined
    };

    if (editId) {
      await DB.updateTransaction(editId, txData);
      
      // Update Debts
      const existingDebts = (await DB.getDebts()).filter(d => d.transactionId === editId);
      const processedDebtIds = new Set<string>();
      
      if (selectedMembers.length > 0) {
        if (finalCustomSplits) {
          for (const [mid, amountOwed] of Object.entries(finalCustomSplits)) {
            if (amountOwed <= 0) continue;
            const member = members.find(m => m.id === mid);
            if (!member) continue;
            
            const exist = existingDebts.find(d => d.person === member.name);
            if (exist) {
              await DB.updateDebt(exist.id, { total: amountOwed, name: `${desc} (${t('family.customTag')})`, icon });
              processedDebtIds.add(exist.id);
            } else {
              await DB.addDebt({
                name: `${desc} (${t('family.customTag')})`,
                type: 'lent',
                total: amountOwed,
                paid: 0,
                person: member.name,
                icon: icon,
                dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                accountId: accountId,
                transactionId: editId,
                isDemo: false
              });
            }
          }
        } else if (finalSplitBy > 1) {
          const share = amount / finalSplitBy;
          for (const chip of selectedMembers) {
            if (chip.id === 'me') continue;
            const exist = existingDebts.find(d => d.person === chip.name);
            if (exist) {
              await DB.updateDebt(exist.id, { total: share, name: `${desc} (${t('family.sharedTag')})`, icon });
              processedDebtIds.add(exist.id);
            } else {
              await DB.addDebt({
                name: `${desc} (${t('family.sharedTag')})`,
                type: 'lent',
                total: share,
                paid: 0,
                person: chip.name,
                icon: icon,
                dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                accountId: accountId,
                transactionId: editId,
                isDemo: false
              });
            }
          }
        }
      }
      
      // Delete removed debts
      for (const d of existingDebts) {
        if (!processedDebtIds.has(d.id!)) {
          await DB.deleteDebt(d.id!);
        }
      }
      
      toast(t('family.sharedUpdated'));
    } else {
      const newTxId = await DB.addTransaction({
        ...txData,
        amount: txData.amount ?? amount,
        type: txData.type ?? 'expense',
        category: txData.category ?? FAMILY_SHARED_CATEGORY_KEY,
        date: new Date().toISOString()
      } as Omit<Transaction, 'id'>);
      toast(t('family.sharedAdded'));

      if (selectedMembers.length > 0) {
        let autoDebtsCreated = 0;
        const txId = newTxId;

        if (finalCustomSplits) {
          for (const [mid, amountOwed] of Object.entries(finalCustomSplits)) {
            if (amountOwed <= 0) continue;
            const member = members.find(m => m.id === mid);
            if (!member) continue;

            await DB.addDebt({
              name: `${desc} (${t('family.customTag')})`,
              type: 'lent',
              total: amountOwed,
              paid: 0,
              person: member.name,
              icon: icon,
              dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
              accountId: accountId,
              transactionId: txId,
              isDemo: false
            });
            autoDebtsCreated++;
          }
        } else if (finalSplitBy > 1) {
          const share = amount / finalSplitBy;
          for (const chip of selectedMembers) {
            if (chip.id === 'me') continue;
            await DB.addDebt({
              name: `${desc} (${t('family.sharedTag')})`,
              type: 'lent',
              total: share,
              paid: 0,
              person: chip.name,
              icon: icon,
              dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
              accountId: accountId,
              transactionId: txId,
              isDemo: false
            });
            autoDebtsCreated++;
          }
        }
        if (autoDebtsCreated > 0) {
          setTimeout(() => toast(t('family.debtsCreated', { n: String(autoDebtsCreated) })), 1500);
        }
      }
    }

    const win = window as Window & { syncWithWidget?: () => Promise<void> };
    if (win.syncWithWidget) await win.syncWithWidget();
    return true;
  };

  const deleteSharedExpense = async (id: string) => {
    confirmSheet(
      t('family.deleteSharedConfirm'),
      async () => {
        await DB.deleteTransaction(id);
        toast(t('txn.deleted'));
      },
      t('action.delete') || 'حذف',
      t('action.cancel') || 'إلغاء'
    );
  };

  const bulkDelete = async (ids: string[]) => {
    if (ids.length === 0) return;
    confirmSheet(
      t('family.bulkDeleteShared', { n: String(ids.length) }),
      async () => {
        for (const id of ids) {
          await DB.deleteTransaction(id);
        }
        toast(t('txn.deleted'));
      },
      t('action.delete') || 'حذف',
      t('action.cancel') || 'إلغاء'
    );
  };

  return {
    members,
    accounts,
    sharedTransactions: sharedTransactions ?? [],
    totalSharedExpenses,
    yourShare,
    whatTheyOweYou,
    isLoading,
    addMember,
    updateMember,
    deleteMember,
    saveSharedExpense,
    deleteSharedExpense,
    bulkDelete
  };
}
