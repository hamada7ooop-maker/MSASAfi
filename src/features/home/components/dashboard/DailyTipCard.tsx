import React from 'react';
import { useI18n } from '../../../../i18n/index';

/**
 * Directive 19 — Batch 1: the daily tip card, extracted from
 * ClassicDashboard as a single-responsibility piece.
 */
export function DailyTipCard({ tip }: { tip: string }) {
  const { t } = useI18n();
  return (
    <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-[32px] p-6 shadow-lg text-white relative overflow-hidden group">
      <div className="absolute -right-6 -top-6 opacity-10 group-hover:scale-125 transition-transform duration-700">
        <span className="material-symbols-outlined" style={{ fontSize: '100px' }}>lightbulb</span>
      </div>
      <div className="flex items-center gap-3 mb-2">
        <span className="material-symbols-outlined text-amber-300">emoji_objects</span>
        <h3 className="font-black text-[10px] uppercase tracking-widest text-white/80">{t('home.section.dailyTip')}</h3>
      </div>
      <p className="text-sm font-bold leading-relaxed relative z-10">{tip}</p>
    </div>
  );
}

export default DailyTipCard;
