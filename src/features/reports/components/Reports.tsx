import React from 'react';
import { useReportsData } from '../hooks/useReportsData';
import { ErrorState } from '../../../components/common/ErrorState';
import { useI18n } from '../../../i18n/index';
import { useAppStore } from '../../../store/appStore';
import { useShallow } from 'zustand/react/shallow';
import { ReportsSummary } from './ReportsSummary';
import { ReportsTrend } from './ReportsTrend';
import { ReportsWeeklyBrief } from './ReportsWeeklyBrief';
import { ReportsTopExpenses } from './ReportsTopExpenses';
import { ReportsExports } from './ReportsExports';
import { DashboardCharts } from '../../home/components/DashboardCharts';
import { AdvancedAnalytics } from './AdvancedAnalytics';

/**
 * Reports Component - React port of the legacy Reports page.
 */
export function Reports() {
  const { 
    monthlyStats, 
    prevStats, 
    last6Months, 
    topExpenses, 
    weeklyStats, 
    categoryBreakdown,
    isLoading,
    error,
    retry 
  } = useReportsData();
  
  const { t } = useI18n();
  const { reportPeriod, setReportPeriod, customRange, setCustomRange } = useAppStore(
    useShallow((s) => ({
      reportPeriod: s.reportPeriod,
      setReportPeriod: s.setReportPeriod,
      customRange: s.customRange,
      setCustomRange: s.setCustomRange
    }))
  );

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="w-12 h-12 border-4 border-blue-600/20 border-t-blue-600 rounded-full animate-spin"></div>
        <p className="text-slate-400 font-bold animate-pulse">{t('misc.loading')}</p>
      </div>
    );
  }

  // Directive 16: all-zero stats are valid ("no activity") — but only when the
  // aggregation actually ran. On failure, say so instead of showing zeros.
  if (error) return <ErrorState onRetry={retry} />;

  return (
    <div className="p-5 space-y-6 pb-32 animate-in fade-in duration-700">
      <div className="flex items-center justify-between px-1">
        <div className="space-y-1">
          <h2 className="text-3xl text-premium-header text-[var(--color-primary)] dark:text-blue-100">
            {t('report.title')}
          </h2>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest opacity-70">
              {t('report.analyticsActive') || 'Financial Intelligence Active'}
            </p>
          </div>
        </div>
        
        <div className="flex gap-1 bg-surface-container-low dark:bg-slate-800/50 p-1.5 rounded-[1.25rem] border border-black/5 dark:border-white/5">
          {(['monthly', 'yearly', 'custom'] as const).map(p => (
            <button
              key={p}
              onClick={() => setReportPeriod(p)}
              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                reportPeriod === p 
                ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-300 shadow-md' 
                : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              {t(`report.${p}`)}
            </button>
          ))}
        </div>
      </div>

      {reportPeriod === 'custom' && (
        <div className="fin-card p-6 space-y-4 animate-in slide-in-from-top-4 duration-300">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-2 block px-1">{t('currency.fromLabel')}</label>
              <input 
                type="date" 
                className="w-full bg-surface-container-low dark:bg-slate-900 p-4 rounded-2xl border-none text-sm focus:ring-2 ring-blue-500/20 dark:text-white transition-all"
                value={customRange?.from || ''}
                onChange={(e) => setCustomRange({ ...customRange!, from: e.target.value })}
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-2 block px-1">{t('currency.toLabel')}</label>
              <input 
                type="date" 
                className="w-full bg-surface-container-low dark:bg-slate-900 p-4 rounded-2xl border-none text-sm focus:ring-2 ring-blue-500/20 dark:text-white transition-all"
                value={customRange?.to || ''}
                onChange={(e) => setCustomRange({ ...customRange!, to: e.target.value })}
              />
            </div>
          </div>
        </div>
      )}

      <ReportsSummary 
        stats={monthlyStats} 
        prevStats={prevStats} 
      />

      <ReportsTrend data={last6Months} />

      <ReportsWeeklyBrief stats={weeklyStats} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="fin-card p-7">
          <h3 className="text-premium-header text-[10px] uppercase tracking-widest text-slate-400 mb-8">{t('report.categoryBreakdown')}</h3>
          <DashboardCharts categoryBreakdown={categoryBreakdown} monthlyStats={monthlyStats} />
        </div>
        <ReportsTopExpenses expenses={topExpenses} />
      </div>

      <AdvancedAnalytics />

      <ReportsExports />
    </div>
  );
}
