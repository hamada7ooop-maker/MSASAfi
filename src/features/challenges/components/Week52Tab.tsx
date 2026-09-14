import React from 'react';
import { useI18n } from '../../../i18n/index';
import { useFormat } from '../../../core/hooks/useFormat';
import { useSettingsStore } from '../../../store/settingsStore';

export interface Week52TabProps {
  /** Week numbers already banked, 1-52. Owned by the parent, which persists
   *  them to localStorage. */
  completedWeeks: number[];
  /** Arms the confirmation sheet for a week; the parent performs the deposit. */
  onRequestSaveWeek: (week: number) => void;
}

/**
 * The 52-week saver grid.
 *
 * Presentation only -- extracted from Challenges.tsx as part of L-1. It owns
 * no state: which weeks are complete, and the transaction that banks one, both
 * remain with the parent, so there is one source of truth for money movement.
 */
export function Week52Tab({ completedWeeks, onRequestSaveWeek }: Week52TabProps) {
  const { t } = useI18n();
  const { fmt } = useFormat();
  const baseCurrency = useSettingsStore((s) => s.baseCurrency);

  return (
        <div className="space-y-6 animate-in slide-in-from-right-8 duration-300">
          {/* Savings Overview Card */}
          <div className="fin-card p-6 bg-gradient-to-br from-indigo-500/10 to-purple-500/5 border border-indigo-500/10 rounded-[2.5rem]">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="space-y-1">
                <h3 className="text-lg font-black dark:text-white flex items-center gap-2">
                  {t('challenge.week52.title')}
                </h3>
                <p className="text-[10px] text-slate-400 font-bold max-w-md leading-relaxed">
                  {t('challenge.week52.desc', { curr: baseCurrency })}
                </p>
              </div>
              <div className="flex flex-col items-end shrink-0">
                <span className="text-2xl font-black text-indigo-500 tabular-nums">
                  {fmt(completedWeeks.reduce((sum, w) => sum + w * 10, 0))} / {fmt(13780)} {baseCurrency}
                </span>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{t('challenge.week52.totalSaved')}</span>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mt-5 space-y-2">
              <div className="flex justify-between items-center text-[10px] font-black uppercase text-indigo-500">
                <span>{t('challenge.week52.progress')}</span>
                <span>{Math.round((completedWeeks.length / 52) * 100)}%</span>
              </div>
              <div className="h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden border border-black/5 dark:border-white/5">
                <div 
                  className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-700"
                  style={{ width: `${(completedWeeks.length / 52) * 100}%` }}
                ></div>
              </div>
            </div>
          </div>

          {/* 52-Week Grid */}
          <div className="space-y-3">
            <h4 className="text-[10px] uppercase tracking-widest font-black text-slate-400 px-1">
              {t('challenge.week52.gridHeader')}
            </h4>
            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
              {Array.from({ length: 52 }, (_, i) => i + 1).map(w => {
                const isCompleted = completedWeeks.includes(w);

                return (
                  <button
                    key={w}
                    onClick={() => !isCompleted && onRequestSaveWeek(w)}
                    className={`h-16 rounded-2xl flex flex-col items-center justify-center border transition-all active:scale-95 relative overflow-hidden ${
                      isCompleted
                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                        : 'bg-surface-container-lowest border-slate-100 dark:border-dark-border hover:border-indigo-500/30'
                    }`}
                  >
                    <span className="text-[9px] font-bold text-slate-400 block">{t('challenge.week52.weekLabel', { n: String(w) })}</span>
                    <span className="text-xs font-black dark:text-white tabular-nums mt-0.5">{w * 10}</span>
                    
                    {isCompleted && (
                      <div className="absolute inset-0 bg-emerald-500/5 flex items-center justify-center">
                        <span className="material-symbols-outlined text-emerald-500 text-lg font-bold">check_circle</span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
  );
}
