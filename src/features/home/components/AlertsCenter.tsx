import React, { useState } from 'react';
import { useI18n } from '../../../i18n/index';
import { useFormat } from '../../../core/hooks/useFormat';

import type { AnomalyItem, PredictionInfo } from '../hooks/useHomeData';

interface AlertsCenterProps {
  anomalies: AnomalyItem[];
  balance: number;
  prediction?: PredictionInfo | null;
}

export function AlertsCenter({ anomalies, balance, prediction }: AlertsCenterProps) {
  const { t } = useI18n();
  const { fmtShort } = useFormat();
  const [isExpanded, setIsExpanded] = useState(false);

  const alertsCount = anomalies.length + (balance < 0 ? 1 : 0) + (balance >= 0 && (prediction?.predictedBalance ?? 0) < 0 ? 1 : 0);

  if (alertsCount === 0) {
    return (
      <div className="bg-emerald-50/50 dark:bg-emerald-900/10 rounded-[32px] p-5 shadow-sm border border-emerald-100/50 dark:border-emerald-900/20 flex flex-col items-center justify-center transition-all duration-300">
        <span className="material-symbols-outlined text-4xl text-emerald-400 dark:text-emerald-500 mb-2 drop-shadow-sm">check_circle</span>
        <h3 className="font-black text-sm uppercase tracking-tighter text-emerald-800 dark:text-emerald-200">
          {t('home.alertsTitle')}
        </h3>
        <p className="text-[10px] font-bold text-emerald-600/70 dark:text-emerald-400/70 uppercase tracking-widest mt-1">
          {t('home.noAlerts') || 'لا توجد تنبيهات'}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-[32px] p-5 shadow-xl border border-black/5 dark:border-white/5 transition-all duration-300">
      <button 
        className="w-full flex items-center justify-between cursor-pointer group outline-none"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-4">
          <div className="relative w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center">
            <span className="material-symbols-outlined text-amber-500 text-2xl group-hover:scale-110 transition-transform">notifications_active</span>
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-white dark:border-slate-800 animate-pulse">
              {alertsCount}
            </span>
          </div>
          <div className="text-left">
            <h3 className="font-black text-sm uppercase tracking-tighter text-slate-800 dark:text-slate-200">
              {t('home.alertsTitle')}
            </h3>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
              {t('home.alertsSubtitle', { n: String(alertsCount) })}
            </p>
          </div>
        </div>
        <span className={`material-symbols-outlined text-slate-300 group-hover:text-slate-500 transition-all ${isExpanded ? 'rotate-180' : ''}`}>
          expand_more
        </span>
      </button>

      {isExpanded && (
        <div className="mt-5 space-y-3 animate-in slide-in-from-top-2 duration-300">
          {anomalies.map((a, i) => (
            <div key={i} className="flex items-start gap-4 p-4 rounded-2xl bg-red-50/50 dark:bg-red-900/10 border border-red-100/50 dark:border-red-900/30">
              <span className="material-symbols-outlined text-red-500 text-xl">warning</span>
              <p className="text-xs text-red-700 dark:text-red-300 font-bold leading-relaxed">
                {t('home.anomalySpendUp', { cat: t(`category.${a.category}`) || a.category, pct: String(a.increase) })}
              </p>
            </div>
          ))}
          
          {balance < 0 && (
            <div className="flex items-start gap-4 p-4 rounded-2xl bg-red-50/50 dark:bg-red-900/10 border border-red-100/50 dark:border-red-900/30">
              <span className="material-symbols-outlined text-red-500 text-xl">error</span>
              <p className="text-xs text-red-700 dark:text-red-300 font-black leading-relaxed">
                {t('home.alertNegBalance', { amount: fmtShort(balance), curr: '' })}
              </p>
            </div>
          )}

          {balance >= 0 && (prediction?.predictedBalance ?? 0) < 0 && (
            <div className="flex items-start gap-4 p-4 rounded-2xl bg-amber-50/50 dark:bg-amber-900/10 border border-amber-100/50 dark:border-amber-900/30">
              <span className="material-symbols-outlined text-amber-500 text-xl">info</span>
              <p className="text-xs text-amber-700 dark:text-amber-300 font-bold leading-relaxed">
                {t('home.alertForecast')}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
