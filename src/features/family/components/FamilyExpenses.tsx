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
import type { Transaction } from '@/types';
import { ChildAccountCard } from './ChildAccountCard';
import { EditChildModal } from './EditChildModal';
import { AllowancePayoutModal } from './AllowancePayoutModal';

export function FamilyExpenses() {
  const { t } = useI18n();
  const { fmt, parseNum, sanitizeNumericInput, sanitizeIntegerInput, sanitizeNameInput } = useFormat();
  
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

  const [showAddChild, setShowAddChild] = useState(false);
  const [childName, setChildName] = useState('');
  const [childAge, setChildAge] = useState('');
  const [childAllowance, setChildAllowance] = useState('');
  const [childPeriod, setChildPeriod] = useState<'daily' | 'weekly' | 'monthly'>('weekly');

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

  const [activeChildTxModal, setActiveChildTxModal] = useState<string | null>(null);
  const [childTxDesc, setChildTxDesc] = useState('');
  const [childTxAmount, setChildTxAmount] = useState('');
  const [childTxType, setChildTxType] = useState<'income' | 'expense'>('expense');

  // Allowance Payout Modal State
  const [allowanceChild, setAllowanceChild] = useState<ChildAccount | null>(null);
  const [allowanceAccountId, setAllowanceAccountId] = useState<string>('');

  const handleCreateChildAccount = () => {
    if (!childName.trim()) {
      toast(t('family.childNameReq') || 'الرجاء إدخال اسم الطفل!', 'warning');
      return;
    }
    const ageNum = Math.floor(parseNum(childAge)) || 7;
    const allowanceNum = parseNum(childAllowance) || 0;

    addChildAccount(childName.trim(), ageNum, allowanceNum, childPeriod);
    toast(t('family.childAdded') || '✅ تم إضافة حساب الطفل بنجاح!', 'success');

    setChildName('');
    setChildAge('');
    setChildAllowance('');
    setShowAddChild(false);
  };

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
    setSelectedChips(prev => prev.map(c => c.id === editingMember.id ? { ...c, name: editMemberName.trim() } : c));
    setEditingMember(null);
  };

  const { 
    selectedItems, 
    toggleSelection, 
    clearSelection, 
    setAllSelection,
    pendingAction, 
    setPendingAction 
  } = useAppStore(
    useShallow((s) => ({
      selectedItems: s.selectedItems,
      toggleSelection: s.toggleSelection,
      clearSelection: s.clearSelection,
      setAllSelection: s.setAllSelection,
      pendingAction: s.pendingAction,
      setPendingAction: s.setPendingAction
    }))
  );
  const isSelecting = selectedItems.length > 0;

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
  const [editId, setEditId] = useState<string | undefined>();
  const [desc, setDesc] = useState('');
  const [amount, setAmount] = useState('');
  const [accountId, setAccountId] = useState('');
  const [icon, setIcon] = useState('group');
  
  // Selection array contains objects {id, name}. We initialize it with "me"
  const [selectedChips, setSelectedChips] = useState([{ id: 'me', name: t('family.me') || 'Me' }]);
  const [splitMode, setSplitMode] = useState<'equal' | 'custom'>('equal');
  const [customSplits, setCustomSplits] = useState<Record<string, number>>({});

  // Calculator State
  const [calcTotal, setCalcTotal] = useState('');
  const [calcPpl, setCalcPpl] = useState('2');

  const handleToggleChip = (memberId: string, memberName: string) => {
    if (selectedChips.find(c => c.id === memberId)) {
      setSelectedChips(selectedChips.filter(c => c.id !== memberId));
    } else {
      setSelectedChips([...selectedChips, { id: memberId, name: memberName }]);
    }
  };

  const handleCustomSplitChange = (memberId: string, value: string) => {
    const clean = sanitizeNumericInput(value);
    setCustomSplits(prev => ({ ...prev, [memberId]: parseNum(clean) || 0 }));
  };

  const handleSaveExpense = async () => {
    const numAmount = parseNum(amount);
    if (!desc.trim() || numAmount <= 0) {
      toast(t('txn.invalidAmount') || 'Invalid amount', 'error');
      return;
    }

    const success = await saveSharedExpense(
      desc.trim(),
      numAmount,
      splitMode,
      selectedChips.length || 1,
      accountId || accounts[0]?.id || '',
      icon,
      selectedChips,
      customSplits,
      editId
    );

    if (success) {
      // Reset form
      setEditId(undefined);
      setDesc('');
      setAmount('');
      setIcon('group');
      setSelectedChips([{ id: 'me', name: t('family.me') || 'Me' }]);
      setCustomSplits({});
      setSplitMode('equal');
    }
  };

  const handleEdit = (tx: Transaction) => {
    setEditId(tx.id);
    setDesc(tx.description || '');
    setAmount(tx.amount?.toString() || '');
    setAccountId(tx.accountId || accounts[0]?.id || '');
    setIcon(tx.icon || 'group');
    
    // Reconstruct chips based on includedMembers
    if (tx.includedMembers && Array.isArray(tx.includedMembers)) {
      const inc = tx.includedMembers;
      const chips = [];
      if (inc.includes(t('family.me') || 'Me')) {
        chips.push({ id: 'me', name: t('family.me') || 'Me' });
      }
      members.forEach(m => {
        if (inc.includes(m.name)) {
          chips.push({ id: m.id, name: m.name });
        }
      });
      setSelectedChips(chips);
    }
    
    if (tx.customSplits) {
      setSplitMode('custom');
      setCustomSplits(tx.customSplits);
    } else {
      setSplitMode('equal');
      setCustomSplits({});
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
    toast(t('family.readyEdit'));
  };

  const handleBulkDelete = () => {
    bulkDelete(selectedItems);
    clearSelection();
  };

  const getSplitHint = () => {
    const count = selectedChips.length;
    if (count <= 1) return t('family.splitHintDefault');
    if (count === 2 && t('family.splitArTwo')) return t('family.splitArTwo');
    return t('family.splitHintN', { n: String(count) });
  };

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
        <div className="space-y-5 animate-in fade-in duration-300">

          {/* Top Banner (Members & Summary) */}
          <div className="bg-gradient-to-br from-[#d97706] to-[#b45309] text-white p-6 rounded-[2rem] relative overflow-hidden shadow-lg shadow-amber-900/20 space-y-4">
            <div className="flex justify-between items-start gap-3">
              <div>
                <h2 className="text-2xl font-black mb-1 flex items-center gap-2">
                  <span className="material-symbols-outlined text-amber-200 text-2xl">account_balance_wallet</span>
                  {t('family.title')}
                </h2>
                <p className="text-sm opacity-80">{t('family.subtitle')}</p>
              </div>
              <div className="text-left bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/15 shrink-0">
                <span className="text-[10px] font-bold block opacity-75">{t('family.sharedLog') || 'المصاريف المشتركة'}</span>
                <span className="text-sm font-black">{fmt(totalSharedExpenseAmount)} ر.س</span>
              </div>
            </div>
            
            <div className="pt-2 border-t border-white/10">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[11px] font-black opacity-90">{t('family.includedMembers')} ({members.length + 1})</span>
              </div>
              <div className="flex gap-2 flex-wrap items-center">
                <div className="group relative flex flex-col items-center cursor-pointer">
                  <div className="w-10 h-10 rounded-full bg-white/30 text-white ring-2 ring-white/50 flex items-center justify-center text-sm font-black transition-all hover:scale-110 shadow-sm">
                    <span className="material-symbols-outlined text-sm">person</span>
                  </div>
                  <p className="text-[9px] mt-1.5 opacity-90 font-bold">{t('family.me')}</p>
                </div>

                {members.map(m => (
                  <div key={m.id} className="group relative flex flex-col items-center">
                    <div 
                      onClick={() => openEditMemberModal(m)}
                      className="w-10 h-10 rounded-full bg-white/20 text-white ring-1 ring-white/30 flex items-center justify-center text-sm font-black transition-all hover:scale-110 cursor-pointer"
                      title={t('family.editMember')}
                    >
                      {m.name[0]}
                    </div>
                    <p className="text-[9px] mt-1.5 opacity-90 font-bold max-w-[54px] truncate text-center">{m.name}</p>
                    {m.relation && <p className="text-[8px] opacity-60 leading-none mt-0.5">{t(`family.rel.${m.relation}`) || m.relation}</p>}
                    <div className="absolute -top-1.5 -right-1.5 flex gap-0.5 items-center">
                      <button 
                        onClick={(e) => { e.stopPropagation(); openEditMemberModal(m); }} 
                        className="w-4 h-4 rounded-full bg-amber-400 text-slate-900 flex items-center justify-center transition-transform shadow-md active:scale-95 hover:bg-amber-300"
                        title={t('family.editMember')}
                      >
                        <span className="material-symbols-outlined text-[10px]">edit</span>
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); deleteMember(m.id); }} 
                        className="w-4 h-4 rounded-full bg-red-500 text-white flex items-center justify-center transition-transform shadow-md active:scale-95 hover:bg-red-600"
                        title={t('action.delete') || 'Delete'}
                      >
                        <span className="material-symbols-outlined text-[10px]">close</span>
                      </button>
                    </div>
                  </div>
                ))}
                <button 
                  onClick={() => setShowMemberModal(true)} 
                  className="w-10 h-10 rounded-full border border-dashed border-white/50 flex items-center justify-center hover:bg-white/10 transition-colors active:scale-95"
                  title={t('action.add') || 'Add Member'}
                >
                  <span className="material-symbols-outlined text-lg">add</span>
                </button>
              </div>
            </div>
          </div>

      {/* Add Expense Form Card */}
      <div className="bg-white dark:bg-[#1c1f23] p-5 rounded-3xl space-y-4 shadow-sm border border-slate-100 dark:border-slate-800">
        <h3 className="font-black flex items-center gap-2 text-slate-800 dark:text-white text-lg">
          <span className="material-symbols-outlined text-[#d97706]">add_circle</span>
          {editId ? t('action.edit') : t('family.addExpense')}
        </h3>
        
        <div className="space-y-3">
          <input 
            value={desc} 
            onChange={e => setDesc(e.target.value)}
            onCompositionEnd={e => setDesc((e.target as HTMLInputElement).value)}
            onBlur={e => setDesc(e.target.value)}
            dir="auto"
            autoComplete="off"
            className="w-full bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-2xl border border-transparent focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20 dark:text-white font-bold text-sm outline-none transition-all" 
            placeholder={t('family.expenseDescPh')}
          />
          
          <div className="grid grid-cols-2 gap-3">
            <input 
              type="text" 
              inputMode="decimal"
              value={amount} 
              onChange={e => setAmount(sanitizeNumericInput(e.target.value))}
              onCompositionEnd={e => setAmount(sanitizeNumericInput((e.target as HTMLInputElement).value))}
              onBlur={e => setAmount(sanitizeNumericInput(e.target.value))}
              dir="auto"
              autoComplete="off"
              className="bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-2xl border border-transparent focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20 dark:text-white font-black text-sm outline-none transition-all" 
              placeholder={t('txn.amount')}
            />
            <select 
              value={accountId} onChange={e => setAccountId(e.target.value)}
              className="bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-2xl border border-transparent focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20 dark:text-white font-bold text-xs outline-none transition-all appearance-none"
            >
              {accounts.length === 0 && <option value="">{t('txn.selectAccountMsg')}</option>}
              {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
        </div>

        <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/50 space-y-3">
          <p className="text-xs font-black text-slate-500 dark:text-slate-400 mb-1">{t('family.includedMembers')}</p>
          
          <div className="flex gap-2 flex-wrap">
            <div 
              onClick={() => handleToggleChip('me', t('family.me') || 'Me')}
              className={`px-4 py-2 rounded-full text-xs font-black cursor-pointer transition-all flex items-center gap-1 active:scale-95 ${
                selectedChips.find(c => c.id === 'me') 
                  ? 'bg-[#002b59] text-white shadow-md' 
                  : 'bg-white dark:bg-[#121214] text-slate-500 border border-slate-200 dark:border-slate-700'
              }`}
            >
              <span className="material-symbols-outlined text-[14px]">person</span> {t('family.me')}
            </div>
            {members.map(m => {
              const isSel = selectedChips.find(c => c.id === m.id);
              return (
                <div 
                  key={m.id}
                  onClick={() => handleToggleChip(m.id, m.name)}
                  className={`px-4 py-2 rounded-full text-xs font-black cursor-pointer transition-all flex items-center gap-1 active:scale-95 ${
                    isSel
                      ? 'bg-[#002b59] text-white shadow-md' 
                      : 'bg-white dark:bg-[#121214] text-slate-500 border border-slate-200 dark:border-slate-700'
                  }`}
                >
                  {m.name}
                </div>
              );
            })}
          </div>

          {selectedChips.length > 1 && (
            <div className="mt-4 space-y-3 animate-in fade-in slide-in-from-top-2">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{t('family.splitMethod')}</p>
              <div className="flex gap-2">
                <button 
                  onClick={() => setSplitMode('equal')}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all ${
                    splitMode === 'equal' ? 'bg-[#002b59] text-white shadow-md' : 'bg-white dark:bg-[#121214] text-slate-500 border border-slate-200 dark:border-slate-700'
                  }`}
                >
                  {t('family.splitEqual')}
                </button>
                <button 
                  onClick={() => setSplitMode('custom')}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-black transition-all ${
                    splitMode === 'custom' ? 'bg-[#002b59] text-white shadow-md' : 'bg-white dark:bg-[#121214] text-slate-500 border border-slate-200 dark:border-slate-700'
                  }`}
                >
                  {t('family.splitCustom')}
                </button>
              </div>

              {splitMode === 'custom' && (
                <div className="space-y-2 mt-3 p-3 bg-white dark:bg-[#121214] rounded-xl border border-slate-100 dark:border-slate-800">
                  {selectedChips.map(c => (
                    <div key={c.id} className="flex items-center justify-between gap-3">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex-1 truncate">{c.name}</span>
                      <input 
                        type="text" 
                        inputMode="decimal"
                        dir="ltr"
                        autoComplete="off"
                        value={customSplits[c.id] || ''}
                        onChange={e => handleCustomSplitChange(c.id, sanitizeNumericInput(e.target.value))}
                        onCompositionEnd={e => handleCustomSplitChange(c.id, sanitizeNumericInput((e.target as HTMLInputElement).value))}
                        onBlur={e => handleCustomSplitChange(c.id, sanitizeNumericInput(e.target.value))}
                        className="w-24 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-right text-xs font-black outline-none focus:border-amber-500" 
                        placeholder={t('txn.amount')}
                      />
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-2 bg-blue-50 dark:bg-blue-900/20 p-3 rounded-xl border border-blue-100 dark:border-blue-800/30">
                <p className="text-[10px] text-blue-700 dark:text-blue-300 font-bold flex items-start gap-1.5 leading-snug">
                  <span className="material-symbols-outlined text-[14px]">info</span>
                  {t('family.splitNotice')}
                </p>
              </div>
            </div>
          )}
          
          <p className="text-[10px] text-slate-400 font-bold mt-2">{getSplitHint()}</p>
        </div>

        <div className="pt-2">
          <label className="text-[10px] font-bold text-slate-500 uppercase px-1 mb-2 block">{t('category.icon')}</label>
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {['group', 'shopping_cart', 'restaurant', 'home', 'directions_car', 'flight', 'school', 'medical_services', 'celebration', 'pets'].map(ic => (
              <button 
                key={ic}
                onClick={() => setIcon(ic)}
                className={`w-12 h-12 shrink-0 rounded-2xl flex items-center justify-center transition-all ${
                  icon === ic 
                    ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 shadow-sm border-2 border-amber-400' 
                    : 'bg-slate-50 dark:bg-slate-800/50 text-slate-500 border-2 border-transparent'
                }`}
              >
                <span className="material-symbols-outlined">{ic}</span>
              </button>
            ))}
          </div>
        </div>

        <button 
          onClick={handleSaveExpense}
          className="w-full bg-[#d97706] hover:bg-amber-600 text-white py-3.5 rounded-2xl font-black text-sm active:scale-95 shadow-lg shadow-amber-600/20 transition-all flex items-center justify-center gap-2"
        >
          <span className="material-symbols-outlined text-lg">{editId ? 'save' : 'add'}</span>
          {t('action.save')}
        </button>
      </div>

      {/* Shared Log */}
      <div>
        <div className="flex justify-between items-center mb-4 px-1">
          <h3 className="font-black text-lg text-slate-800 dark:text-white">{t('family.sharedLog')}</h3>
          {isSelecting && (
            <div className="flex gap-2">
              <button 
                onClick={() => setAllSelection(sharedTransactions.map(tx => tx.id!))}
                className="text-[#d97706] text-xs font-black flex items-center gap-1 active:scale-95"
              >
                <span className="material-symbols-outlined text-sm">done_all</span>{t('txn.all')}
              </button>
              <button 
                onClick={handleBulkDelete}
                className="bg-red-500 text-white px-3 py-1.5 rounded-xl text-[10px] font-black flex items-center gap-1 shadow-md active:scale-95"
              >
                <span className="material-symbols-outlined text-sm">delete</span>{t('action.delete')}
              </button>
              <button 
                onClick={clearSelection}
                className="bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-3 py-1.5 rounded-xl text-[10px] font-black active:scale-95"
              >
                {t('action.cancel')}
              </button>
            </div>
          )}
        </div>

        {isSelecting && (
          <p className="mx-1 mb-3 text-xs font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 p-3 rounded-xl flex items-center gap-2 animate-pulse border border-amber-200/50 dark:border-amber-800/30">
            <span className="material-symbols-outlined text-base">info</span> 
            {t('family.bulkSelected', { n: String(selectedItems.length) })} 
            ({fmt(sharedTransactions.filter(tx => selectedItems.includes(tx.id!)).reduce((s, tx) => s + (tx.amount || 0), 0))})
          </p>
        )}

        <div className="space-y-3">
          {sharedTransactions.length === 0 ? (
            <div className="bg-white dark:bg-[#1c1f23] rounded-3xl p-10 text-center border border-slate-100 dark:border-slate-800 shadow-sm">
              <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="material-symbols-outlined text-5xl text-slate-300 dark:text-slate-600">group</span>
              </div>
              <h4 className="font-black text-slate-700 dark:text-slate-200 mb-1">{t('family.noShared')}</h4>
              <p className="text-xs font-bold text-slate-400 leading-relaxed max-w-[250px] mx-auto">
                {t('family.noSharedSub')}
              </p>
            </div>
          ) : (
            sharedTransactions.map(tx => {
              const share = (tx.splitBy || 1) > 1 ? ` (${fmt((tx.amount || 0) / (tx.splitBy || 1))} ${t('family.perPerson')})` : '';
              const isSelected = selectedItems.includes(tx.id!);
              return (
                <div key={tx.id} className="flex items-center gap-2">
                  {(isSelecting || isSelected) && (
                    <div 
                      onClick={() => toggleSelection(tx.id!)}
                      className="w-10 flex items-center justify-center cursor-pointer shrink-0 animate-in fade-in slide-in-from-left-2"
                    >
                      <span className={`material-symbols-outlined text-2xl transition-colors ${isSelected ? 'text-[#d97706] font-variation-fill' : 'text-slate-300 dark:text-slate-600'}`}>
                        {isSelected ? 'check_circle' : 'radio_button_unchecked'}
                      </span>
                    </div>
                  )}
                  
                  <div 
                    onClick={() => { if (isSelecting) toggleSelection(tx.id!); }}
                    className={`flex-1 bg-white dark:bg-[#1c1f23] rounded-2xl p-4 flex items-center justify-between transition-all ${
                      isSelected ? 'border border-[#d97706] ring-2 ring-[#d97706]/10' : 'border border-slate-100 dark:border-slate-800 shadow-sm'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-amber-50 dark:bg-amber-900/20 rounded-xl flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-[#d97706] text-xl font-variation-fill">{tx.icon || 'group'}</span>
                      </div>
                      <div className="min-w-0">
                        <p className="font-black text-sm text-slate-800 dark:text-white truncate">{tx.description}</p>
                        <p className="text-[10px] text-slate-500 font-bold mt-0.5 truncate">
                          {new Intl.DateTimeFormat(t('lang') === 'ar' ? 'ar-SA' : t('lang') === 'fa' ? 'fa-IR' : 'en-US', { dateStyle: 'medium' }).format(new Date(tx.date || tx.createdAt || Date.now()))}
                          {share}
                        </p>
                        {tx.includedMembers && tx.includedMembers.length > 0 && (
                          <p className="text-[9px] text-slate-400 font-bold mt-1 truncate flex items-center gap-1">
                            <span className="material-symbols-outlined text-[10px]">groups</span> 
                            {tx.includedMembers.join(', ')}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <p className="font-black text-sm text-[#d97706]">{fmt(tx.amount || 0)}</p>
                      <div className="flex items-center gap-1">
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleEdit(tx); }}
                          className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-600 flex items-center justify-center active:scale-90 transition-transform"
                        >
                          <span className="material-symbols-outlined text-[16px]">edit</span>
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); deleteSharedExpense(tx.id!); }}
                          className="w-8 h-8 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-500 flex items-center justify-center active:scale-90 transition-transform"
                        >
                          <span className="material-symbols-outlined text-[16px]">close</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Split Calculator */}
      <div className="bg-white dark:bg-[#1c1f23] p-5 rounded-3xl space-y-4 shadow-sm border border-slate-100 dark:border-slate-800">
        <h3 className="font-black flex items-center gap-2 text-slate-800 dark:text-white">
          <span className="material-symbols-outlined text-[#d97706]">calculate</span>
          {t('family.splitCalc')}
        </h3>
        
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase px-1 mb-1.5 block">{t('family.calcTotal')}</label>
            <input 
              type="text" 
              inputMode="decimal"
              value={calcTotal} 
              onChange={e => setCalcTotal(sanitizeNumericInput(e.target.value))}
              onCompositionEnd={e => setCalcTotal(sanitizeNumericInput((e.target as HTMLInputElement).value))}
              onBlur={e => setCalcTotal(sanitizeNumericInput(e.target.value))}
              dir="auto"
              autoComplete="off"
              className="w-full bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-transparent focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20 dark:text-white font-black text-sm outline-none transition-all" 
              placeholder="0.00"
            />
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase px-1 mb-1.5 block">{t('family.calcPeople')}</label>
            <input 
              type="text" 
              inputMode="numeric"
              value={calcPpl} 
              onChange={e => setCalcPpl(sanitizeIntegerInput(e.target.value))}
              onCompositionEnd={e => setCalcPpl(sanitizeIntegerInput((e.target as HTMLInputElement).value))}
              onBlur={e => setCalcPpl(sanitizeIntegerInput(e.target.value))}
              dir="auto"
              autoComplete="off"
              className="w-full bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-transparent focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20 dark:text-white font-black text-sm outline-none transition-all" 
            />
          </div>
        </div>

        {parseNum(calcTotal) > 0 && Math.floor(parseNum(calcPpl)) > 1 && (
          <div className="text-center py-4 bg-amber-50 dark:bg-amber-900/20 rounded-2xl border border-amber-100 dark:border-amber-800/30 animate-in zoom-in-95">
            <p className="text-[10px] font-bold text-amber-700 dark:text-amber-500 uppercase tracking-widest mb-1">{t('family.perPerson')}</p>
            <p className="text-3xl font-black text-[#d97706]">
              {fmt(parseNum(calcTotal) / Math.floor(parseNum(calcPpl)))}
            </p>
          </div>
        )}
      </div>
        </div>
      ) : (
        <div className="space-y-5 animate-in fade-in duration-300">
      {/* 3D Monitored Child Accounts & Pocket Money Section */}
      <div className="relative group overflow-hidden p-6 rounded-[2.5rem] bg-gradient-to-br from-amber-500/10 to-orange-600/10 dark:from-amber-950/20 dark:to-orange-950/20 border border-amber-500/20 dark:border-amber-500/10 shadow-2xl backdrop-blur-md space-y-6">
        <div className="absolute -right-8 -top-8 w-32 h-32 bg-amber-500/15 rounded-full blur-2xl group-hover:scale-125 transition-transform duration-700"></div>
        <div className="absolute -left-8 -bottom-8 w-32 h-32 bg-orange-500/15 rounded-full blur-2xl group-hover:scale-125 transition-transform duration-700"></div>

        <div className="flex justify-between items-center relative z-10">
          <div className="space-y-0.5">
            <h3 className="text-sm font-black text-[#002b59] dark:text-amber-100 flex items-center gap-1.5 font-premium">
              <span className="material-symbols-outlined text-amber-500 text-lg animate-bounce">wallet</span>
              {t('family.monitored.title')}
            </h3>
            <p className="text-[10px] text-slate-400 font-bold">
              {t('family.monitored.subtitle')}
            </p>
          </div>
          
          <button 
            onClick={() => setShowAddChild(!showAddChild)}
            className="px-4 py-2 rounded-xl bg-amber-600 text-white text-[10px] font-black uppercase tracking-widest shadow-md shadow-amber-600/20 active:scale-95 transition-all"
          >
            {showAddChild ? t('common.close') : t('family.monitored.addChild')}
          </button>
        </div>

        
        {/* Child Accounts Overview Cards */}
        <div className="grid grid-cols-3 gap-2.5 relative z-10">
          <div className="bg-white/70 dark:bg-slate-900/60 p-3 rounded-2xl border border-white/30 dark:border-white/5 shadow-sm text-center">
            <span className="text-[9px] font-black text-slate-400 block mb-0.5">{t('family.monitored.walletBalance') || 'أرصدة الأطفال'}</span>
            <span className="text-xs sm:text-sm font-black text-amber-600 dark:text-amber-400 truncate block">
              {fmt(totalChildrenBalance)} ر.س
            </span>
          </div>
          <div className="bg-white/70 dark:bg-slate-900/60 p-3 rounded-2xl border border-white/30 dark:border-white/5 shadow-sm text-center">
            <span className="text-[9px] font-black text-slate-400 block mb-0.5">{t('family.monitored.allowanceAmount') || 'المصروف الدوري'}</span>
            <span className="text-xs sm:text-sm font-black text-emerald-600 dark:text-emerald-400 truncate block">
              {fmt(totalChildrenAllowance)} ر.س
            </span>
          </div>
          <div className="bg-white/70 dark:bg-slate-900/60 p-3 rounded-2xl border border-white/30 dark:border-white/5 shadow-sm text-center">
            <span className="text-[9px] font-black text-slate-400 block mb-0.5">{t('family.tabChildren') || 'الحسابات'}</span>
            <span className="text-xs sm:text-sm font-black text-indigo-600 dark:text-indigo-400 block">
              {childAccounts.length}
            </span>
          </div>
        </div>

        {/* Child Accounts Grid */}
        {childAccounts.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 relative z-10">
            {childAccounts.map((child: ChildAccount) => (
              <ChildAccountCard
                key={child.id}
                child={child}
                onPayAllowance={(c) => {
                  if (c.allowance <= 0) {
                    toast(t('family.monitored.noAllowanceConfigured') || 'المصروف محدد بـ 0', 'warning');
                    return;
                  }
                  if (accounts.length === 0) {
                    payChildAllowance(c.id);
                    toast(t('family.monitored.allowanceSentToast', { name: c.name }), 'success');
                  } else {
                    setAllowanceChild(c);
                    setAllowanceAccountId(accounts[0].id);
                  }
                }}
                onEditChild={openEditChildModal}
                onDeleteChild={(id) => {
                  deleteChildAccount(id);
                  toast(t('family.monitored.accountDeletedToast') || 'تم حذف حساب الطفل', 'error');
                }}
                isTxDrawerOpen={activeChildTxModal === child.id}
                onToggleTxDrawer={() => setActiveChildTxModal(activeChildTxModal === child.id ? null : child.id)}
                txDesc={childTxDesc}
                onTxDescChange={setChildTxDesc}
                txAmount={childTxAmount}
                onTxAmountChange={setChildTxAmount}
                txType={childTxType}
                onTxTypeChange={setChildTxType}
                onAddTransaction={() => {
                  const amountNum = parseNum(childTxAmount) || 0;
                  if (!childTxDesc.trim() || amountNum <= 0) {
                    toast(t('family.monitored.invalidDetailsToast'), 'warning');
                    return;
                  }
                  addChildTransaction(child.id, childTxDesc.trim(), amountNum, childTxType);
                  toast(t('family.monitored.txAddedToast'), 'success');
                  setChildTxDesc('');
                  setChildTxAmount('');
                  setActiveChildTxModal(null);
                }}
              />
            ))}
          </div>
        ) : (
          <div className="py-8 text-center bg-white/40 dark:bg-slate-900/20 rounded-3xl border border-dashed border-slate-200 dark:border-white/5 relative z-10">
            <span className="material-symbols-outlined text-3xl text-slate-400 mb-2 block">folder_open</span>
            <p className="text-xs font-bold text-slate-500">{t('family.monitored.noAccountsActive')}</p>
          </div>
        )}

        {/* Add Child Form Accordion */}
        {showAddChild && (
          <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5 space-y-4 animate-in slide-in-from-top-4 duration-300 relative z-10 shadow-lg">
            <h4 className="text-xs font-black text-slate-700 dark:text-slate-200 flex items-center gap-1">
              <span className="material-symbols-outlined text-amber-500 text-sm">person_add</span>
              {t('family.monitored.createNewAccount')}
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">{t('family.monitored.kidName')}</label>
                <input 
                  type="text" 
                  value={childName}
                  onChange={e => setChildName(sanitizeNameInput(e.target.value))}
                  onCompositionEnd={e => setChildName(sanitizeNameInput((e.target as HTMLInputElement).value))}
                  onBlur={e => setChildName(sanitizeNameInput(e.target.value))}
                  dir="auto"
                  autoComplete="off"
                  placeholder={t('family.monitored.kidNamePlaceholder')}
                  className="w-full bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 text-xs font-bold border-none outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">{t('family.monitored.kidAge')}</label>
                <input 
                  type="text" 
                  inputMode="numeric"
                  value={childAge}
                  onChange={e => setChildAge(sanitizeIntegerInput(e.target.value))}
                  onCompositionEnd={e => setChildAge(sanitizeIntegerInput((e.target as HTMLInputElement).value))}
                  onBlur={e => setChildAge(sanitizeIntegerInput(e.target.value))}
                  dir="auto"
                  autoComplete="off"
                  placeholder="8"
                  className="w-full bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 text-xs font-bold border-none outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">{t('family.monitored.allowanceAmount')}</label>
                <input 
                  type="text" 
                  inputMode="decimal"
                  value={childAllowance}
                  onChange={e => setChildAllowance(sanitizeNumericInput(e.target.value))}
                  onCompositionEnd={e => setChildAllowance(sanitizeNumericInput((e.target as HTMLInputElement).value))}
                  onBlur={e => setChildAllowance(sanitizeNumericInput(e.target.value))}
                  dir="auto"
                  autoComplete="off"
                  placeholder="50"
                  className="w-full bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 text-xs font-bold border-none outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">{t('family.monitored.allowancePeriod')}</label>
                <select 
                  value={childPeriod}
                  onChange={e => setChildPeriod(e.target.value as 'daily' | 'weekly' | 'monthly')}
                  className="w-full bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 text-xs font-bold border-none outline-none focus:ring-1 focus:ring-amber-500 appearance-none"
                >
                  <option value="daily">{t('family.monitored.periodDaily')}</option>
                  <option value="weekly">{t('family.monitored.periodWeekly')}</option>
                  <option value="monthly">{t('family.monitored.periodMonthly')}</option>
                </select>
              </div>
            </div>

            <button 
              type="button"
              onClick={handleCreateChildAccount}
              className="w-full py-3.5 rounded-xl bg-amber-600 text-white font-black text-xs shadow-md shadow-amber-600/20 active:scale-95 transition-all"
            >
              {t('family.monitored.createBtn')}
            </button>
          </div>
        )}
      </div>
        </div>
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
