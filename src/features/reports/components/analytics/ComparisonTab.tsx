import React from 'react';
import { useI18n } from '../../../../i18n/index';
import { useFormat } from '../../../../core/hooks/useFormat';
import type { calculatePeriodComparison } from '../../utils/analyticsMath';

interface ComparisonTabProps {
  comparisonData: ReturnType<typeof calculatePeriodComparison>;
  compareStartA: string;
  setCompareStartA: (v: string) => void;
  compareEndA: string;
  setCompareEndA: (v: string) => void;
  compareStartB: string;
  setCompareStartB: (v: string) => void;
  compareEndB: string;
  setCompareEndB: (v: string) => void;
}

/** Period-comparison tab: two custom date ranges measured against each other. */
export function ComparisonTab({
  comparisonData,
  compareStartA,
  setCompareStartA,
  compareEndA,
  setCompareEndA,
  compareStartB,
  setCompareStartB,
  compareEndB,
  setCompareEndB,
}: ComparisonTabProps) {
  const { t } = useI18n();
  const { fmt, getCurrencySymbol } = useFormat();

  return (
  <div className="space-y-6 animate-in fade-in duration-300">
    {/* Custom Range Picker Grid */}
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-5 bg-slate-50/50 dark:bg-slate-800/20 border border-slate-100 dark:border-white/5 rounded-3xl">
      {/* Period A Selectors */}
      <div className="space-y-3 p-4 bg-white dark:bg-slate-800/50 rounded-2xl border border-black/5 dark:border-white/5">
        <div className="flex items-center gap-1.5 pb-2 border-b border-slate-100 dark:border-white/5">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0"></span>
          <h4 className="text-xs font-black text-slate-700 dark:text-slate-200">{t('analytics.compare.periodA')}</h4>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <label className="text-[8px] text-slate-400 font-bold block">{t('analytics.compare.fromDate')}</label>
            <input
              type="date"
              value={compareStartA}
              onChange={e => setCompareStartA(e.target.value)}
              className="w-full text-[10px] font-bold p-2 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-white/5 rounded-xl text-slate-700 dark:text-slate-200"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[8px] text-slate-400 font-bold block">{t('analytics.compare.toDate')}</label>
            <input
              type="date"
              value={compareEndA}
              onChange={e => setCompareEndA(e.target.value)}
              className="w-full text-[10px] font-bold p-2 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-white/5 rounded-xl text-slate-700 dark:text-slate-200"
            />
          </div>
        </div>
      </div>

      {/* Period B Selectors */}
      <div className="space-y-3 p-4 bg-white dark:bg-slate-800/50 rounded-2xl border border-black/5 dark:border-white/5">
        <div className="flex items-center gap-1.5 pb-2 border-b border-slate-100 dark:border-white/5">
          <span className="w-2.5 h-2.5 rounded-full bg-purple-500 shrink-0"></span>
          <h4 className="text-xs font-black text-slate-700 dark:text-slate-200">{t('analytics.compare.periodB')}</h4>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <label className="text-[8px] text-slate-400 font-bold block">{t('analytics.compare.fromDate')}</label>
            <input
              type="date"
              value={compareStartB}
              onChange={e => setCompareStartB(e.target.value)}
              className="w-full text-[10px] font-bold p-2 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-white/5 rounded-xl text-slate-700 dark:text-slate-200"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[8px] text-slate-400 font-bold block">{t('analytics.compare.toDate')}</label>
            <input
              type="date"
              value={compareEndB}
              onChange={e => setCompareEndB(e.target.value)}
              className="w-full text-[10px] font-bold p-2 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-white/5 rounded-xl text-slate-700 dark:text-slate-200"
            />
          </div>
        </div>
      </div>
    </div>

    {/* Overall Comparative Summary Cards */}
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Total Income Compare */}
      <div className="p-5 bg-white dark:bg-slate-800/40 rounded-[2rem] border border-black/5 dark:border-white/5 space-y-4">
        <div className="flex justify-between items-center">
          <span className="text-[10px] text-emerald-500 font-black flex items-center gap-1">
            <span className="material-symbols-outlined text-sm">trending_up</span>
            {t('analytics.compare.totalIncome')}
          </span>
          {(() => {
            const diff = comparisonData.periodA.income - comparisonData.periodB.income;
            const isUp = diff >= 0;
            return (
              <span className={`text-[8px] font-black px-2 py-0.5 rounded-full flex items-center gap-0.5 ${
                isUp ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'
              }`}>
                <span className="material-symbols-outlined text-[10px]">
                  {isUp ? 'arrow_upward' : 'arrow_downward'}
                </span>
                {isUp ? t('analytics.compare.increase') : t('analytics.compare.decrease')} ({fmt(Math.abs(diff))})
              </span>
            );
          })()}
        </div>
        <div className="grid grid-cols-2 gap-2 border-t border-slate-50 dark:border-white/5 pt-3">
          <div>
            <span className="text-[8px] text-slate-400 font-bold block">{t('analytics.compare.lblPeriodA')}</span>
            <span className="text-sm font-black text-[#002b59] dark:text-blue-100">
              {fmt(comparisonData.periodA.income)} {getCurrencySymbol()}
            </span>
          </div>
          <div>
            <span className="text-[8px] text-slate-400 font-bold block">{t('analytics.compare.lblPeriodB')}</span>
            <span className="text-sm font-bold text-slate-400">
              {fmt(comparisonData.periodB.income)} {getCurrencySymbol()}
            </span>
          </div>
        </div>
      </div>

      {/* Total Expense Compare */}
      <div className="p-5 bg-white dark:bg-slate-800/40 rounded-[2rem] border border-black/5 dark:border-white/5 space-y-4">
        <div className="flex justify-between items-center">
          <span className="text-[10px] text-rose-500 font-black flex items-center gap-1">
            <span className="material-symbols-outlined text-sm">trending_down</span>
            {t('analytics.compare.totalExpense')}
          </span>
          {(() => {
            const diff = comparisonData.periodA.expense - comparisonData.periodB.expense;
            const isUp = diff >= 0;
            return (
              <span className={`text-[8px] font-black px-2 py-0.5 rounded-full flex items-center gap-0.5 ${
                isUp ? 'bg-rose-500/10 text-rose-600' : 'bg-emerald-500/10 text-emerald-600'
              }`}>
                <span className="material-symbols-outlined text-[10px]">
                  {isUp ? 'arrow_upward' : 'arrow_downward'}
                </span>
                {isUp ? t('analytics.compare.increase') : t('analytics.compare.decrease')} ({fmt(Math.abs(diff))})
              </span>
            );
          })()}
        </div>
        <div className="grid grid-cols-2 gap-2 border-t border-slate-50 dark:border-white/5 pt-3">
          <div>
            <span className="text-[8px] text-slate-400 font-bold block">{t('analytics.compare.lblPeriodA')}</span>
            <span className="text-sm font-black text-[#002b59] dark:text-blue-100">
              {fmt(comparisonData.periodA.expense)} {getCurrencySymbol()}
            </span>
          </div>
          <div>
            <span className="text-[8px] text-slate-400 font-bold block">{t('analytics.compare.lblPeriodB')}</span>
            <span className="text-sm font-bold text-slate-400">
              {fmt(comparisonData.periodB.expense)} {getCurrencySymbol()}
            </span>
          </div>
        </div>
      </div>

      {/* Net Cash Flow Compare */}
      <div className="p-5 bg-white dark:bg-slate-800/40 rounded-[2rem] border border-black/5 dark:border-white/5 space-y-4">
        <div className="flex justify-between items-center">
          <span className="text-[10px] text-blue-500 font-black flex items-center gap-1">
            <span className="material-symbols-outlined text-sm">monetization_on</span>
            {t('analytics.compare.netSavings')}
          </span>
          {(() => {
            const diff = comparisonData.periodA.net - comparisonData.periodB.net;
            const isUp = diff >= 0;
            return (
              <span className={`text-[8px] font-black px-2 py-0.5 rounded-full flex items-center gap-0.5 ${
                isUp ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'
              }`}>
                <span className="material-symbols-outlined text-[10px]">
                  {isUp ? 'arrow_upward' : 'arrow_downward'}
                </span>
                {isUp ? t('analytics.compare.improvement') : t('analytics.compare.decline')} ({fmt(Math.abs(diff))})
              </span>
            );
          })()}
        </div>
        <div className="grid grid-cols-2 gap-2 border-t border-slate-50 dark:border-white/5 pt-3">
          <div>
            <span className="text-[8px] text-slate-400 font-bold block">{t('analytics.compare.lblPeriodA')}</span>
            <span className={`text-sm font-black ${
              comparisonData.periodA.net >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600'
            }`}>
              {fmt(comparisonData.periodA.net)} {getCurrencySymbol()}
            </span>
          </div>
          <div>
            <span className="text-[8px] text-slate-400 font-bold block">{t('analytics.compare.lblPeriodB')}</span>
            <span className="text-sm font-bold text-slate-400">
              {fmt(comparisonData.periodB.net)} {getCurrencySymbol()}
            </span>
          </div>
        </div>
      </div>
    </div>

    {/* Side-by-Side Category Spending breakdown */}
    <div className="p-6 bg-white dark:bg-slate-800/40 border border-slate-100 dark:border-white/5 rounded-[2rem] space-y-4">
      <div>
        <h4 className="text-xs font-black text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
          <span className="material-symbols-outlined text-amber-500 text-sm">difference</span>
          {t('analytics.compare.categoriesAnalysis')}
        </h4>
        <p className="text-[9px] text-slate-400 font-bold">
          {t('analytics.compare.categoriesAnalysisDesc')}
        </p>
      </div>

      {comparisonData.categoryComparison.length === 0 ? (
        <div className="text-center py-8 text-xs font-bold text-slate-400">
          {t('analytics.compare.noData')}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="border-b border-slate-100 dark:border-white/5 text-[9px] text-slate-400 font-bold">
                <th className="pb-3 text-right">{t('analytics.compare.category')}</th>
                <th className="pb-3 text-center">{t('analytics.compare.periodANew')}</th>
                <th className="pb-3 text-center">{t('analytics.compare.periodBRef')}</th>
                <th className="pb-3 text-center">{t('analytics.compare.difference')}</th>
                <th className="pb-3 text-center">{t('analytics.compare.changePct')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-white/5">
              {comparisonData.categoryComparison.map((item, index) => {
                const isIncrease = item.diff > 0;
                return (
                  <tr key={index} className="text-[10px] font-bold text-slate-700 dark:text-slate-200">
                    <td className="py-3 flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-[7px]">📁</span>
                      {t(`category.${item.category}`) || item.category}
                    </td>
                    <td className="py-3 text-center font-black text-[#002b59] dark:text-blue-100">
                      {fmt(item.amtA)} {getCurrencySymbol()}
                      <span className="text-[8px] text-slate-400 font-bold block">({t('analytics.compare.txSuffix', { count: item.countA })})</span>
                    </td>
                    <td className="py-3 text-center text-slate-400">
                      {fmt(item.amtB)} {getCurrencySymbol()}
                      <span className="text-[8px] text-slate-400 font-bold block">({t('analytics.compare.txSuffix', { count: item.countB })})</span>
                    </td>
                    <td className={`py-3 text-center ${isIncrease ? 'text-rose-600' : 'text-emerald-600'}`}>
                      {isIncrease ? '+' : ''}{fmt(item.diff)} {getCurrencySymbol()}
                    </td>
                    <td className="py-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[8px] font-black ${
                        isIncrease ? 'bg-rose-500/10 text-rose-600' : 'bg-emerald-500/10 text-emerald-600'
                      }`}>
                        {isIncrease ? '📈' : '📉'} {item.pctChange.toFixed(0)}%
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  </div>
  );
}
