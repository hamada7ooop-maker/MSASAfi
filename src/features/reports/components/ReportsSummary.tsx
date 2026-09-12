import React from 'react';
import { useI18n } from '../../../i18n/index';
import { useFormat } from '../../../core/hooks/useFormat';

interface ReportsSummaryProps {
  stats: { income: number; expense: number; count: number };
  prevStats: { income: number; expense: number; count: number } | null;
}

export function ReportsSummary({ stats, prevStats }: ReportsSummaryProps) {
  const { t } = useI18n();
  const { fmtShort, getCurrencySymbol } = useFormat();

  const savingsRate = stats.income > 0 ? Math.round(((stats.income - stats.expense) / stats.income) * 100) : 0;
  const expenseChange = prevStats && prevStats.expense > 0 
    ? Math.round(((stats.expense - prevStats.expense) / prevStats.expense) * 100) 
    : 0;

  const savingsVerdict = savingsRate >= 20 
    ? { icon: 'verified', text: t('report.rateExcellent'), color: 'text-emerald-400' } 
    : savingsRate >= 10 
    ? { icon: 'thumb_up', text: t('report.rateGood'), color: 'text-blue-300' } 
    : { icon: 'warning', text: t('report.ratePoor'), color: 'text-amber-300' };

  return (
    <div className="space-y-4">
      {/* Savings Rate Card */}
      <div className="relative overflow-hidden rounded-[32px] p-8 text-white bg-gradient-to-br from-indigo-600 to-blue-700 shadow-xl border border-white/10 group">
        <div className="absolute -top-12 -right-12 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
        <div className="relative z-10">
          <p className="text-[10px] uppercase tracking-[0.3em] opacity-80 font-black mb-2">{t('report.savingsRate')}</p>
          <h3 className="text-5xl font-black tracking-tighter mb-4 tabular-nums">{savingsRate}%</h3>
          
          <div className={`flex items-center gap-2 text-sm font-bold ${savingsVerdict.color}`}>
            <span className="material-symbols-outlined text-base">{savingsVerdict.icon}</span>
            {savingsVerdict.text}
          </div>

          <div className="mt-6 h-2 bg-white/20 rounded-full overflow-hidden">
            <div 
              className="h-full bg-white transition-all duration-1000 ease-out" 
              style={{ width: `${Math.min(Math.max(savingsRate, 0), 100)}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Comparison Row */}
      <div className="bg-white dark:bg-slate-800 p-6 rounded-[32px] shadow-sm border border-black/5 dark:border-white/5">
        <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined text-blue-600 text-lg">compare_arrows</span>
          {t('report.monthComparison')}
        </h3>

        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-black/5 dark:border-white/5">
            <p className="text-[10px] font-black text-slate-400 uppercase mb-2">{t('report.thisMonth')}</p>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-black text-slate-800 dark:text-white tabular-nums">{fmtShort(stats.expense)}</span>
              <span className="text-[10px] font-bold text-slate-400">{getCurrencySymbol()}</span>
            </div>
            <div className={`mt-2 flex items-center gap-1 text-[11px] font-black ${
              expenseChange > 0 ? 'text-rose-500' : expenseChange < 0 ? 'text-emerald-500' : 'text-slate-400'
            }`}>
              <span className="material-symbols-outlined text-xs">
                {expenseChange > 0 ? 'trending_up' : expenseChange < 0 ? 'trending_down' : 'trending_flat'}
              </span>
              <span className="tabular-nums">{Math.abs(expenseChange)}%</span>
            </div>
          </div>

          <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-black/5 dark:border-white/5 opacity-80">
            <p className="text-[10px] font-black text-slate-400 uppercase mb-2">{t('report.lastMonth')}</p>
            <div className="flex items-baseline gap-1">
              <span className="text-xl font-black text-slate-800 dark:text-white tabular-nums">{fmtShort(prevStats?.expense || 0)}</span>
              <span className="text-[10px] font-bold text-slate-400">{getCurrencySymbol()}</span>
            </div>
            <p className="mt-2 text-[10px] font-bold text-slate-400">
               {prevStats ? t('misc.prevMonth') : '---'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
