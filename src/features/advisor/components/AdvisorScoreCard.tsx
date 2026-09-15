import React from 'react';
import { useI18n } from '../../../i18n/index';

interface AdvisorScoreCardProps {
  score: number;
}

export function AdvisorScoreCard({ score }: AdvisorScoreCardProps) {
  const { t } = useI18n();
  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-[#002b59] to-[#1a4175] rounded-[3rem] p-8 shadow-2xl border border-white/10 group">
      <div className="absolute -right-12 -top-12 w-48 h-48 bg-white/5 rounded-full blur-3xl group-hover:bg-white/10 transition-all duration-700"></div>
      <div className="relative z-10 flex flex-col items-center text-center gap-4">
        <div className="relative w-32 h-32 flex items-center justify-center">
          <svg className="w-full h-full -rotate-90">
            <circle cx="64" cy="64" r="60" fill="none" stroke="currentColor" strokeWidth="8" className="text-white/10" />
            <circle cx="64" cy="64" r="60" fill="none" stroke="currentColor" strokeWidth="8" className="text-blue-400 transition-all duration-1000" strokeDasharray={377} strokeDashoffset={377 - (377 * score / 100)} />
          </svg>
          <div className="absolute flex flex-col items-center">
            <span className="text-4xl font-black text-white">{score}</span>
            <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">%</span>
          </div>
        </div>
        <div className="space-y-1">
          <h3 className="text-xl font-black text-white">{t('ai.advisor.score')}</h3>
          <p className="text-white/60 text-xs font-medium max-w-[240px] leading-relaxed">{t('ai.advisor.scoreDesc')}</p>
        </div>
      </div>
    </div>
  );
}
