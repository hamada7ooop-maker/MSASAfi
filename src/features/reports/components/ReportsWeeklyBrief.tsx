import React from 'react';
import { useI18n } from '../../../i18n/index';
import { useFormat } from '../../../core/hooks/useFormat';

interface ReportsWeeklyBriefProps {
  stats: { income: number; expense: number; count: number };
}

export function ReportsWeeklyBrief({ stats }: ReportsWeeklyBriefProps) {
  const { t } = useI18n();
  const { fmtShort } = useFormat();

  return (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-[32px] shadow-sm border border-black/5 dark:border-white/5">
      <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
        <span className="material-symbols-outlined text-blue-600 text-lg">date_range</span>
        {t('report.weeklyBrief')}
      </h3>

      <div className="grid grid-cols-3 gap-3">
        <div className="text-center p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100/50 dark:border-emerald-500/10 group transition-all hover:scale-[1.02]">
          <p className="text-[10px] font-black text-emerald-600/60 uppercase mb-2">{t('home.income')}</p>
          <p className="text-lg font-black text-emerald-600">{fmtShort(stats.income)}</p>
        </div>

        <div className="text-center p-4 rounded-2xl bg-rose-50 dark:bg-rose-900/10 border border-rose-100/50 dark:border-rose-500/10 group transition-all hover:scale-[1.02]">
          <p className="text-[10px] font-black text-rose-600/60 uppercase mb-2">{t('home.expense')}</p>
          <p className="text-lg font-black text-rose-600">{fmtShort(stats.expense)}</p>
        </div>

        <div className="text-center p-4 rounded-2xl bg-blue-50 dark:bg-blue-900/10 border border-blue-100/50 dark:border-blue-500/10 group transition-all hover:scale-[1.02]">
          <p className="text-[10px] font-black text-blue-600/60 uppercase mb-2">{t('report.txnsShort')}</p>
          <p className="text-lg font-black text-blue-600">{stats.count}</p>
        </div>
      </div>
    </div>
  );
}
