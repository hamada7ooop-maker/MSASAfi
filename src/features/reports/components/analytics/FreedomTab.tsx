import React from 'react';
import { useI18n } from '../../../../i18n/index';
import { useFormat } from '../../../../core/hooks/useFormat';
import type { calculateFreedomData } from '../../utils/analyticsMath';

interface FreedomTabProps {
  freedomData: ReturnType<typeof calculateFreedomData>;
  totalWealth: number;
}

/** Financial-independence tab: score gauge, safety months, wealth summary. */
export function FreedomTab({ freedomData, totalWealth }: FreedomTabProps) {
  const { t } = useI18n();
  const { fmt, getCurrencySymbol } = useFormat();

  return (
  <div className="space-y-6 animate-in fade-in duration-300">
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
      {/* Score Gauge */}
      <div className="flex flex-col items-center justify-center p-6 bg-slate-50/50 dark:bg-slate-800/20 border border-slate-100 dark:border-white/5 rounded-[2rem] space-y-4">
        <h4 className="text-xs font-black text-[#002b59] dark:text-blue-100 flex items-center gap-1.5 self-start">
          <span className="material-symbols-outlined text-emerald-500 text-sm">account_balance</span>
          {t('analytics.freedom.score') || 'درجة الحرية المالية'}
        </h4>

        <div className="relative w-36 h-36 flex items-center justify-center">
          {/* Progress Ring */}
          <svg className="w-full h-full transform -rotate-90">
            <circle
              cx="72"
              cy="72"
              r="64"
              className="stroke-slate-200 dark:stroke-slate-800 fill-none"
              strokeWidth="12"
            />
            <circle
              cx="72"
              cy="72"
              r="64"
              className="stroke-emerald-500 fill-none transition-all duration-1000 ease-out"
              strokeWidth="12"
              strokeDasharray={402}
              strokeDashoffset={402 - (402 * freedomData.score) / 100}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute flex flex-col items-center">
            <span className="text-2xl font-black text-[#002b59] dark:text-blue-100">
              {freedomData.score.toFixed(1)}%
            </span>
            <span className="text-[9px] text-slate-400 font-bold uppercase">{t('analytics.freedom.independenceScore')}</span>
          </div>
        </div>

        <p className="text-[10px] text-slate-400 font-bold text-center leading-relaxed max-w-xs">
          {t('analytics.freedom.desc') || 'مبني على قاعدة الـ 4% (العيش من عوائد 25 ضعف مصاريفك السنوية).'}
        </p>
      </div>

      {/* Security Months Indicator */}
      <div className="space-y-4">
        <div className="p-5 bg-emerald-500/10 border border-emerald-500/20 rounded-[2rem] flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-lg shadow-emerald-500/20">
            <span className="material-symbols-outlined text-2xl">shield</span>
          </div>
          <div>
            <span className="text-[10px] text-emerald-500 font-black uppercase tracking-widest block">
              {t('analytics.freedom.months') || 'أشهر الأمان المالي'}
            </span>
            <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
              {freedomData.monthsOfSecurity.toFixed(1)} <span className="text-xs font-bold text-slate-400">{t('analytics.freedom.monthsSuffix')}</span>
            </p>
            <p className="text-[9px] text-slate-400 font-bold mt-0.5">
              {t('analytics.freedom.monthsDesc') || 'الفترة التي يمكنك العيش فيها دون دخل بناءً على ثروتك الحالية.'}
            </p>
          </div>
        </div>

        {/* Wealth Summary Cards */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-slate-50/50 dark:bg-slate-800/20 border border-slate-100 dark:border-white/5 rounded-2xl space-y-1">
            <span className="text-[9px] text-slate-400 font-bold block">{t('analytics.freedom.totalWealth')}</span>
            <span className="text-sm font-black text-[#002b59] dark:text-blue-100 block">
              {fmt(totalWealth)} {getCurrencySymbol()}
            </span>
          </div>
          <div className="p-4 bg-slate-50/50 dark:bg-slate-800/20 border border-slate-100 dark:border-white/5 rounded-2xl space-y-1">
            <span className="text-[9px] text-slate-400 font-bold block">{t('analytics.freedom.targetCapital')}</span>
            <span className="text-sm font-black text-[#002b59] dark:text-blue-100 block">
              {fmt(freedomData.requiredCapital)} {getCurrencySymbol()}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
  );
}
