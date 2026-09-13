import React from 'react';
import { useI18n } from '../../../../i18n/index';
import { useFormat } from '../../../../core/hooks/useFormat';
import type {
  calculateNeedsVsWants,
  calculateWastedSpending,
  calculateMoodSpending,
  calculateTimeOfDaySpending,
  calculateSeasonalSpending,
} from '../../utils/analyticsMath';

interface AnalysisTabProps {
  needsVsWants: ReturnType<typeof calculateNeedsVsWants>;
  wastedSpending: ReturnType<typeof calculateWastedSpending>;
  moodSpending: ReturnType<typeof calculateMoodSpending>;
  dayOfWeekSpending: number[];
  daysOfWeekLabels: string[];
  maxDaySpending: number;
  timeOfDaySpending: ReturnType<typeof calculateTimeOfDaySpending>;
  seasonalSpending: ReturnType<typeof calculateSeasonalSpending>;
}

/** Expense-analysis tab: needs vs wants, waste, mood, weekday/time/season. */
export function AnalysisTab({
  needsVsWants,
  wastedSpending,
  moodSpending,
  dayOfWeekSpending,
  daysOfWeekLabels,
  maxDaySpending,
  timeOfDaySpending,
  seasonalSpending,
}: AnalysisTabProps) {
  const { t } = useI18n();
  const { fmt, getCurrencySymbol } = useFormat();

  return (
  <div className="space-y-6 animate-in fade-in duration-300">
    {/* Needs vs Wants & Wasted Rate */}
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Needs vs Wants */}
      <div className="fin-card p-5 bg-slate-50/50 dark:bg-slate-800/20 border border-slate-100 dark:border-white/5 space-y-4">
        <h4 className="text-xs font-black text-[#002b59] dark:text-blue-100 flex items-center gap-1.5">
          <span className="material-symbols-outlined text-emerald-500 text-sm">balance</span>
          {t('analytics.needsWants') || 'الضروريات مقابل الكماليات'}
        </h4>
        <div className="space-y-2">
          <div className="h-6 w-full rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden flex">
            <div
              style={{ width: `${needsVsWants.needsPct}%` }}
              className="bg-emerald-500 h-full flex items-center justify-center text-[9px] font-black text-white"
              title={t('analytics.needsLabel', { amt: fmt(needsVsWants.needs) })}
            >
              {needsVsWants.needsPct > 15 ? `${needsVsWants.needsPct.toFixed(0)}%` : ''}
            </div>
            <div
              style={{ width: `${needsVsWants.wantsPct}%` }}
              className="bg-amber-500 h-full flex items-center justify-center text-[9px] font-black text-white"
              title={t('analytics.wantsLabel', { amt: fmt(needsVsWants.wants) })}
            >
              {needsVsWants.wantsPct > 15 ? `${needsVsWants.wantsPct.toFixed(0)}%` : ''}
            </div>
          </div>
          <div className="flex justify-between text-[10px] text-slate-400 font-bold">
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>{t('analytics.needsLabel', { amt: `${fmt(needsVsWants.needs)} ${getCurrencySymbol()}` })}</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>{t('analytics.wantsLabel', { amt: `${fmt(needsVsWants.wants)} ${getCurrencySymbol()}` })}</span>
          </div>
        </div>
      </div>

      {/* Wasted Spending */}
      <div className="fin-card p-5 bg-slate-50/50 dark:bg-slate-800/20 border border-slate-100 dark:border-white/5 flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center shrink-0">
          <span className="material-symbols-outlined text-3xl">heart_broken</span>
        </div>
        <div className="space-y-1">
          <h4 className="text-xs font-black text-[#002b59] dark:text-blue-100">
            {t('analytics.wasted') || 'معدل الهدر المالي'}
          </h4>
          <p className="text-lg font-black text-red-500">
            {wastedSpending.rate.toFixed(1)}% <span className="text-xs text-slate-400">({fmt(wastedSpending.amount)} {getCurrencySymbol()})</span>
          </p>
          <p className="text-[10px] text-slate-400 font-bold leading-relaxed">
            {wastedSpending.rate > 20 
              ? t('analytics.wasted.warning')
              : t('analytics.wasted.good')}
          </p>
        </div>
      </div>
    </div>

    {/* Emotional & Mood Spending Analytics */}
    <div className="fin-card p-6 bg-slate-50/50 dark:bg-slate-800/20 border border-slate-100 dark:border-white/5 space-y-6">
      <div>
        <h4 className="text-xs font-black text-[#002b59] dark:text-blue-100 flex items-center gap-1.5">
          <span className="material-symbols-outlined text-purple-500 text-sm">psychology</span>
          {t('analytics.mood.title')}
        </h4>
        <p className="text-[10px] text-slate-400 font-bold mt-1">
          {t('analytics.mood.desc')}
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { key: 'happy', label: t('analytics.mood.happy'), data: moodSpending.moods.happy, color: 'bg-emerald-500' },
          { key: 'sad', label: t('analytics.mood.sad'), data: moodSpending.moods.sad, color: 'bg-blue-500' },
          { key: 'stressed', label: t('analytics.mood.stressed'), data: moodSpending.moods.stressed, color: 'bg-red-500' },
          { key: 'tired', label: t('analytics.mood.tired'), data: moodSpending.moods.tired, color: 'bg-amber-500' },
          { key: 'neutral', label: t('analytics.mood.neutral'), data: moodSpending.moods.neutral, color: 'bg-slate-500' }
        ].map((mObj) => {
          const pct = moodSpending.total > 0 ? (mObj.data.amount / moodSpending.total) * 100 : 0;
          return (
            <div key={mObj.key} className="p-3 bg-white dark:bg-slate-800/50 rounded-2xl border border-black/5 dark:border-white/5 space-y-2 flex flex-col justify-between">
              <div>
                <span className="text-[10px] text-slate-500 font-black block">{mObj.label}</span>
                <span className="text-xs font-black text-[#002b59] dark:text-blue-100 mt-1 block">
                  {fmt(mObj.data.amount)} {getCurrencySymbol()}
                </span>
                <span className="text-[9px] text-slate-400 font-bold block mt-0.5">
                  {t('analytics.mood.txCount', { count: mObj.data.count })}
                </span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                <div style={{ width: `${pct}%` }} className={`h-full ${mObj.color} rounded-full`}></div>
              </div>
            </div>
          );
        })}
      </div>

      {moodSpending.hasEmotionalSpending && (
        <div className="p-4 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-xs font-black text-purple-700 dark:text-purple-300 flex items-center gap-2">
          <span className="material-symbols-outlined text-lg">lightbulb</span>
          <span>
            {t('analytics.mood.insight', {
              mood: moodSpending.highestMood === 'happy'
                ? t('analytics.mood.happyWord')
                : moodSpending.highestMood === 'sad'
                ? t('analytics.mood.sadWord')
                : moodSpending.highestMood === 'stressed'
                ? t('analytics.mood.stressedWord')
                : t('analytics.mood.tiredWord')
            })}
          </span>
        </div>
      )}
    </div>

    {/* Days of Week & Times of Day */}
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Days of Week */}
      <div className="fin-card p-5 bg-slate-50/50 dark:bg-slate-800/20 border border-slate-100 dark:border-white/5 space-y-4">
        <h4 className="text-xs font-black text-[#002b59] dark:text-blue-100 flex items-center gap-1.5">
          <span className="material-symbols-outlined text-blue-500 text-sm">calendar_view_week</span>
          {t('analytics.days') || 'الإنفاق حسب أيام الأسبوع'}
        </h4>
        <div className="space-y-2">
          {daysOfWeekLabels.map((day, idx) => {
            const amt = dayOfWeekSpending[idx];
            const pct = (amt / maxDaySpending) * 100;
            return (
              <div key={day} className="space-y-1">
                <div className="flex justify-between text-[10px] font-bold">
                  <span className="text-slate-500">{day}</span>
                  <span className="text-[#002b59] dark:text-blue-200">{fmt(amt)} {getCurrencySymbol()}</span>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div
                    style={{ width: `${pct}%` }}
                    className="bg-blue-500 h-full rounded-full transition-all duration-500"
                  ></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Times of Day & Seasons */}
      <div className="space-y-6">
        {/* Times of Day */}
        <div className="fin-card p-5 bg-slate-50/50 dark:bg-slate-800/20 border border-slate-100 dark:border-white/5 space-y-4">
          <h4 className="text-xs font-black text-[#002b59] dark:text-blue-100 flex items-center gap-1.5">
            <span className="material-symbols-outlined text-amber-500 text-sm">schedule</span>
            {t('analytics.times') || 'الإنفاق حسب أوقات اليوم'}
          </h4>
          <div className="grid grid-cols-2 gap-3">
            {[
              { key: 'morning', label: t('analytics.time.morning'), val: timeOfDaySpending.morning, amt: timeOfDaySpending.amounts.morning },
              { key: 'afternoon', label: t('analytics.time.afternoon'), val: timeOfDaySpending.afternoon, amt: timeOfDaySpending.amounts.afternoon },
              { key: 'evening', label: t('analytics.time.evening'), val: timeOfDaySpending.evening, amt: timeOfDaySpending.amounts.evening },
              { key: 'night', label: t('analytics.time.night'), val: timeOfDaySpending.night, amt: timeOfDaySpending.amounts.night }
            ].map(tObj => (
              <div key={tObj.key} className="p-3 bg-white dark:bg-slate-800/50 rounded-2xl border border-black/5 dark:border-white/5 space-y-1">
                <span className="text-[10px] text-slate-400 font-bold block">{tObj.label}</span>
                <span className="text-sm font-black text-[#002b59] dark:text-blue-100 block">
                  {tObj.val.toFixed(0)}%
                </span>
                <span className="text-[9px] text-slate-400/80 font-bold block">
                  {fmt(tObj.amt)} {getCurrencySymbol()}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Seasonal Spending */}
        <div className="fin-card p-5 bg-slate-50/50 dark:bg-slate-800/20 border border-slate-100 dark:border-white/5 space-y-4">
          <h4 className="text-xs font-black text-[#002b59] dark:text-blue-100 flex items-center gap-1.5">
            <span className="material-symbols-outlined text-purple-500 text-sm">ac_unit</span>
            {t('analytics.seasons') || 'الإنفاق حسب مواسم السنة'}
          </h4>
          <div className="grid grid-cols-4 gap-2">
            {[
              { key: 'winter', val: seasonalSpending.winter },
              { key: 'spring', val: seasonalSpending.spring },
              { key: 'summer', val: seasonalSpending.summer },
              { key: 'autumn', val: seasonalSpending.autumn }
            ].map(sObj => (
              <div key={sObj.key} className="text-center space-y-1 p-2 bg-white dark:bg-slate-800/50 rounded-xl">
                <span className="text-[9px] text-slate-400 font-black block">{t(`analytics.season.${sObj.key}`)}</span>
                <span className="text-xs font-black text-[#002b59] dark:text-blue-100 block">{sObj.val.toFixed(0)}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  </div>
  );
}
