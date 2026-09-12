import React, { useState, useEffect, useMemo } from 'react';
import { useI18n } from '../../../i18n/index';
import { useSettingsStore } from '../../../store/settingsStore';
import { useFormat } from '../../../core/hooks/useFormat';

/**
 * SalaryCountdown — Premium real-time countdown widget.
 * Shows days, hours, minutes, seconds until next payday.
 * Uses firstDayOfMonth as the salary day.
 */
export function SalaryCountdown() {
  const { t, language } = useI18n();
  const { fmtDate } = useFormat();
  const firstDayOfMonth = useSettingsStore((s) => s.firstDayOfMonth);
  const salaryDay = firstDayOfMonth || 1;

  const [now, setNow] = useState(() => new Date());

  // Tick every second
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Calculate next payday
  const nextPayday = useMemo(() => {
    const year = now.getFullYear();
    const month = now.getMonth();
    const day = now.getDate();

    // If today is before salary day, payday is this month
    // If today is salary day or after, payday is next month
    if (day < salaryDay) {
      return new Date(year, month, salaryDay, 0, 0, 0, 0);
    } else {
      return new Date(year, month + 1, salaryDay, 0, 0, 0, 0);
    }
  }, [now, salaryDay]);

  // Calculate next payday weekday name dynamically based on user language
  const dayName = useMemo(() => {
    try {
      return nextPayday.toLocaleDateString(language, { weekday: 'long' });
    } catch {
      return nextPayday.toLocaleDateString('ar', { weekday: 'long' });
    }
  }, [nextPayday, language]);

  // Calculate remaining time
  const diffMs = Math.max(0, nextPayday.getTime() - now.getTime());
  const totalSeconds = Math.floor(diffMs / 1000);

  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const isToday = now.getDate() === salaryDay;

  // Progress: how far through the month we are (30 day cycle)
  const totalCycleDays = 30;
  const elapsed = totalCycleDays - days;
  const pct = Math.min(100, Math.max(0, (elapsed / totalCycleDays) * 100));

  // Circular progress for the ring
  const circumference = 2 * Math.PI * 54; // r=54
  const strokeOffset = circumference - (pct / 100) * circumference;

  // Format number with leading zero
  const pad = (n: number) => n.toString().padStart(2, '0');

  // Urgency color based on days remaining
  const urgencyGradient = days <= 3
    ? 'from-emerald-400 via-green-500 to-emerald-600'
    : days <= 7
      ? 'from-blue-400 via-cyan-500 to-teal-500'
      : days <= 14
        ? 'from-violet-400 via-purple-500 to-indigo-600'
        : 'from-slate-400 via-slate-500 to-slate-600';

  const ringColor = days <= 3
    ? 'stroke-emerald-500'
    : days <= 7
      ? 'stroke-cyan-500'
      : days <= 14
        ? 'stroke-violet-500'
        : 'stroke-slate-400';

  const glowColor = days <= 3
    ? 'from-emerald-500/30 to-green-500/10'
    : days <= 7
      ? 'from-cyan-500/30 to-blue-500/10'
      : days <= 14
        ? 'from-violet-500/30 to-purple-500/10'
        : 'from-slate-500/10 to-slate-500/5';

  return (
    <div className="bg-white/50 dark:bg-white/[0.03] backdrop-blur-xl rounded-[2.5rem] p-6 border border-white/30 dark:border-white/[0.06] shadow-[0_8px_40px_0_rgba(31,38,135,0.04)] overflow-hidden relative group">
      {/* Animated background glow */}
      <div className={`absolute -top-12 -right-12 w-42 h-42 bg-gradient-to-br ${glowColor} rounded-full blur-3xl opacity-60 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none`} />
      <div className={`absolute -bottom-8 -left-8 w-32 h-32 bg-gradient-to-tr ${glowColor} rounded-full blur-3xl opacity-40 group-hover:opacity-80 transition-opacity duration-700 pointer-events-none`} />

      {/* Header */}
      <div className="flex items-center gap-3.5 mb-6 relative z-10">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-green-600 to-emerald-400 flex items-center justify-center shadow-lg shadow-green-500/25 transition-transform duration-500 group-hover:rotate-12">
          <span className="material-symbols-outlined text-white text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>payments</span>
        </div>
        <div>
          <h3 className="text-base font-black text-slate-800 dark:text-white tracking-wide leading-tight">
            {t('home.salaryCountdown') || 'العد التنازلي للراتب'}
          </h3>
          <p className="text-xs font-bold text-slate-400 dark:text-slate-500 mt-0.5 flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px] text-slate-400 dark:text-slate-500">calendar_month</span>
            {t('home.nextPayday') || 'يوم الصرف'}: <span className="text-emerald-600 dark:text-emerald-400 font-extrabold">{dayName}</span>، {fmtDate(nextPayday)}
          </p>
        </div>
      </div>

      {isToday ? (
        /* ─── Payday Celebration ─── */
        <div className="text-center py-8 relative z-10">
          <div className="relative inline-block">
            <div className="absolute inset-0 bg-gradient-to-r from-green-400 to-emerald-500 blur-2xl opacity-45 animate-pulse rounded-full" />
            <div className="relative w-26 h-26 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center mx-auto shadow-2xl shadow-green-500/35">
              <span className="text-6xl animate-bounce">🎉</span>
            </div>
          </div>
          <p className="text-3xl font-black bg-gradient-to-r from-green-600 to-emerald-500 bg-clip-text text-transparent mt-5">
            {t('home.salaryToday') || 'يوم الراتب!'}
          </p>
          <p className="text-xs font-black text-slate-400 dark:text-slate-500 mt-1.5 uppercase tracking-widest">
            {t('home.salaryTodayDesc') || 'مبروك!'}
          </p>
        </div>
      ) : (
        /* ─── Countdown Display ─── */
        <div className="relative z-10">
          {/* Central ring + days */}
          <div className="flex items-center gap-6 mb-6">
            {/* Circular Progress Ring */}
            <div className="relative w-[130px] h-[130px] flex-shrink-0">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                {/* Background ring */}
                <circle
                  cx="60" cy="60" r="54"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="6"
                  className="text-slate-100 dark:text-white/[0.04]"
                />
                {/* Progress ring */}
                <circle
                  cx="60" cy="60" r="54"
                  fill="none"
                  strokeWidth="6"
                  strokeLinecap="round"
                  className={`${ringColor} transition-all duration-1000 ease-out`}
                  style={{
                    strokeDasharray: circumference,
                    strokeDashoffset: strokeOffset,
                  }}
                />
              </svg>
              {/* Center content */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-5xl font-black bg-gradient-to-b from-amber-400 via-orange-400 to-yellow-600 bg-clip-text text-transparent leading-none">
                  {days}
                </span>
                <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mt-1">
                  {t('home.days') || 'يوم'}
                </span>
              </div>
            </div>

            {/* Time Units: Hours, Minutes, Seconds */}
            <div className="flex-1 grid grid-cols-3 gap-2.5">
              {/* Hours */}
              <div className="text-center group/unit">
                <div className="bg-purple-500/[0.03] dark:bg-purple-500/[0.05] backdrop-blur-sm border border-purple-500/10 rounded-[1.25rem] py-3.5 px-1 relative overflow-hidden transition-all duration-300 hover:scale-105 hover:shadow-[0_4px_12px_rgba(147,51,234,0.06)]">
                  <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent dark:from-white/[0.01] dark:to-transparent pointer-events-none" />
                  <span className="text-3xl font-black bg-gradient-to-b from-violet-400 via-purple-500 to-fuchsia-500 bg-clip-text text-transparent leading-none relative z-10 tabular-nums">
                    {pad(hours)}
                  </span>
                </div>
                <span className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mt-2 block">
                  {t('home.hours') || 'ساعة'}
                </span>
              </div>

              {/* Minutes */}
              <div className="text-center group/unit">
                <div className="bg-blue-500/[0.03] dark:bg-blue-500/[0.05] backdrop-blur-sm border border-blue-500/10 rounded-[1.25rem] py-3.5 px-1 relative overflow-hidden transition-all duration-300 hover:scale-105 hover:shadow-[0_4px_12px_rgba(59,130,246,0.06)]">
                  <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent dark:from-white/[0.01] dark:to-transparent pointer-events-none" />
                  <span className="text-3xl font-black bg-gradient-to-b from-sky-400 via-blue-500 to-indigo-500 bg-clip-text text-transparent leading-none relative z-10 tabular-nums">
                    {pad(minutes)}
                  </span>
                </div>
                <span className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mt-2 block">
                  {t('home.minutes') || 'دقيقة'}
                </span>
              </div>

              {/* Seconds */}
              <div className="text-center group/unit">
                <div className="bg-red-500/[0.03] dark:bg-red-500/[0.05] backdrop-blur-sm border border-red-500/10 rounded-[1.25rem] py-3.5 px-1 relative overflow-hidden transition-all duration-300 hover:scale-105 hover:shadow-[0_4px_12px_rgba(239,68,68,0.06)]">
                  <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent dark:from-white/[0.01] dark:to-transparent pointer-events-none" />
                  <span className="text-3xl font-black bg-gradient-to-b from-rose-400 via-red-500 to-orange-500 bg-clip-text text-transparent leading-none relative z-10 tabular-nums animate-pulse">
                    {pad(seconds)}
                  </span>
                </div>
                <span className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mt-2 block">
                  {t('home.seconds') || 'ثانية'}
                </span>
              </div>
            </div>
          </div>

          {/* Linear progress bar */}
          <div className="relative mt-2">
            <div className="h-2.5 bg-slate-100/60 dark:bg-white/[0.03] rounded-full overflow-hidden backdrop-blur-sm">
              <div
                className={`h-full bg-gradient-to-r ${urgencyGradient} rounded-full transition-all duration-1000 ease-out relative`}
                style={{ width: `${pct}%` }}
              >
                {/* Shimmer effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
              </div>
            </div>
            {/* Progress labels */}
            <div className="flex justify-between mt-2 px-0.5">
              <span className="text-[9px] font-black text-slate-400 dark:text-slate-500">
                {Math.round(pct)}%
              </span>
              <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500">
                {t('home.salaryDay') || 'يوم الصرف'} {salaryDay}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
