import React, { useState } from 'react';
import { useI18n } from '../../../i18n/index';
import { useFormat } from '../../../core/hooks/useFormat';
import { toast } from '../../../toast';
import type { Account } from '@/types';
import type { ChildAccount } from '../../../store/settingsStore';
import { ChildAccountCard } from './ChildAccountCard';

export interface ChildrenAccountsTabProps {
  /** Child accounts, straight from the settings store. */
  childAccounts: ChildAccount[];
  /** Sum of every child balance. Passed in rather than recomputed so the
   *  parent stays the single source of truth for the figures it displays. */
  totalChildrenBalance: number;
  /** Sum of every configured allowance — deliberately separate from the
   *  balance total: they are different numbers shown side by side. */
  totalChildrenAllowance: number;
  /** Funding accounts. An empty list means allowances pay out immediately
   *  instead of opening the source-account picker. */
  accounts: Account[];
  addChildAccount: (name: string, age: number, allowance: number, period: 'daily' | 'weekly' | 'monthly') => void;
  deleteChildAccount: (id: string) => void;
  payChildAllowance: (id: string) => void;
  addChildTransaction: (childId: string, desc: string, amount: number, type: 'income' | 'expense') => void;
  /** Opens the parent-owned edit modal. */
  onEditChild: (child: ChildAccount) => void;
  /** Opens the parent-owned allowance payout modal for a chosen account. */
  onRequestAllowancePayout: (child: ChildAccount, defaultAccountId: string) => void;
}

/**
 * The "children accounts" tab: overview totals, the child cards, and the
 * add-child form.
 *
 * Extracted from FamilyExpenses.tsx (1,095 lines) as part of L-1. The form
 * state and the per-card transaction drawer state live HERE rather than being
 * threaded down as props, because nothing outside this tab ever reads them —
 * keeping them in the parent was the main reason that component had grown 30+
 * useState calls. What remains in the props is only what genuinely crosses the
 * boundary: the data, the store mutators, and the two modals the parent owns.
 */
export function ChildrenAccountsTab({
  childAccounts,
  totalChildrenBalance,
  totalChildrenAllowance,
  accounts,
  addChildAccount,
  deleteChildAccount,
  payChildAllowance,
  addChildTransaction,
  onEditChild,
  onRequestAllowancePayout,
}: ChildrenAccountsTabProps) {
  const { t } = useI18n();
  const { fmt, parseNum, sanitizeNumericInput, sanitizeIntegerInput, sanitizeNameInput } = useFormat();

  // Add-child form — local by design, see the note above.
  const [showAddChild, setShowAddChild] = useState(false);
  const [childName, setChildName] = useState('');
  const [childAge, setChildAge] = useState('');
  const [childAllowance, setChildAllowance] = useState('');
  const [childPeriod, setChildPeriod] = useState<'daily' | 'weekly' | 'monthly'>('weekly');

  // Per-card transaction drawer — also local.
  const [activeChildTxModal, setActiveChildTxModal] = useState<string | null>(null);
  const [childTxDesc, setChildTxDesc] = useState('');
  const [childTxAmount, setChildTxAmount] = useState('');
  const [childTxType, setChildTxType] = useState<'income' | 'expense'>('expense');

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

  return (
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
                onRequestAllowancePayout(c, accounts[0].id);
              }
            }}
            onEditChild={onEditChild}
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
  );
}
