import React from 'react';
import { useI18n } from '../../../i18n/index';
import { useFormat } from '../../../core/hooks/useFormat';

import type { SmartRecommendation } from '@/types';

interface InsightsProps {
  recommendations: SmartRecommendation[];
  monthlyStats: { income: number; expense: number; count: number };
}

/**
 * Insights Component - Displays smart recommendations and pacing.
 */
export function Insights({ recommendations, monthlyStats }: InsightsProps) {
  const { t } = useI18n();
  const { fmt } = useFormat();

  if (!recommendations || recommendations.length === 0) return null;

  const priorityStyles = {
    high:   { bg: 'from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/10', border: 'border-red-100 dark:border-red-900/30', dot: 'bg-red-500' },
    medium: { bg: 'from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/10', border: 'border-amber-100 dark:border-amber-900/30', dot: 'bg-amber-400' },
    low:    { bg: 'from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/10', border: 'border-blue-100 dark:border-blue-900/30', dot: 'bg-blue-400' },
  };

  return (
    <div className="fin-card p-6 mb-6">
      <div className="flex items-center gap-2 mb-6">
        <span className="material-symbols-outlined text-indigo-500">auto_awesome</span>
        <h3 className="font-black text-sm uppercase tracking-tighter">{t('home.insightsTitle')}</h3>
      </div>

      <div className="space-y-3">
        {recommendations.map((r, idx) => {
          const style = priorityStyles[r.priority as keyof typeof priorityStyles] || priorityStyles.low;
          
          return (
            <div 
              key={r.id || idx}
              className={`bg-gradient-to-r ${style.bg} border ${style.border} rounded-2xl p-4 flex items-center gap-3 active:scale-[0.98] transition-all cursor-pointer group`}
            >
              <div className="relative w-10 h-10 rounded-xl bg-white/80 dark:bg-black/40 flex items-center justify-center text-xl flex-shrink-0 shadow-sm group-hover:scale-110 transition-transform">
                <span aria-hidden="true">{r.icon}</span>
                <span className={`absolute -top-1 -right-1 w-3 h-3 rounded-full ${style.dot} border-2 border-white dark:border-slate-900`}></span>
              </div>
              
              <div className="flex-1 min-w-0">
                <p className="font-black text-sm text-slate-800 dark:text-white leading-snug">{r.title}</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug font-medium">{r.body}</p>
              </div>
              
              {r.action && (
                <span className="material-symbols-outlined text-slate-300 dark:text-slate-600 text-lg flex-shrink-0 group-hover:translate-x-1 transition-transform">
                  chevron_right
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Daily Pacing (Optional addition to make it more useful) */}
      {monthlyStats.expense > 0 && (
        <div className="mt-6 pt-6 border-t border-black/5 dark:border-white/5 flex justify-around">
          <div className="text-center">
            <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">{t('home.dailyAvg')}</p>
            <p className="text-sm font-black text-slate-700 dark:text-white">{fmt(Math.round(monthlyStats.expense / new Date().getDate()))}</p>
          </div>
          <div className="w-px h-8 bg-black/5 dark:border-white/5"></div>
          <div className="text-center">
            <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">{t('home.weeklyAvg')}</p>
            <p className="text-sm font-black text-slate-700 dark:text-white">{fmt(Math.round(monthlyStats.expense / Math.ceil(new Date().getDate() / 7)))}</p>
          </div>
        </div>
      )}
    </div>
  );
}
