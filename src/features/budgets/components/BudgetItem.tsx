import React from 'react';
import { useI18n } from '../../../i18n/index';
import { useFormat } from '../../../core/hooks/useFormat';
import type { Budget } from '../../../types';

interface BudgetItemProps {
  budget: Budget;
  spent: number;
  rollover?: number;
  limit: number;
  onEdit: (budget: Budget) => void;
  onDelete: (id: string) => void;
}

export function BudgetItem({ budget, spent, rollover = 0, limit, onEdit, onDelete }: BudgetItemProps) {
  const { t, formatCategoryLabel } = useI18n();
  const { fmt } = useFormat();

  const pct = limit > 0 ? (spent / limit) * 100 : 0;
  const color = pct > 90 ? 'var(--color-tertiary, #f43f5e)' : pct > 70 ? '#f59e0b' : 'var(--color-primary, #2563eb)';
  
  const radius = 18;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(pct, 100) / 100) * circumference;

  const catsArray = budget.categories && budget.categories.length > 0 ? budget.categories : [budget.category];

  return (
    <div className="bg-white dark:bg-slate-800 p-5 rounded-3xl border border-black/5 dark:border-white/5 shadow-sm transition-all hover:shadow-md animate-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center gap-4">
          
          {/* Progress Ring */}
          <div className="relative w-14 h-14 flex items-center justify-center shrink-0">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 40 40">
              <circle cx="20" cy="20" r={radius} fill="none" stroke="currentColor" className="text-slate-100 dark:text-slate-700 opacity-50" strokeWidth="3"></circle>
              <circle cx="20" cy="20" r={radius} fill="none" stroke={color} strokeWidth="3" strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" className="transition-all duration-1000 ease-out"></circle>
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xs font-black" style={{ color }}>{Math.round(pct)}%</span>
            </div>
          </div>
          
          {/* Title and details */}
          <div>
            <p className="font-bold text-slate-800 dark:text-white">
              {budget.name || formatCategoryLabel(budget.category)}
            </p>
            <p className="text-[11px] font-bold text-slate-400 mt-0.5">
              {catsArray.length > 1 ? (
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-[10px]">style</span>
                  {catsArray.length} {t('budget.categoriesCount')} • 
                </span>
              ) : null}
              {t('budget.limitLabel')} {fmt(limit)}
              {rollover > 0 && (
                <span className="flex items-center gap-1 text-blue-500 mt-1">
                  <span className="material-symbols-outlined text-[10px]">history</span>
                  +{fmt(rollover)} {t('budget.rollover')}
                </span>
              )}
            </p>
          </div>
        </div>
        
        {/* Actions */}
        <div className="flex items-center gap-1">
          <button 
            aria-label="Edit budget"
            onClick={() => onEdit(budget)}
            className="w-8 h-8 rounded-full flex items-center justify-center bg-slate-50 dark:bg-slate-700 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-600 transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">edit</span>
          </button>
          <button 
            aria-label="Delete budget"
            onClick={() => onDelete(budget.id)}
            className="w-8 h-8 rounded-full flex items-center justify-center bg-slate-50 dark:bg-slate-700 text-slate-400 hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-900/30 transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">close</span>
          </button>
        </div>
      </div>

      <div className="flex justify-between items-end mb-3 mt-4">
        <span className="text-3xl font-black tabular-nums" style={{ color }}>{fmt(spent)}</span>
      </div>

      {/* Badges */}
      {pct > 90 ? (
        <p className="text-xs text-rose-600 dark:text-rose-400 font-bold bg-rose-50 dark:bg-rose-900/20 p-3 rounded-2xl flex items-center gap-2">
          <span className="material-symbols-outlined text-sm">warning</span> {t('budget.exceeded') || 'تجاوزت الحد المسموح!'}
        </p>
      ) : pct > 70 ? (
        <p className="text-xs text-amber-700 dark:text-amber-500 font-bold bg-amber-50 dark:bg-amber-900/20 p-3 rounded-2xl flex items-center gap-2">
          <span className="material-symbols-outlined text-sm">error</span> {t('budget.nearLimit') || 'اقتربت من الحد الأقصى'}
        </p>
      ) : (
        <div className="space-y-2">
            <p className="text-xs text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-900/20 p-3 rounded-2xl flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">check_circle</span> {t('budget.remaining') || 'المتبقي:'} {fmt(limit - spent)}
            </p>
            {rollover > 0 && (
                 <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/10 rounded-xl w-fit">
                    <span className="material-symbols-outlined text-xs text-blue-500">auto_mode</span>
                    <span className="text-[9px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-tighter">
                        {t('budget.rolloverActive') || 'Rollover Applied'}
                    </span>
                 </div>
            )}
        </div>
      )}
    </div>
  );
}
