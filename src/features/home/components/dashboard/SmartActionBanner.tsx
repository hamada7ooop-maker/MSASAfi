import React from 'react';
import { useI18n } from '../../../../i18n/index';

/**
 * Directive 19 — Batch 1: the smart-action banner CTA, extracted from
 * ClassicDashboard as a single-responsibility piece. Behavior is pinned by
 * the dashboard characterization suite (click → global action sheet opens).
 */
export function SmartActionBanner({ onOpen }: { onOpen: () => void }) {
  const { t } = useI18n();
  return (
    <button
      className="w-full relative overflow-hidden bg-gradient-to-br from-[#002b59] to-[#1a4175] dark:from-[#002b59] dark:to-[#091a2d] rounded-[32px] p-7 shadow-xl border border-white/10 group active:scale-[0.98] transition-all flex items-center justify-between"
      onClick={onOpen}
    >
      <div className="absolute -right-8 -top-8 w-40 h-40 bg-white/10 rounded-full blur-3xl group-hover:bg-white/20 transition-all duration-700"></div>
      <div className="relative z-10 text-left">
        <span className="text-white/60 text-[10px] font-black uppercase tracking-widest block mb-1">
          {t('home.quickActionSub') || 'Smart Action Hub'}
        </span>
        <h2 className="text-white text-xl font-black leading-tight">
          {t('home.quickActionTitle') || 'ماذا تريد أن تفعل؟'}
        </h2>
      </div>
      <div className="relative z-10 w-14 h-14 rounded-full bg-amber-500/90 backdrop-blur-md flex items-center justify-center border border-white/30 group-hover:scale-110 group-hover:bg-amber-400 flex-shrink-0 transition-all duration-300 shadow-lg shadow-amber-500/20">
        <span className="material-symbols-outlined text-white text-3xl font-light" style={{ color: 'white' }}>bolt</span>
      </div>
    </button>
  );
}

export default SmartActionBanner;
