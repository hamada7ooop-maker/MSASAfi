import React from 'react';
import { useFormat } from '@core/hooks/useFormat';
import { useI18n } from '@/i18n/index';

interface IncomeExpenseCardsProps {
  income: number;
  expense: number;
}

export const IncomeExpenseCards = React.memo(function IncomeExpenseCards({ income, expense }: IncomeExpenseCardsProps) {
  const { fmt, getCurrencySymbol } = useFormat();
  const { t } = useI18n();
  const currency = getCurrencySymbol();

  return (
    <div className="grid grid-cols-2 gap-4">
      {/* Income Card */}
      <div className="relative overflow-hidden p-5 rounded-[2rem] border-2 border-emerald-500/20 border-s-[8px] border-s-emerald-500 bg-emerald-50/50 dark:bg-emerald-500/10 shadow-lg hover:shadow-emerald-500/10 transition-all duration-300 group flex flex-col items-center text-center">
        <div className="flex flex-col items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 transition-transform group-hover:scale-110 shadow-sm">
            <span className="material-symbols-outlined text-lg font-black">trending_up</span>
          </div>
          <span className="text-[10px] font-black text-emerald-800 dark:text-emerald-300 uppercase tracking-widest">{t('home.income')}</span>
        </div>
        <p className="text-xl font-black text-emerald-700 dark:text-emerald-400 flex items-baseline justify-center gap-1 whitespace-nowrap">
          <span className="tabular-nums truncate">{fmt(income)}</span>
          <span className="text-[9px] font-bold opacity-60 uppercase shrink-0">{currency}</span>
        </p>
      </div>

      {/* Expense Card */}
      <div className="relative overflow-hidden p-5 rounded-[2rem] border-2 border-rose-500/20 border-s-[8px] border-s-rose-500 bg-rose-50/50 dark:bg-rose-500/10 shadow-lg hover:shadow-rose-500/10 transition-all duration-300 group flex flex-col items-center text-center">
        <div className="flex flex-col items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-rose-500/20 text-rose-600 dark:text-rose-400 transition-transform group-hover:scale-110 shadow-sm">
            <span className="material-symbols-outlined text-lg font-black">trending_down</span>
          </div>
          <span className="text-[10px] font-black text-rose-800 dark:text-rose-300 uppercase tracking-widest">{t('home.expense')}</span>
        </div>
        <p className="text-xl font-black text-rose-700 dark:text-rose-400 flex items-baseline justify-center gap-1 whitespace-nowrap">
          <span className="tabular-nums truncate">{fmt(expense)}</span>
          <span className="text-[9px] font-bold opacity-60 uppercase shrink-0">{currency}</span>
        </p>
      </div>
    </div>
  );
});
