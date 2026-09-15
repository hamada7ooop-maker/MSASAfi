import React from 'react';
import { useI18n } from '../../../i18n/index';
import type { GeneratedChallenge } from '../../../core/ai/insightsService';

interface AdvisorChallengesProps {
  challenges: GeneratedChallenge[];
  onAccept: (id: string) => void;
}

export function AdvisorChallenges({ challenges, onAccept }: AdvisorChallengesProps) {
  const { t } = useI18n();
  if (challenges.length === 0) return null;

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between px-2">
        <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">
          {t('ai.advisor.challenges')}
        </h4>
        <span className="px-2 py-1 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-black rounded-full animate-pulse">HOT</span>
      </div>
      <div className="grid grid-cols-1 gap-4">
        {challenges.map((ch) => (
          <div key={ch.id} className="bg-gradient-to-br from-surface to-surface-container-low border border-outline-variant/30 rounded-[2.5rem] p-6 shadow-sm group active:scale-[0.98] transition-all">
            <div className="flex gap-5">
              <div className="w-16 h-16 rounded-[1.8rem] bg-amber-500/10 flex items-center justify-center text-3xl shadow-inner group-hover:scale-110 transition-transform duration-500">{ch.icon}</div>
              <div className="flex-1 space-y-2">
                <div className="flex items-center justify-between">
                  <h5 className="text-base font-black text-slate-800 dark:text-white">{ch.title}</h5>
                  <span className="text-xs font-black text-amber-600 tabular-nums">+{ch.reward} 🪙</span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed">{ch.body}</p>
                <button onClick={() => onAccept(ch.id)} className="mt-3 w-full py-3 rounded-2xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-[10px] font-black uppercase tracking-widest shadow-lg shadow-black/10 hover:shadow-xl transition-all">
                  {t('ai.challenge.accept')}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
