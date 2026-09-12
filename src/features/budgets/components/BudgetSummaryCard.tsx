import React from 'react';
import { useI18n } from '../../../i18n/index';
import { useFormat } from '../../../core/hooks/useFormat';

interface BudgetSummaryCardProps {
  totalBudget: number;
  totalSpent: number;
}

export function BudgetSummaryCard({ totalBudget, totalSpent }: BudgetSummaryCardProps) {
  const { t } = useI18n();
  const { fmt } = useFormat();

  const pct = totalBudget > 0 ? Math.min((totalSpent / totalBudget) * 100, 100) : 0;
  const isNearLimit = totalBudget > 0 && totalSpent / totalBudget > 0.8;
  const isExceeded = totalBudget > 0 && totalSpent >= totalBudget;

  const barColor = isExceeded 
    ? 'var(--color-tertiary-container, #f43f5e)' // Rose
    : isNearLimit 
      ? '#f59e0b' // Amber
      : 'var(--color-secondary-container, #34d399)'; // Emerald/Teal

  return (
    <div className="bg-blue-600 dark:bg-blue-700 text-white p-5 rounded-3xl shadow-xl shadow-blue-500/20 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full -mr-10 -mt-10 blur-2xl"></div>
      
      <p className="text-sm font-bold opacity-80 mb-1">{t('budget.total')}</p>
      
      <p className="text-4xl font-black mb-4 tracking-tight tabular-nums">
        {fmt(totalBudget)}
      </p>
      
      <div className="w-full bg-black/20 h-2.5 rounded-full overflow-hidden mb-3">
        <div 
          className="h-full rounded-full transition-all duration-1000 ease-out" 
          style={{ width: `${pct}%`, backgroundColor: barColor }}
        ></div>
      </div>
      
      <div className="flex items-center justify-between text-xs font-bold opacity-90">
        <p>{t('budget.spent')}: <span className="tabular-nums">{fmt(totalSpent)}</span></p>
        <p>{t('budget.remaining')}: <span className="tabular-nums">{fmt(totalBudget - totalSpent)}</span></p>
      </div>
    </div>
  );
}
