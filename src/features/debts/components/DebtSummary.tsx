import React from 'react';
import { useI18n } from '../../../i18n/index';
import { useFormat } from '../../../core/hooks/useFormat';
import type { Debt } from '../../../types';

interface DebtSummaryProps {
  owedDebts: Debt[];
  lentDebts: Debt[];
}

export function DebtSummary({ owedDebts, lentDebts }: DebtSummaryProps) {
  const { t } = useI18n();
  const { fmt } = useFormat();

  const totalOwed = owedDebts.reduce((s, d) => s + (d.total - (d.paid || 0)), 0);
  const totalLent = lentDebts.reduce((s, d) => s + (d.total - (d.paid || 0)), 0);

  return (
    <div className="grid grid-cols-2 gap-2.5 sm:gap-3 mb-6 animate-in slide-in-from-top-4 duration-500 w-full max-w-full min-w-0">
      
      {/* Owed Summary */}
      <div className="bg-rose-50 dark:bg-rose-900/10 p-3.5 sm:p-5 rounded-3xl text-center shadow-sm border border-rose-100 dark:border-rose-900/30 min-w-0 overflow-hidden">
        <div className="w-8 h-8 sm:w-10 sm:h-10 bg-rose-100 dark:bg-rose-900/30 rounded-2xl flex items-center justify-center mx-auto mb-2 sm:mb-3 shrink-0">
          <span className="material-symbols-outlined text-rose-500 text-base sm:text-lg">arrow_downward</span>
        </div>
        <p className="text-[10px] sm:text-xs font-black text-rose-500 uppercase tracking-wider mb-1 truncate">
          {t('debt.owedLabel')}
        </p>
        <p className="text-base sm:text-2xl font-black text-rose-700 dark:text-rose-400 truncate tabular-nums" title={fmt(totalOwed)}>
          {fmt(totalOwed)}
        </p>
      </div>

      {/* Lent Summary */}
      <div className="bg-emerald-50 dark:bg-emerald-900/10 p-3.5 sm:p-5 rounded-3xl text-center shadow-sm border border-emerald-100 dark:border-emerald-900/30 min-w-0 overflow-hidden">
        <div className="w-8 h-8 sm:w-10 sm:h-10 bg-emerald-100 dark:bg-emerald-900/30 rounded-2xl flex items-center justify-center mx-auto mb-2 sm:mb-3 shrink-0">
          <span className="material-symbols-outlined text-emerald-600 text-base sm:text-lg">arrow_upward</span>
        </div>
        <p className="text-[10px] sm:text-xs font-black text-emerald-600 uppercase tracking-wider mb-1 truncate">
          {t('debt.lentLabel')}
        </p>
        <p className="text-base sm:text-2xl font-black text-emerald-700 dark:text-emerald-400 truncate tabular-nums" title={fmt(totalLent)}>
          {fmt(totalLent)}
        </p>
      </div>

    </div>
  );
}
