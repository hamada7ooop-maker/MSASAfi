import React from 'react';
import { useI18n } from '../../../i18n/index';
import type { SmartRecommendation } from '../../../core/ai/insightsService';

interface AdvisorRecommendationsProps {
  recommendations: SmartRecommendation[];
  onNavigate: (action: string) => void;
}

export function AdvisorRecommendations({ recommendations, onNavigate }: AdvisorRecommendationsProps) {
  const { t } = useI18n();
  return (
    <section className="space-y-4">
      <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] px-2">{t('ai.advisor.recs')}</h4>
      <div className="space-y-4">
        {recommendations.map((rec) => (
          <div key={rec.id} className={`p-6 rounded-[2.5rem] bg-white dark:bg-[#1e2124] border border-black/5 dark:border-white/5 shadow-sm flex gap-5 items-start relative overflow-hidden group hover:shadow-md transition-all ${rec.priority === 'high' ? 'border-l-4 border-l-rose-500' : ''}`}>
            <div className="w-14 h-14 rounded-2xl bg-slate-50 dark:bg-slate-800/50 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform duration-500">{rec.icon}</div>
            <div className="flex-1 space-y-2">
              <h5 className="text-sm font-black text-slate-800 dark:text-white">{rec.title}</h5>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed">{rec.body}</p>
              {rec.action && (
                <button onClick={() => onNavigate(rec.action!)} className="mt-2 text-blue-500 text-[10px] font-black uppercase tracking-widest flex items-center gap-1 hover:gap-2 transition-all">
                  {t('action.show')} <span className="material-symbols-outlined text-[14px]">chevron_right</span>
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
