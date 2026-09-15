import React, { useState } from 'react';
import { useFamily } from '../hooks/useFamily';
import { useI18n } from '../../../i18n/index';
import { useFormat } from '../../../core/hooks/useFormat';
import { useAppStore } from '../../../store/appStore';
import { useShallow } from 'zustand/react/shallow';
import { toast } from '../../../toast';
import { useSettingsStore, type ChildAccount } from '../../../store/settingsStore';
import { TransactionRepository } from '@/core/db/repositories/transactions';
import { FAMILY_SHARED_CATEGORY_KEY } from '../../../core/categoryConstants';
import { EditChildModal } from './EditChildModal';
import { AllowancePayoutModal } from './AllowancePayoutModal';
import { ChildrenAccountsTab } from './ChildrenAccountsTab';
import { SharedWalletTab } from './SharedWalletTab';
import { FamilyMemberModal } from './FamilyMemberModal';

export function FamilyExpenses() {
  const { t } = useI18n();
  const { parseNum, sanitizeNameInput } = useFormat();
  
  // Tab state: 'shared' for shared wallet/expenses, 'children' for monitored kids accounts
  const [activeTab, setActiveTab] = useState<'shared' | 'children'>('shared');

  // Wave 4: Monitored Child Accounts states
  const { 
    childAccounts = [], 
    addChildAccount, 
    updateChildAccount,
    deleteChildAccount, 
    addChildTransaction, 
    payChildAllowance 
  } = useSettingsStore(
    useShallow((s) => ({
      childAccounts: s.childAccounts,
      addChildAccount: s.addChildAccount,
      updateChildAccount: s.updateChildAccount,
      deleteChildAccount: s.deleteChildAccount,
      addChildTransaction: s.addChildTransaction,
      payChildAllowance: s.payChildAllowance
    }))
  );


  // Edit Child Modal State
  const [editingChild, setEditingChild] = useState<ChildAccount | null>(null);
  const [editChildName, setEditChildName] = useState('');
  const [editChildAge, setEditChildAge] = useState('');
  const [editChildAllowance, setEditChildAllowance] = useState('');
  const [editChildPeriod, setEditChildPeriod] = useState<'daily' | 'weekly' | 'monthly'>('weekly');

  const openEditChildModal = (child: ChildAccount) => {
    setEditingChild(child);
    setEditChildName(child.name);
    setEditChildAge(String(child.age));
    setEditChildAllowance(String(child.allowance));
    setEditChildPeriod(child.allowancePeriod || 'weekly');
  };

  const handleUpdateChildAccount = () => {
    if (!editingChild) return;
    if (!editChildName.trim()) {
      toast(t('family.childNameReq') || 'الرجاء إدخال اسم الطفل!', 'warning');
      return;
    }
    const ageNum = Math.floor(parseNum(editChildAge)) || 7;
    const allowanceNum = parseNum(editChildAllowance) || 0;

    updateChildAccount(editingChild.id, editChildName.trim(), ageNum, allowanceNum, editChildPeriod);
    toast(t('family.monitored.childUpdated') || '✅ تم تحديث بيانات الطفل بنجاح! 🚀', 'success');
    setEditingChild(null);
  };


  // Allowance Payout Modal State
  const [allowanceChild, setAllowanceChild] = useState<ChildAccount | null>(null);
  const [allowanceAccountId, setAllowanceAccountId] = useState<string>('');


  const { 
    members, accounts, sharedTransactions, isLoading,
    addMember, updateMember, deleteMember, saveSharedExpense, deleteSharedExpense, bulkDelete 
  } = useFamily();

  // Edit Member Modal State
  const [editingMember, setEditingMember] = useState<{ id: string; name: string; relation: string } | null>(null);
  const [editMemberName, setEditMemberName] = useState('');
  const [editMemberRel, setEditMemberRel] = useState('');

  const openEditMemberModal = (m: { id: string; name: string; relation: string }) => {
    setEditingMember(m);
    setEditMemberName(m.name);
    setEditMemberRel(m.relation || '');
  };

  const handleUpdateMember = () => {
    if (!editingMember) return;
    if (!editMemberName.trim()) {
      toast(t('family.namePh') || 'الرجاء إدخال الاسم!', 'warning');
      return;
    }
    updateMember(editingMember.id, editMemberName.trim(), editMemberRel);
    // The expense-form chips pick the new name up from the `members` prop —
    // see the sync effect in SharedWalletTab.
    setEditingMember(null);
  };

  const {
    clearSelection,
    pendingAction,
    setPendingAction
  } = useAppStore(
    useShallow((s) => ({
      clearSelection: s.clearSelection,
      pendingAction: s.pendingAction,
      setPendingAction: s.setPendingAction
    }))
  );

  // Add Member Modal State
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberRel, setNewMemberRel] = useState('');

  React.useEffect(() => {
    if (pendingAction === 'ADD_FAMILY') {
      setActiveTab('shared');
      setShowMemberModal(true);
      setPendingAction(null);
    }
  }, [pendingAction, setPendingAction]);

  const totalSharedExpenseAmount = React.useMemo(() => {
    return sharedTransactions.reduce((sum, tx) => sum + (tx.amount || 0), 0);
  }, [sharedTransactions]);

  const totalChildrenBalance = React.useMemo(() => {
    return childAccounts.reduce((sum, c) => sum + (c.balance || 0), 0);
  }, [childAccounts]);

  const totalChildrenAllowance = React.useMemo(() => {
    return childAccounts.reduce((sum, c) => sum + (c.allowance || 0), 0);
  }, [childAccounts]);

  // Add Expense Form State
  
  // Selection array contains objects {id, name}. We initialize it with "me"

  // Calculator State







  if (isLoading) return (
    <div className="flex items-center justify-center p-20 animate-pulse text-slate-400">
      {t('misc.loading')}
    </div>
  );

  return (
    <div className="p-4 space-y-5 pb-32 animate-in fade-in duration-300 bg-[#f8f9fa] dark:bg-[#121214]">

      {/* Segmented Control Tab Selector */}
      <div className="bg-slate-200/80 dark:bg-slate-900/80 p-1.5 rounded-2xl flex gap-1.5 border border-black/5 dark:border-white/5 backdrop-blur-sm shadow-sm sticky top-0 z-20">
        <button
          type="button"
          onClick={() => {
            setActiveTab('shared');
            clearSelection();
          }}
          className={`flex-1 py-3 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 active:scale-95 ${
            activeTab === 'shared'
              ? 'bg-white dark:bg-slate-800 text-[#002b59] dark:text-amber-400 shadow-md shadow-black/5 ring-1 ring-black/5 dark:ring-white/10'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <span className="material-symbols-outlined text-lg">diversity_3</span>
          <span>{t('family.tabShared') || 'المحفظة المشتركة'}</span>
          {sharedTransactions.length > 0 && (
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
              activeTab === 'shared'
                ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
            }`}>
              {sharedTransactions.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('children');
            clearSelection();
          }}
          className={`flex-1 py-3 px-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 active:scale-95 ${
            activeTab === 'children'
              ? 'bg-white dark:bg-slate-800 text-amber-600 dark:text-amber-400 shadow-md shadow-black/5 ring-1 ring-black/5 dark:ring-white/10'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <span className="material-symbols-outlined text-lg">child_care</span>
          <span>{t('family.tabChildren') || 'حسابات الأطفال'}</span>
          {childAccounts.length > 0 && (
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
              activeTab === 'children'
                ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
            }`}>
              {childAccounts.length}
            </span>
          )}
        </button>
      </div>


      {activeTab === 'shared' ? (
        <SharedWalletTab
          members={members}
          accounts={accounts}
          sharedTransactions={sharedTransactions}
          totalSharedExpenseAmount={totalSharedExpenseAmount}
          saveSharedExpense={saveSharedExpense}
          deleteSharedExpense={deleteSharedExpense}
          bulkDelete={bulkDelete}
          onAddMember={() => setShowMemberModal(true)}
          onEditMember={openEditMemberModal}
          deleteMember={deleteMember}
        />
      ) : (
        <ChildrenAccountsTab
          childAccounts={childAccounts}
          totalChildrenBalance={totalChildrenBalance}
          totalChildrenAllowance={totalChildrenAllowance}
          accounts={accounts}
          addChildAccount={addChildAccount}
          deleteChildAccount={deleteChildAccount}
          payChildAllowance={payChildAllowance}
          addChildTransaction={addChildTransaction}
          onEditChild={openEditChildModal}
          onRequestAllowancePayout={(child, accountId) => {
            setAllowanceChild(child);
            setAllowanceAccountId(accountId);
          }}
        />
      )}

      {showMemberModal && (
        <FamilyMemberModal
          mode="add"
          name={newMemberName}
          relation={newMemberRel}
          onNameChange={value => setNewMemberName(sanitizeNameInput(value))}
          onRelationChange={setNewMemberRel}
          onClose={() => setShowMemberModal(false)}
          onSave={() => {
            if (newMemberName.trim()) {
              addMember(newMemberName.trim(), newMemberRel);
              setNewMemberName('');
              setNewMemberRel('');
              setShowMemberModal(false);
            }
          }}
        />
      )}

      {editingMember && (
        <FamilyMemberModal
          mode="edit"
          name={editMemberName}
          relation={editMemberRel}
          onNameChange={value => setEditMemberName(sanitizeNameInput(value))}
          onRelationChange={setEditMemberRel}
          onClose={() => setEditingMember(null)}
          onSave={handleUpdateMember}
        />
      )}

      {/* Edit Child Modal */}
      <EditChildModal
        child={editingChild}
        name={editChildName}
        age={editChildAge}
        allowance={editChildAllowance}
        period={editChildPeriod}
        onNameChange={setEditChildName}
        onAgeChange={setEditChildAge}
        onAllowanceChange={setEditChildAllowance}
        onPeriodChange={setEditChildPeriod}
        onSave={handleUpdateChildAccount}
        onClose={() => setEditingChild(null)}
      />

      {/* Allowance Payout Confirmation Modal */}
      <AllowancePayoutModal
        child={allowanceChild}
        accounts={accounts}
        allowanceAccountId={allowanceAccountId}
        onAccountChange={setAllowanceAccountId}
        onClose={() => setAllowanceChild(null)}
        onConfirm={async () => {
          if (!allowanceChild) return;
          const accToDeduct = allowanceAccountId || accounts[0]?.id;
          if (accToDeduct) {
            await TransactionRepository.add({
              type: 'expense',
              amount: allowanceChild.allowance,
              category: FAMILY_SHARED_CATEGORY_KEY,
              description: `مصروف: ${allowanceChild.name}`,
              accountId: accToDeduct,
              date: new Date().toISOString(),
            });
          }
          payChildAllowance(allowanceChild.id);
          toast(
            t('family.monitored.allowanceSentToast', { name: allowanceChild.name }) ||
              '✅ تم صرف المصروف وخصمه من الحساب بنجاح',
            'success'
          );
          setAllowanceChild(null);
        }}
      />
    </div>
  );
}
