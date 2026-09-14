import React from 'react';
import { useI18n } from '../../../i18n/index';
import { useFormat } from '../../../core/hooks/useFormat';
import type { NecessityStats } from './RetirementSimulator';

export interface NecessityBreakdownProps {
  /** Need-vs-want totals and percentages, computed by useAdvisorData. */
  necessityStats: NecessityStats;
}

/**
 * The need-vs-want spending split, with its bar, legend and the automated
 * recommendation beneath it.
 *
 * Presentation only -- extracted from AdvisorPage.tsx as part of L-1. Every
 * figure arrives already computed in `necessityStats`; nothing is re-derived
 * here, so the page and this section cannot disagree about the same split.
 */
export function NecessityBreakdown({ necessityStats }: NecessityBreakdownProps) {
  const { t, isRTL } = useI18n();
  const { fmt, getCurrencySymbol } = useFormat();

  return (
    <>
      {/* Necessity Analytics (Need vs Want) */}
      <section className="space-y-4">
        <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] px-2">
          {t('txn.necessity') || (isRTL ? 'نوع الإنفاق' : 'Spending Type')}
        </h4>
        <div className="bg-white/40 dark:bg-[#1e2124]/40 backdrop-blur-xl rounded-[2.5rem] p-7 shadow-xl shadow-blue-900/5 border border-white/20 dark:border-white/5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:scale-125 transition-transform duration-700">
             <span className="material-symbols-outlined" style={{ fontSize: '80px' }}>balance</span>
          </div>
          
          <div className="relative z-10 space-y-6">
            {/* Header / Summary */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 text-emerald-500 dark:text-emerald-400">
                <span className="material-symbols-outlined">donut_large</span>
                <span className="text-xs font-black uppercase tracking-widest">
                  {t('advisor.budgetAllocation')}
                </span>
              </div>
              <span className="text-[10px] font-black px-3 py-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                {t('advisor.realtimeAnalysis')}
              </span>
            </div>

            {/* Split Progress Bar */}
            <div className="space-y-3">
              <div className="h-6 w-full bg-slate-200/50 dark:bg-slate-800/40 rounded-full overflow-hidden flex p-1 border border-black/5 dark:border-white/5 backdrop-blur-sm">
                {necessityStats.total > 0 ? (
                  <>
                    <div 
                      style={{ width: `${necessityStats.needPct}%` }}
                      className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 dark:from-emerald-400 dark:to-teal-400 rounded-full transition-all duration-1000 ease-out min-w-[20px]"
                    />
                    <div className="w-1" />
                    <div 
                      style={{ width: `${necessityStats.wantPct}%` }}
                      className="h-full bg-gradient-to-r from-amber-500 to-rose-500 dark:from-amber-400 dark:to-rose-400 rounded-full transition-all duration-1000 ease-out min-w-[20px]"
                    />
                  </>
                ) : (
                  <div className="w-full h-full bg-slate-300 dark:bg-slate-700 rounded-full animate-pulse" />
                )}
              </div>

              {/* Legend & Stats */}
              <div className="grid grid-cols-2 gap-4 pt-2">
                {/* Needs Info */}
                <div className="flex items-start gap-3 p-3 rounded-2xl bg-white/50 dark:bg-black/10 border border-white/40 dark:border-white/5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                    <span className="material-symbols-outlined text-base">verified_user</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-1">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider truncate">
                        {t('txn.necessity.need')}
                      </span>
                      <span className="text-xs font-black text-emerald-500 tabular-nums">
                        {fmt(necessityStats.needPct)}%
                      </span>
                    </div>
                    <p className="text-sm font-black text-slate-800 dark:text-slate-100 mt-1 tabular-nums truncate">
                      {fmt(necessityStats.need)} <span className="text-[10px] font-bold text-slate-400">{getCurrencySymbol()}</span>
                    </p>
                  </div>
                </div>

                {/* Wants Info */}
                <div className="flex items-start gap-3 p-3 rounded-2xl bg-white/50 dark:bg-black/10 border border-white/40 dark:border-white/5">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                    <span className="material-symbols-outlined text-base">local_mall</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-1">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider truncate">
                        {t('txn.necessity.want')}
                      </span>
                      <span className="text-xs font-black text-amber-500 tabular-nums">
                        {fmt(necessityStats.wantPct)}%
                      </span>
                    </div>
                    <p className="text-sm font-black text-slate-800 dark:text-slate-100 mt-1 tabular-nums truncate">
                      {fmt(necessityStats.want)} <span className="text-[10px] font-bold text-slate-400">{getCurrencySymbol()}</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Smart Automated Recommendation */}
            <div className="p-4 rounded-2xl bg-blue-500/5 border border-blue-500/10 flex gap-3 items-start">
              <span className="material-symbols-outlined text-blue-500 text-lg mt-0.5 animate-bounce">
                lightbulb
              </span>
              <div className="flex-1 space-y-1">
                <h6 className="text-[10px] font-black text-blue-500 uppercase tracking-widest">
                  {t('advisor.recommendation')}
                </h6>
                <p className="text-xs font-medium text-slate-600 dark:text-slate-300 leading-relaxed">
                  {(() => {
                    if (necessityStats.total === 0) {
                      return t('advisor.noExpensesYet');
                    }
                    if (necessityStats.wantPct > 30) {
                      return t('advisor.highLuxury').replace('{pct}', fmt(necessityStats.wantPct));
                    }
                    if (necessityStats.needPct > 70) {
                      return t('advisor.highNecessity').replace('{pct}', fmt(70));
                    }
                    return t('advisor.balanced');
                  })()}
                </p>
              </div>
            </div>

          </div>
        </div>
      </section>
    </>
  );
}
