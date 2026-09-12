import React from 'react';
import { useI18n } from '../../../i18n/index';
import { useFormat } from '../../../core/hooks/useFormat';

interface WeeklyReviewProps {
  weeklyData: {
    income: number;
    expense: number;
    net: number;
  };
}

export function WeeklyReview({ weeklyData }: WeeklyReviewProps) {
  const { t } = useI18n();
  const { fmt } = useFormat();

  return (
    <div className="bg-white dark:bg-slate-800 rounded-[32px] p-6 shadow-xl border border-black/5 dark:border-white/5">
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-black text-sm uppercase tracking-tighter flex items-center gap-2">
          <span className="material-symbols-outlined text-violet-500">date_range</span>
          {t('home.weeklyReview')}
        </h3>
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
          {t('home.last7Days')}
        </span>
      </div>
      
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-slate-50 dark:bg-slate-900/40 p-3.5 rounded-2xl border border-black/5 dark:border-white/5 flex flex-col items-center text-center">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{t('home.income')}</p>
          <p className="text-[11px] font-black text-emerald-600 dark:text-emerald-400 tabular-nums">
            {fmt(weeklyData.income)}
          </p>
        </div>
        <div className="bg-slate-50 dark:bg-slate-900/40 p-3.5 rounded-2xl border border-black/5 dark:border-white/5 flex flex-col items-center text-center">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{t('txn.expense')}</p>
          <p className="text-[11px] font-black text-rose-600 dark:text-rose-400 tabular-nums">
            {fmt(weeklyData.expense)}
          </p>
        </div>
        <div className="bg-slate-50 dark:bg-slate-900/40 p-3.5 rounded-2xl border border-black/5 dark:border-white/5 flex flex-col items-center text-center">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{t('home.net')}</p>
          <p className={`text-[11px] font-black tabular-nums ${weeklyData.net >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-rose-600'}`}>
            {fmt(weeklyData.net)}
          </p>
        </div>
      </div>
    </div>
  );
}
