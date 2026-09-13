import React from 'react';
import { useI18n } from '../../../../i18n/index';
import { useFormat } from '../../../../core/hooks/useFormat';
import type { calculateHeatmapData } from '../../utils/analyticsMath';

type HeatmapDay = { day: number; amount: number; count: number };

interface HeatmapTabProps {
  heatmapData: ReturnType<typeof calculateHeatmapData>;
  heatmapMonth: number;
  setHeatmapMonth: (v: number) => void;
  heatmapYear: number;
  setHeatmapYear: (v: number) => void;
  selectedHeatmapDay: HeatmapDay | null;
  setSelectedHeatmapDay: (v: HeatmapDay | null) => void;
  monthsLabels: string[];
  daysOfWeekLabels: string[];
}

/** Calendar heatmap tab: per-day spending intensity for one month. */
export function HeatmapTab({
  heatmapData,
  heatmapMonth,
  setHeatmapMonth,
  heatmapYear,
  setHeatmapYear,
  selectedHeatmapDay,
  setSelectedHeatmapDay,
  monthsLabels,
  daysOfWeekLabels,
}: HeatmapTabProps) {
  const { t } = useI18n();
  const { fmt, getCurrencySymbol } = useFormat();

  return (
  <div className="space-y-6 animate-in fade-in duration-300">
    <div className="flex items-center justify-between gap-4">
      <div>
        <h4 className="text-xs font-black text-[#002b59] dark:text-blue-100 flex items-center gap-1.5">
          <span className="material-symbols-outlined text-rose-500 text-sm">calendar_month</span>
          {t('analytics.heatmap.title') || 'خريطة الإنفاق الحرارية'}
        </h4>
        <p className="text-[10px] text-slate-400 font-bold mt-1">
          {t('analytics.heatmap.desc') || 'توضيح بصري لكثافة إنفاقك اليومي على مدار الشهر.'}
        </p>
      </div>

      {/* Month Selector */}
      <div className="flex gap-2">
        <select
          value={heatmapMonth}
          onChange={(e) => {
            setHeatmapMonth(Number(e.target.value));
            setSelectedHeatmapDay(null);
          }}
          className="bg-slate-100 dark:bg-slate-800 text-xs font-black p-3.5 rounded-2xl border-none text-[#002b59] dark:text-white"
        >
          {monthsLabels.map((lbl, idx) => (
            <option key={idx} value={idx}>{lbl}</option>
          ))}
        </select>
        <select
          value={heatmapYear}
          onChange={(e) => {
            setHeatmapYear(Number(e.target.value));
            setSelectedHeatmapDay(null);
          }}
          className="bg-slate-100 dark:bg-slate-800 text-xs font-black p-3.5 rounded-2xl border-none text-[#002b59] dark:text-white"
        >
          {[2025, 2026, 2027].map(yr => (
            <option key={yr} value={yr}>{yr}</option>
          ))}
        </select>
      </div>
    </div>

    {/* Calendar Grid */}
    <div className="space-y-4">
      <div className="grid grid-cols-7 gap-2 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">
        {daysOfWeekLabels.map(d => <div key={d}>{d}</div>)}
      </div>

      <div className="grid grid-cols-7 gap-2">
        {/* Empty cells before the first day of the month */}
        {Array.from({ length: heatmapData.firstDayIndex }).map((_, i) => (
          <div key={`empty-${i}`} className="aspect-square bg-slate-50/20 dark:bg-slate-800/10 rounded-2xl border border-dashed border-slate-100 dark:border-white/5 opacity-30"></div>
        ))}

        {/* Days of the month */}
        {Array.from({ length: heatmapData.totalDays }).map((_, i) => {
          const dayNum = i + 1;
          const dayStats = heatmapData.dailySpending[dayNum] || { amount: 0, count: 0 };
          const intensity = heatmapData.maxDailySpend > 0 ? (dayStats.amount / heatmapData.maxDailySpend) : 0;

          // Determine color class based on intensity
          let bgStyle: React.CSSProperties = {};
          let borderClass = 'border-slate-100 dark:border-white/5';
          let textClass = 'text-[#002b59] dark:text-blue-100';

          if (dayStats.amount === 0) {
            bgStyle = { backgroundColor: 'transparent' };
          } else if (intensity < 0.25) {
            bgStyle = { backgroundColor: 'rgba(59, 130, 246, 0.15)' }; // Light blue
          } else if (intensity < 0.6) {
            bgStyle = { backgroundColor: 'rgba(99, 102, 241, 0.35)' }; // Indigo
          } else if (intensity < 0.9) {
            bgStyle = { backgroundColor: 'rgba(124, 58, 237, 0.6)' }; // Purple
          } else {
            bgStyle = { backgroundColor: 'rgba(244, 63, 94, 0.85)' }; // Rose
            borderClass = 'border-red-500/50 dark:border-red-400/50 animate-pulse';
            textClass = 'text-white font-black';
          }

          return (
            <button
              key={`day-${dayNum}`}
              onClick={() => setSelectedHeatmapDay({ day: dayNum, amount: dayStats.amount, count: dayStats.count })}
              style={bgStyle}
              className={`aspect-square rounded-2xl border ${borderClass} flex flex-col items-center justify-center gap-0.5 hover:scale-105 active:scale-95 transition-all relative group`}
            >
              <span className={`text-[10px] font-black ${textClass}`}>{dayNum}</span>
              {dayStats.amount > 0 && (
                <span className={`text-[8px] opacity-80 ${dayStats.amount > heatmapData.maxDailySpend * 0.9 ? 'text-white' : 'text-slate-500 dark:text-slate-400'} font-bold`}>
                  {dayStats.amount.toFixed(0)}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Day stats card */}
      {selectedHeatmapDay && (
        <div className="fin-card p-5 bg-blue-500/10 border border-blue-500/20 rounded-3xl flex items-center justify-between gap-4 animate-in slide-in-from-bottom-2 duration-300">
          <div className="space-y-1">
            <span className="text-[10px] text-blue-500 font-black uppercase tracking-widest block">
              {t('analytics.heatmap.dayDetails', { day: selectedHeatmapDay.day, month: monthsLabels[heatmapMonth], year: heatmapYear })}
            </span>
            <p className="text-xs font-bold text-slate-600 dark:text-slate-300">
              {t('analytics.heatmap.totalSpend')} <span className="text-sm font-black text-[#002b59] dark:text-blue-100">{fmt(selectedHeatmapDay.amount)} {getCurrencySymbol()}</span>
            </p>
            <p className="text-[10px] text-slate-400 font-bold">
              {t('analytics.heatmap.txCount', { count: selectedHeatmapDay.count })}
            </p>
          </div>
          <button
            onClick={() => setSelectedHeatmapDay(null)}
            className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-slate-500"
          >
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>
      )}
    </div>
  </div>
  );
}
