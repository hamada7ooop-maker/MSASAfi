import React from 'react';
import { useI18n } from '../../../i18n';
import { useFormat } from '../../../core/hooks/useFormat';
import type { ChildAccount, ChildTransaction } from '../../../store/settingsStore';

interface ChildAccountCardProps {
  child: ChildAccount;
  onPayAllowance: (child: ChildAccount) => void;
  onEditChild: (child: ChildAccount) => void;
  onDeleteChild: (id: string) => void;
  isTxDrawerOpen: boolean;
  onToggleTxDrawer: () => void;
  txDesc: string;
  onTxDescChange: (val: string) => void;
  txAmount: string;
  onTxAmountChange: (val: string) => void;
  txType: 'income' | 'expense';
  onTxTypeChange: (val: 'income' | 'expense') => void;
  onAddTransaction: () => void;
}

export function ChildAccountCard({
  child,
  onPayAllowance,
  onEditChild,
  onDeleteChild,
  isTxDrawerOpen,
  onToggleTxDrawer,
  txDesc,
  onTxDescChange,
  txAmount,
  onTxAmountChange,
  txType,
  onTxTypeChange,
  onAddTransaction,
}: ChildAccountCardProps) {
  const { t } = useI18n();
  const { fmt } = useFormat();

  return (
    <div className="p-5 rounded-3xl bg-white/60 dark:bg-slate-900/40 border border-white/20 dark:border-white/5 shadow-md flex flex-col justify-between space-y-4 hover:scale-[1.02] hover:shadow-lg transition-all duration-300 relative overflow-hidden group/child">
      <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-amber-500/5 to-orange-500/5 rounded-full blur-xl group-hover/child:scale-125 transition-transform"></div>

      <div className="flex justify-between items-start relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-slate-800 text-2xl flex items-center justify-center shadow-inner">
            🧸
          </div>
          <div>
            <h4 className="font-black text-xs text-slate-800 dark:text-slate-100">{child.name}</h4>
            <p className="text-[9px] text-slate-400 font-bold">
              {t('family.monitored.age', { age: child.age })}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => onPayAllowance(child)}
            className="px-2.5 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 text-[9px] font-black flex items-center gap-1 transition-all active:scale-95 cursor-pointer"
            title={t('family.monitored.sendAllowanceTitle')}
            aria-label={t('family.monitored.sendAllowanceTitle') || 'Send allowance'}
          >
            <span className="material-symbols-outlined text-[12px]">payments</span>
            {t('family.monitored.payAllowance')}
          </button>
          <button
            onClick={() => onEditChild(child)}
            className="w-8 h-8 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 flex items-center justify-center transition-all active:scale-90 cursor-pointer"
            title={t('family.monitored.editChild')}
            aria-label={t('family.monitored.editChild') || 'Edit child'}
          >
            <span className="material-symbols-outlined text-sm">edit</span>
          </button>
          <button
            onClick={() => onDeleteChild(child.id)}
            className="w-8 h-8 rounded-full bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 flex items-center justify-center transition-all active:scale-90 cursor-pointer"
            title={t('action.delete') || 'Delete'}
            aria-label={t('action.delete') || 'Delete child'}
          >
            <span className="material-symbols-outlined text-sm">delete</span>
          </button>
        </div>
      </div>

      {/* Wallet Balance Display */}
      <div className="p-3 bg-white/40 dark:bg-slate-900/40 rounded-2xl border border-white/20 flex justify-between items-center z-10">
        <span className="text-[9px] font-black text-slate-400 uppercase">{t('family.monitored.walletBalance')}</span>
        <span className="text-sm font-black text-amber-600 dark:text-amber-400">{fmt(child.balance || 0)} ر.س</span>
      </div>

      {/* Quick Child transaction / spent addition */}
      <div className="space-y-2 z-10 border-t border-slate-100 dark:border-slate-800 pt-3">
        <div className="flex justify-between items-center">
          <span className="text-[9px] font-black text-slate-400 uppercase">{t('family.monitored.quickActions')}</span>
          <button
            onClick={onToggleTxDrawer}
            className="text-[9px] font-black text-indigo-500 flex items-center gap-0.5 cursor-pointer"
          >
            <span className="material-symbols-outlined text-[10px]">add</span>
            {t('family.monitored.addChildTx')}
          </button>
        </div>

        {/* Quick tx input drawer */}
        {isTxDrawerOpen && (
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 space-y-2 animate-in slide-in-from-top-2">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder={t('family.monitored.descPlaceholder')}
                value={txDesc}
                onChange={(e) => onTxDescChange(e.target.value)}
                dir="auto"
                autoComplete="off"
                aria-label={t('family.monitored.descPlaceholder') || 'Transaction description'}
                className="flex-1 bg-white dark:bg-slate-950/40 rounded-lg p-2 text-[10px] border-none outline-none font-bold"
              />
              <input
                type="text"
                inputMode="decimal"
                placeholder="Amount"
                value={txAmount}
                onChange={(e) => onTxAmountChange(e.target.value)}
                dir="auto"
                autoComplete="off"
                aria-label="Amount"
                className="w-16 bg-white dark:bg-slate-950/40 rounded-lg p-2 text-[10px] border-none outline-none font-black text-center"
              />
            </div>

            <div className="flex justify-between items-center">
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => onTxTypeChange('expense')}
                  className={`px-2 py-1 rounded text-[8px] font-black transition-all cursor-pointer ${
                    txType === 'expense' ? 'bg-rose-500 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                  }`}
                >
                  {t('family.monitored.spend')}
                </button>
                <button
                  type="button"
                  onClick={() => onTxTypeChange('income')}
                  className={`px-2 py-1 rounded text-[8px] font-black transition-all cursor-pointer ${
                    txType === 'income' ? 'bg-emerald-500 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                  }`}
                >
                  {t('family.monitored.reward')}
                </button>
              </div>

              <button
                type="button"
                onClick={onAddTransaction}
                className="px-3 py-1 rounded bg-indigo-600 text-white text-[8px] font-black cursor-pointer"
              >
                {t('family.monitored.record')}
              </button>
            </div>
          </div>
        )}

        {/* child transactions history */}
        {child.transactions && child.transactions.length > 0 ? (
          <div className="max-h-28 overflow-y-auto space-y-1 pr-1 scrollbar-thin">
            {child.transactions.map((ctx: ChildTransaction, cidx: number) => (
              <div
                key={ctx.id || cidx}
                className="flex justify-between items-center text-[9px] font-bold text-slate-600 dark:text-slate-400 bg-white/40 dark:bg-slate-800/40 px-2 py-1 rounded-lg"
              >
                <span className="truncate max-w-[130px]">{ctx.description}</span>
                <span className={ctx.type === 'expense' ? 'text-rose-500 font-black' : 'text-emerald-500 font-black'}>
                  {ctx.type === 'expense' ? '-' : '+'}
                  {fmt(ctx.amount)}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[8px] text-slate-400 font-bold">{t('family.monitored.noTxYet')}</p>
        )}
      </div>
    </div>
  );
}
