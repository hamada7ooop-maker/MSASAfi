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

      {/* Add Member Modal */}
      {showMemberModal && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowMemberModal(false)} />
          <div className="relative w-full sm:max-w-sm bg-white dark:bg-[#1e2124] rounded-t-[2rem] sm:rounded-[2rem] p-6 shadow-2xl animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-8">
            <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto mb-6 sm:hidden" />
            
            <h3 className="text-xl font-black text-slate-800 dark:text-white mb-6 text-center">
              {t('family.memberFormTitle')}
            </h3>
            
            <div className="space-y-4">
              <input 
                type="text" 
                value={newMemberName} 
                onChange={e => setNewMemberName(sanitizeNameInput(e.target.value))}
                onCompositionEnd={e => setNewMemberName(sanitizeNameInput((e.target as HTMLInputElement).value))}
                onBlur={e => setNewMemberName(sanitizeNameInput(e.target.value))}
                dir="auto"
                autoComplete="off"
                placeholder={t('family.namePh')} 
                className="w-full bg-slate-50 dark:bg-black/20 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none text-sm font-bold dark:text-white transition-all"
              />
              
              <select 
                value={newMemberRel} onChange={e => setNewMemberRel(e.target.value)}
                className="w-full bg-slate-50 dark:bg-black/20 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none text-sm font-bold dark:text-white transition-all appearance-none"
              >
                <option value="">{t('family.relation')}</option>
                <option value="wife">{t('family.rel.wife')}</option>
                <option value="husband">{t('family.rel.husband')}</option>
                <option value="son">{t('family.rel.son')}</option>
                <option value="daughter">{t('family.rel.daughter')}</option>
                <option value="father">{t('family.rel.father')}</option>
                <option value="mother">{t('family.rel.mother')}</option>
                <option value="friend">{t('family.rel.friend')}</option>
                <option value="other">{t('family.rel.other')}</option>
              </select>

              <div className="flex gap-3 pt-2">
                <button 
                  onClick={() => setShowMemberModal(false)}
                  className="flex-1 py-3.5 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-black text-sm active:scale-95 transition-all"
                >
                  {t('action.cancel')}
                </button>
                <button 
                  onClick={() => {
                    if (newMemberName.trim()) {
                      addMember(newMemberName.trim(), newMemberRel);
                      setNewMemberName('');
                      setNewMemberRel('');
                      setShowMemberModal(false);
                    }
                  }}
                  className="flex-1 py-3.5 rounded-2xl bg-[#002b59] text-white font-black text-sm shadow-lg shadow-blue-900/20 active:scale-95 transition-all"
                >
                  {t('action.save')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Member Modal */}
      {editingMember && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setEditingMember(null)} />
          <div className="relative w-full sm:max-w-sm bg-white dark:bg-[#1e2124] rounded-t-[2rem] sm:rounded-[2rem] p-6 shadow-2xl animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-8">
            <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto mb-6 sm:hidden" />
            
            <h3 className="text-xl font-black text-slate-800 dark:text-white mb-6 text-center">
              {t('family.editMember')}
            </h3>
            
            <div className="space-y-4">
              <input 
                type="text" 
                value={editMemberName} 
                onChange={e => setEditMemberName(sanitizeNameInput(e.target.value))}
                onCompositionEnd={e => setEditMemberName(sanitizeNameInput((e.target as HTMLInputElement).value))}
                onBlur={e => setEditMemberName(sanitizeNameInput(e.target.value))}
                dir="auto"
                autoComplete="off"
                placeholder={t('family.namePh')} 
                className="w-full bg-slate-50 dark:bg-black/20 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none text-sm font-bold dark:text-white transition-all"
              />
              
              <select 
                value={editMemberRel} onChange={e => setEditMemberRel(e.target.value)}
                className="w-full bg-slate-50 dark:bg-black/20 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none text-sm font-bold dark:text-white transition-all appearance-none"
              >
                <option value="">{t('family.relation')}</option>
                <option value="wife">{t('family.rel.wife')}</option>
                <option value="husband">{t('family.rel.husband')}</option>
                <option value="son">{t('family.rel.son')}</option>
                <option value="daughter">{t('family.rel.daughter')}</option>
                <option value="father">{t('family.rel.father')}</option>
                <option value="mother">{t('family.rel.mother')}</option>
                <option value="friend">{t('family.rel.friend')}</option>
                <option value="other">{t('family.rel.other')}</option>
              </select>

              <div className="flex gap-3 pt-2">
                <button 
                  type="button"
                  onClick={() => setEditingMember(null)}
                  className="flex-1 py-3.5 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-black text-sm active:scale-95 transition-all"
                >
                  {t('action.cancel')}
                </button>
                <button 
                  type="button"
                  onClick={handleUpdateMember}
                  className="flex-1 py-3.5 rounded-2xl bg-amber-600 text-white font-black text-sm shadow-lg shadow-amber-600/30 active:scale-95 transition-all"
                >
                  {t('action.save')}
                </button>
              </div>
            </div>
          </div>
        </div>
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
