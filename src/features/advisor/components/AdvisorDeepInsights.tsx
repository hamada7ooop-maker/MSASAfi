import React from 'react';
import { useI18n } from '../../../i18n/index';

interface AdvisorDeepInsightsProps {
  insights?: string;
}

export function AdvisorDeepInsights({ insights }: AdvisorDeepInsightsProps) {
  const { t } = useI18n();
  return (
    <section className="space-y-4">
      <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] px-2">{t('ai.advisor.insights')}</h4>
      <div className="bg-white dark:bg-[#1e2124] rounded-[2.5rem] p-7 shadow-sm border border-black/5 dark:border-white/5 relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-125 transition-transform duration-700">
          <span className="material-symbols-outlined" style={{ fontSize: '80px' }}>psychology</span>
        </div>
        <div className="relative z-10 space-y-4">
          <div className="flex items-center gap-3 text-blue-500">
            <span className="material-symbols-outlined">analytics</span>
            <span className="text-xs font-black uppercase tracking-widest">{t('common.lastMonth')}</span>
          </div>
          <p className="text-sm font-bold text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">
            {insights || t('chat.ai.noTopData')}
          </p>
        </div>
      </div>
    </section>
  );
}
