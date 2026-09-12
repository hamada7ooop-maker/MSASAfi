import React from 'react';
import { useI18n } from '../../../i18n/index';

interface HabitStreakProps {
  streak: number;
}

export function HabitStreak({ streak }: HabitStreakProps) {
  const { t } = useI18n();

  return (
    <div className="bg-white dark:bg-slate-800 rounded-[32px] p-6 shadow-xl border border-black/5 dark:border-white/5 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center">
          <span className="material-symbols-outlined text-orange-500 text-2xl">local_fire_department</span>
        </div>
        <div>
          <h3 className="font-black text-sm uppercase tracking-tighter text-slate-800 dark:text-slate-200">
            {t('home.loggingStreak')}
          </h3>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
            {streak >= 7 ? t('home.streakGood') : t('home.streakBad')}
          </p>
        </div>
      </div>
      <div className="bg-orange-500 text-white px-4 py-2 rounded-2xl text-xs font-black shadow-lg shadow-orange-500/30 animate-pulse">
        {t('home.loggingStreakDays', { n: String(streak) })}
      </div>
    </div>
  );
}
