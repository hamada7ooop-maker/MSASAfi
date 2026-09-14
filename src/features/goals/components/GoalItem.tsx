import React, { useState } from 'react';
import { onActivate } from '@/core/a11yKeyboard';
import { useI18n } from '../../../i18n/index';
import { useFormat } from '../../../core/hooks/useFormat';
import type { Goal, Account } from '../../../types';
import confetti from 'canvas-confetti';
import { celebrate } from '../../../core/a11y';
import { toast } from '../../../toast';
import { awardPoints } from '../../../core/loyalty';
import { isAtLeastMoney } from '../../../core/money';

interface GoalItemProps {
  goal: Goal;
  accounts: Account[];
  isSelecting: boolean;
  isSelected: boolean;
  onToggleSelect: (id: string) => void;
  onEdit: (goal: Goal) => void;
  onDelete: (id: string) => void;
  onAddDeposit: (id: string, amount: number, accountId: string) => Promise<Goal | undefined>;
  onRequestAccount: (goalId: string, amount: number) => void;
  getGoalForecast: (goalId: string) => Promise<{ rate: number, monthsToGoal: number, estimatedDate: string, isBehind: boolean } | null>;
}

export function GoalItem({ 
  goal, 
  accounts, 
  isSelecting, 
  isSelected, 
  onToggleSelect, 
  onEdit, 
  onDelete, 
  onAddDeposit,
  onRequestAccount,
  getGoalForecast
}: GoalItemProps) {
  const { t, isLTR } = useI18n();
  const { fmt, parseNum, sanitizeNumericInput } = useFormat();
  
  const [depositAmount, setDepositAmount] = useState('');
  const [isDepositing, setIsDepositing] = useState(false);
  const [forecast, setForecast] = useState<{ rate: number, monthsToGoal: number, estimatedDate: string, isBehind: boolean } | null>(null);

  React.useEffect(() => {
    const fetchForecast = async () => {
      const f = await getGoalForecast(goal.id);
      setForecast(f);
    };
    fetchForecast();
  }, [goal.id, goal.saved, goal.target, getGoalForecast]);

  const saved = goal.saved || 0;
  const target = goal.target || 0;
  const pct = target > 0 ? Math.round((saved / target) * 100) : 0;
  
  const color = pct >= 100 ? 'var(--color-secondary, #10b981)' : '#002b59';
  const radius = 24;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(pct, 100) / 100) * circumference;

  const linkedAccount = accounts.find(a => a.id === goal.accountId);

  const handleDeposit = async () => {
    const numAmount = parseNum(depositAmount);
    if (!numAmount || numAmount <= 0) return;

    if (!goal.accountId) {
      onRequestAccount(goal.id, numAmount);
      // We will reset the deposit amount after they confirm in the modal.
      setDepositAmount('');
      return;
    }

    setIsDepositing(true);
    try {
      const updatedGoal = await onAddDeposit(goal.id, numAmount, goal.accountId);
      
      // Drift-tolerant: `saved` accumulates float error across deposits, so a
      // goal funded to exactly its target can land on 4999.999999999999 and a
      // strict `>=` would silently refuse to complete it. See core/money.ts.
      if (updatedGoal && isAtLeastMoney(updatedGoal.saved, updatedGoal.target) && !isAtLeastMoney(saved, target)) {
        await awardPoints('GOAL_COMPLETED');
        try {
          celebrate(() => confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } }));
        } catch {
          /* Confetti effect is non-critical UI decoration — silently fallback */
        }
        toast('🎉 ' + t('goal.completed'), 'success');
      } else {
        toast(t('goal.amountAdded'), 'success');
      }
      setDepositAmount('');
    } finally {
      setIsDepositing(false);
    }
  };

  return (
    <div className="flex items-stretch mb-4 group animate-in slide-in-from-right-4 duration-300">
      
      {/* Selection Indicator */}
      <div 
        onClick={() => onToggleSelect(goal.id)}
        className={`flex items-center justify-center cursor-pointer shrink-0 transition-all duration-300 ${
          isSelecting || isSelected ? 'w-10 opacity-100' : 'w-0 opacity-0 overflow-hidden'
        }`}
  role="button" tabIndex={0} onKeyDown={onActivate(() => onToggleSelect(goal.id))}>
        <span className={`material-symbols-outlined text-2xl ${
          isSelected ? 'text-blue-600 font-bold' : 'text-slate-300 dark:text-slate-700'
        }`}>
          {isSelected ? 'check_circle' : 'radio_button_unchecked'}
        </span>
      </div>
      {/* Main Card */}
      <div className={`flex-1 fin-card p-6 transition-all group ${
        isSelected ? 'border-blue-500 ring-2 ring-blue-500/10' : 'hover:border-blue-500/20'
      }`}>
        
        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-sm border border-black/5 dark:border-white/5 bg-surface-container-low text-[#002b59] dark:text-blue-300 transition-transform group-hover:scale-110">
              {(() => {
                const icon = goal.icon || 'flag';
                const isEmoji = /\p{Extended_Pictographic}/u.test(icon);
                return (
                  <span className={isEmoji ? "text-3xl" : "material-symbols-outlined text-3xl"} style={isEmoji ? {} : { fontVariationSettings: "'FILL' 1" }}>
                    {icon}
                  </span>
                );
              })()}
            </div>
            <div>
              <h3 className="font-black text-lg text-slate-800 dark:text-slate-100 leading-tight">
                {t(goal.name)}
              </h3>
              {linkedAccount && (
                <p className="text-[10px] text-blue-500 font-black uppercase tracking-widest flex items-center gap-1 mt-1.5 opacity-70">
                  <span className="material-symbols-outlined text-[12px]">account_balance_wallet</span>
                  {linkedAccount.name}
                </p>
              )}
            </div>
          </div>
          
          {/* Progress Ring */}
          <div className="relative w-16 h-16 flex items-center justify-center shrink-0 drop-shadow-sm">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 60 60">
              <circle cx="30" cy="30" r={radius} fill="none" stroke="currentColor" className="text-slate-100 dark:text-slate-800 opacity-50" strokeWidth="5"></circle>
              <circle cx="30" cy="30" r={radius} fill="none" stroke={color} strokeWidth="5" strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" className="transition-all duration-1000 ease-out"></circle>
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-[10px] font-black uppercase tracking-tighter" style={{ color: pct >= 100 ? color : 'var(--color-primary)' }}>
                {pct}%
              </span>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="flex justify-between text-sm mb-4 bg-surface-container-low dark:bg-slate-900/50 p-5 rounded-[2rem] border border-black/5 dark:border-white/5">
          <div className="text-center flex-1">
            <span className="text-slate-400 dark:text-slate-500 block text-[9px] uppercase font-black tracking-[0.2em] mb-1.5">{t('goal.saved')}</span>
            <span className="font-black text-blue-600 dark:text-blue-300 text-xl tabular-nums">{fmt(saved)}</span>
          </div>
          <div className="w-px bg-slate-200 dark:bg-slate-800/50 mx-2"></div>
          <div className="text-center flex-1">
            <span className="text-slate-400 dark:text-slate-500 block text-[9px] uppercase font-black tracking-[0.2em] mb-1.5">{t('goal.target')}</span>
            <span className="font-black text-slate-800 dark:text-slate-100 text-xl tabular-nums">{fmt(target)}</span>
          </div>
        </div>

        {/* Forecast Badge (Feature #31) */}
        {forecast && pct < 100 ? (
          <div className="mb-6 p-4 rounded-3xl bg-gradient-to-br from-blue-50/50 to-indigo-50/50 dark:from-blue-900/10 dark:to-indigo-900/10 border border-blue-100/20 dark:border-blue-800/20 animate-in fade-in zoom-in duration-500 relative overflow-hidden">
            {/* "NEW" Badge */}
            <div className="absolute top-0 right-0 bg-blue-600 text-white text-[7px] font-black px-2 py-0.5 rounded-bl-lg uppercase tracking-tighter">
              {t('goal.new')}
            </div>

            <div className="flex justify-between items-center mb-2">
              <span className="text-[9px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-sm">auto_graph</span>
                {t('goal.forecast')}
              </span>
              <div className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-tighter ${
                forecast.isBehind ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
              }`}>
                {forecast.isBehind ? t('goal.behind') : t('goal.onTrack')}
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold mb-0.5">{t('goal.estimateDate').replace('{date}', '')}</p>
                <p className="text-sm font-black text-slate-800 dark:text-slate-100">{forecast.estimatedDate}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold mb-0.5">{t('goal.monthlyRequired').replace('{amount}', '')}</p>
                <p className="text-sm font-black text-blue-600 dark:text-blue-300">{fmt(forecast.rate)} / mo</p>
              </div>
            </div>
            
            <div className="mt-3 flex items-center gap-2">
              <div className="flex-1 h-1 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-1000 ${forecast.isBehind ? 'bg-amber-500' : 'bg-blue-500'}`}
                  style={{ width: `${Math.min(100, (12 / (forecast.monthsToGoal || 1)) * 100)}%` }}
                />
              </div>
              <span className="text-[9px] font-black text-slate-400 uppercase">
                {forecast.monthsToGoal > 12 
                  ? t('goal.remainingTime').replace('{n}', Math.floor(forecast.monthsToGoal / 12).toString()) 
                  : t('goal.remainingTime').replace('{n}', forecast.monthsToGoal.toString())
                }
              </span>
            </div>
          </div>
        ) : (
          !forecast && pct < 100 && (
            <div className="mb-6 p-4 rounded-3xl bg-slate-50 dark:bg-slate-900/30 border border-dashed border-slate-200 dark:border-slate-800 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 text-lg">lightbulb</span>
              </div>
              <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 leading-relaxed">
                {t('goal.forecastHint')}
              </p>
            </div>
          )
        )}

        {/* Actions Row */}
        <div className="flex gap-2 items-stretch">
          <div className="relative flex-1">
            <input 
              type="text" 
              inputMode="decimal"
              value={depositAmount}
              onChange={(e) => setDepositAmount(sanitizeNumericInput(e.target.value))}
              onCompositionEnd={(e) => setDepositAmount(sanitizeNumericInput((e.target as HTMLInputElement).value))}
              onBlur={(e) => setDepositAmount(sanitizeNumericInput(e.target.value))}
              dir="auto"
              autoComplete="off"
              className={`w-full h-12 bg-surface-container-low dark:bg-slate-900 rounded-2xl border-none outline-none focus:ring-2 focus:ring-blue-500/20 text-sm font-black dark:text-white transition-all ${isLTR ? 'pl-5 pr-10' : 'pr-5 pl-10'}`} 
              placeholder={t('goal.addAmount')}
            />
            <button aria-label={t('action.add') || 'Add'} className={`absolute ${isLTR ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-blue-600 transition-colors`}>
              <span className="material-symbols-outlined text-[20px]" aria-hidden="true">add_circle</span>
            </button>
          </div>
          
          <button aria-label={t('action.refresh') || 'Refresh'} 
            onClick={handleDeposit}
            disabled={isDepositing || !depositAmount}
            className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 dark:disabled:bg-slate-800 text-white px-6 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
          >
            {isDepositing ? <span className="material-symbols-outlined text-sm animate-spin" aria-hidden="true">refresh</span> : t('action.add')}
          </button>
          
          <button aria-label={t('action.edit') || 'Edit'} 
            onClick={() => onEdit(goal)}
            className="w-12 h-12 flex items-center justify-center rounded-2xl bg-surface-container-low dark:bg-slate-800 text-blue-500 hover:bg-blue-500/10 transition-all active:scale-95"
          >
            <span className="material-symbols-outlined text-xl" aria-hidden="true">edit</span>
          </button>
          
          <button aria-label={t('action.delete') || 'Delete'} 
            onClick={() => onDelete(goal.id)}
            className="w-12 h-12 flex items-center justify-center rounded-2xl bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 transition-all active:scale-95"
          >
            <span className="material-symbols-outlined text-xl" aria-hidden="true">delete</span>
          </button>
        </div>
      </div>
    </div>
  );
}
