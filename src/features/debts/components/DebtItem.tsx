import React, { useState } from 'react';
import { useI18n } from '../../../i18n/index';
import { useFormat } from '../../../core/hooks/useFormat';
import { sanitizeNumericInput } from '../../../core/utils';
import type { Debt, Account } from '../../../types';
import { toast } from '../../../toast';
import { awardPoints } from '../../../core/loyalty';
import confetti from 'canvas-confetti';
import { celebrate } from '../../../core/a11y';
import { isSettled } from '../../../core/money';

interface DebtItemProps {
  debt: Debt;
  accounts: Account[];
  isSelecting: boolean;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
  onEdit: (debt: Debt) => void;
  onDelete: (id: string) => void;
  onPayDebt: (id: string, amount: number, accountId: string) => Promise<void>;
  onRequestAccount: (debtId: string, amount: number) => void;
  onShowAmortization?: (debt: Debt) => void;
}

export function DebtItem({ 
  debt, 
  accounts,
  isSelecting, 
  isSelected, 
  onToggleSelect, 
  onEdit, 
  onDelete,
  onPayDebt,
  onRequestAccount,
  onShowAmortization
}: DebtItemProps) {
  const { t, isLTR } = useI18n();
  const { fmt, parseNum } = useFormat();
  
  const [payAmount, setPayAmount] = useState('');
  const [isPaying, setIsPaying] = useState(false);

  const isOwed = debt.type === 'owed';
  const remaining = debt.total - (debt.paid || 0);
  const pct = debt.total > 0 ? ((debt.paid || 0) / debt.total) * 100 : 0;
  
  const linkedAccount = accounts.find(a => a.id === debt.accountId);

  const handlePay = async () => {
    const numAmount = parseNum(payAmount);
    if (!numAmount || numAmount <= 0) return;

    if (!debt.accountId) {
      onRequestAccount(debt.id, numAmount);
      setPayAmount('');
      return;
    }

    setIsPaying(true);
    try {
      await onPayDebt(debt.id, numAmount, debt.accountId);
      
      // Check if settled. Drift-tolerant: `paid` accumulates float error over
      // many payments, so clearing the final instalment can leave a remaining
      // balance of ~1e-11 and a strict `<= 0` would never mark the debt
      // settled. See core/money.ts.
      if (isSettled(remaining - numAmount)) {
        await awardPoints('DEBT_SETTLED');
        try {
          celebrate(() => confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } }));
        } catch {
          /* Confetti effect is non-critical UI decoration — silently fallback */
        }
        toast('🎉 ' + (t('debt.fullyPaid') || 'Debt Settled!'), 'success');
      } else {
        toast(t('debt.paymentRecorded'), 'success');
      }
      setPayAmount('');
    } finally {
      setIsPaying(false);
    }
  };

  return (
    <div className="w-full max-w-full min-w-0 flex items-stretch mb-3 group animate-in slide-in-from-right-4 duration-300">
      
      {/* Selection Indicator */}
      <div 
        onClick={() => onToggleSelect(debt.id)}
        className={`flex items-center justify-center cursor-pointer shrink-0 transition-all duration-300 ${
          isSelecting || isSelected ? 'w-10 opacity-100' : 'w-0 opacity-0 overflow-hidden'
        }`}
      >
        <span className={`material-symbols-outlined text-2xl ${
          isSelected ? 'text-blue-600 font-bold' : 'text-slate-300 dark:text-slate-700'
        }`}>
          {isSelected ? 'check_circle' : 'radio_button_unchecked'}
        </span>
      </div>

      {/* Main Card */}
      <div className={`w-full max-w-full min-w-0 flex-1 fin-card p-4 sm:p-6 transition-all group overflow-hidden ${
        isSelected ? 'border-blue-500 ring-2 ring-blue-500/10' : 'hover:border-blue-500/20'
      }`}>
        
        {/* Header */}
        <div className="flex justify-between items-start gap-2.5 mb-4 sm:mb-6 min-w-0">
          <div className="flex items-center gap-2.5 sm:gap-4 min-w-0 flex-1">
            <div className={`w-11 h-11 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-sm border border-black/5 dark:border-white/5 transition-transform group-hover:scale-105 ${isOwed ? 'bg-rose-500/10 text-rose-500' : 'bg-emerald-500/10 text-emerald-600'}`}>
              {(() => {
                const icon = debt.icon || 'account_balance';
                const isEmoji = /\p{Extended_Pictographic}/u.test(icon);
                return (
                  <span className={isEmoji ? "text-2xl sm:text-3xl" : "material-symbols-outlined text-2xl sm:text-3xl"} style={isEmoji ? {} : { fontVariationSettings: "'FILL' 1" }}>
                    {icon}
                  </span>
                );
              })()}
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="font-black dark:text-slate-100 text-base sm:text-lg truncate leading-tight mb-1 group-hover:text-blue-600 transition-colors" title={t(debt.name)}>
                {t(debt.name)}
              </h4>
              <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider truncate max-w-[110px] sm:max-w-none">
                  {debt.person ? t(debt.person) : t('debt.person')}
                </p>
                {linkedAccount && (
                  <span className="inline-flex items-center gap-1 text-[9px] text-blue-500 font-black uppercase tracking-tight bg-blue-500/10 px-1.5 py-0.5 rounded-lg truncate max-w-[120px] sm:max-w-none" title={linkedAccount.name}>
                    <span className="material-symbols-outlined text-[10px] shrink-0">account_balance_wallet</span>
                    <span className="truncate">{linkedAccount.name}</span>
                  </span>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex flex-col items-end gap-2 shrink-0">
            <span className={`text-[9px] px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-xl font-black uppercase tracking-wider shadow-sm border border-black/5 dark:border-white/5 shrink-0 whitespace-nowrap ${
              isOwed ? 'bg-rose-500 text-white' : 'bg-emerald-500 text-white'
            }`}>
              {isOwed ? t('debt.owedLabel') : t('debt.lentLabel')}
            </span>
            <div className="flex gap-1.5 shrink-0">
               <button 
                 onClick={() => onEdit(debt)} 
                 className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-surface-container-low dark:bg-slate-800 text-blue-400 flex items-center justify-center hover:bg-blue-500/10 transition-all shrink-0 active:scale-95"
                 aria-label={t('action.edit') || 'تعديل'}
                 title={t('action.edit') || 'تعديل'}
               >
                 <span className="material-symbols-outlined text-sm sm:text-base" aria-hidden="true">edit</span>
               </button>
               <button 
                 onClick={() => onDelete(debt.id)} 
                 className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center hover:bg-rose-500/20 transition-all shrink-0 active:scale-95"
                 aria-label={t('action.delete') || 'حذف'}
                 title={t('action.delete') || 'حذف'}
               >
                 <span className="material-symbols-outlined text-sm sm:text-base" aria-hidden="true">close</span>
               </button>
            </div>
          </div>
        </div>

        {/* Progress Section */}
        <div className="bg-surface-container-low dark:bg-slate-900/50 p-4 sm:p-5 rounded-2xl sm:rounded-[2rem] border border-black/5 dark:border-white/5 mb-4 sm:mb-6 min-w-0">
          <div className="flex justify-between items-start gap-2 text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2.5 min-w-0">
            <div className="flex flex-col gap-0.5 min-w-0 flex-1">
               <span className="opacity-60 truncate">{t('debt.paid')}</span>
               <span className="text-slate-800 dark:text-slate-100 text-xs sm:text-sm tabular-nums truncate font-black">{fmt(debt.paid || 0)}</span>
            </div>
            <div className="flex flex-col gap-0.5 items-end min-w-0 flex-1">
               <span className="opacity-60 truncate">{t('debt.remaining')}</span>
               <span className={`text-xs sm:text-sm tabular-nums truncate font-black ${remaining > 0 ? (isOwed ? 'text-rose-500' : 'text-emerald-500') : 'text-slate-400'}`}>{fmt(remaining)}</span>
            </div>
          </div>
          <div className="w-full bg-slate-200 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-1000 ease-out shadow-sm ${isOwed ? 'bg-rose-500' : 'bg-emerald-500'}`} 
              style={{ width: `${pct}%` }}
            ></div>
          </div>
        </div>

        {/* Loan Amortization Schedule trigger button */}
        {debt.interestRate !== undefined && debt.termMonths !== undefined && onShowAmortization && (
          <button
            onClick={() => onShowAmortization(debt)}
            className="w-full mb-3 sm:mb-4 py-2.5 sm:py-3 bg-blue-500/10 text-blue-600 dark:text-blue-400 font-black text-xs rounded-2xl flex items-center justify-center gap-2 hover:bg-blue-500/25 active:scale-95 transition-all border border-blue-500/15"
          >
            <span className="material-symbols-outlined text-base">table_chart</span>
            <span className="truncate">{t('debt.amortizationBtn') || 'Amortization Schedule 📋'}</span>
          </button>
        )}

        {/* Payment Action */}
        {isSettled(remaining) ? (
          <div className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-black text-[10px] uppercase tracking-wider p-3 sm:p-4 rounded-2xl flex items-center justify-center gap-2 border border-emerald-500/20">
            <span className="material-symbols-outlined text-base shrink-0">verified</span> 
            <span className="truncate">{t('debt.fullyPaid')}</span>
          </div>
        ) : (
          <div className="flex gap-2 items-stretch min-w-0">
            <div className="relative flex-1 min-w-0">
              <input 
                type="text" 
                inputMode="decimal"
                value={payAmount}
                onChange={(e) => setPayAmount(sanitizeNumericInput(e.target.value))}
                onCompositionEnd={(e) => setPayAmount(sanitizeNumericInput((e.target as HTMLInputElement).value))}
                onBlur={(e) => setPayAmount(sanitizeNumericInput(e.target.value))}
                dir="auto"
                autoComplete="off"
                className={`w-full h-11 sm:h-12 bg-surface-container-low dark:bg-slate-900 rounded-2xl border-none outline-none focus:ring-2 focus:ring-blue-500/20 text-xs sm:text-sm font-black dark:text-white transition-all ${isLTR ? 'pl-4 pr-9 sm:pl-5 sm:pr-10' : 'pr-4 pl-9 sm:pr-5 sm:pl-10'}`} 
                placeholder={t('debt.payAmount')}
              />
              <button aria-label={t('action.add') || 'Add'} 
                type="button" 
                tabIndex={-1}
                className={`absolute ${isLTR ? 'right-2.5 sm:right-3' : 'left-2.5 sm:left-3'} top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-blue-600 transition-colors shrink-0`}
              >
                <span className="material-symbols-outlined text-[18px] sm:text-[20px]" aria-hidden="true">add_circle</span>
              </button>
            </div>
            
            <button aria-label={t('action.refresh') || 'Refresh'} 
              onClick={handlePay}
              disabled={isPaying || !payAmount}
              className={`text-white px-4 sm:px-6 rounded-2xl text-[10px] font-black uppercase tracking-wider shadow-lg active:scale-95 transition-all shrink-0 whitespace-nowrap flex items-center justify-center ${
                isOwed ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-500/30' : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/30'
              } disabled:bg-slate-300 dark:disabled:bg-slate-800 disabled:shadow-none`}
            >
              {isPaying ? <span className="material-symbols-outlined text-sm animate-spin" aria-hidden="true">refresh</span> : t('debt.pay')}
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
