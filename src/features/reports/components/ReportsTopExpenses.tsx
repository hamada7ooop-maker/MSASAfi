import React from 'react';
import { useI18n } from '../../../i18n/index';
import { useFormat } from '../../../core/hooks/useFormat';
import type { Transaction } from '../../../types';

interface ReportsTopExpensesProps {
  expenses: Transaction[];
}

export function ReportsTopExpenses({ expenses }: ReportsTopExpensesProps) {
  const { t, formatCategoryLabel, relDate } = useI18n();
  const { fmt } = useFormat();

  if (expenses.length === 0) return null;

  return (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-[32px] shadow-sm border border-black/5 dark:border-white/5">
      <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
        <span className="material-symbols-outlined text-rose-600 text-lg">leaderboard</span>
        {t('home.topExpenses')}
      </h3>

      <div className="space-y-5">
        {expenses.map((tx, i) => (
          <div key={tx.id} className="flex items-center gap-4 group cursor-default">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black shrink-0 transition-all group-hover:scale-110 ${
              i === 0 ? 'bg-rose-600 text-white shadow-lg shadow-rose-200 dark:shadow-none' : 
              i === 1 ? 'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-300' : 
              'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
            }`}>
              {i + 1}
            </div>
            
            <div className="flex-1 min-w-0">
              <p className="font-bold text-slate-800 dark:text-white truncate">
                {tx.description || formatCategoryLabel(tx.category)}
              </p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                {formatCategoryLabel(tx.category)} • {relDate(tx.date || tx.createdAt || Date.now())}
              </p>
            </div>

            <div className="text-right">
              <p className="font-black text-rose-600">{fmt(tx.amount || 0)}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
