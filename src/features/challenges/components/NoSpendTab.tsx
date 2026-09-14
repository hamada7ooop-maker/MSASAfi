import React from 'react';
import { useI18n } from '../../../i18n/index';

export interface NoSpendTabProps {
  /** True when today's challenge has been started but not yet verified. */
  noSpendActive: boolean;
  /** True when today's challenge has been completed and the reward claimed. */
  noSpendClaimed: boolean;
  onActivate: () => void;
  /** Checks today's transactions and awards the reward; parent-owned because
   *  it reads the ledger and writes loyalty points. */
  onVerify: () => void;
}

/**
 * The no-spend day challenge.
 *
 * Presentation only -- extracted from Challenges.tsx as part of L-1. Both the
 * verification (which inspects today's transactions) and the reward stay with
 * the parent.
 */
export function NoSpendTab({
  noSpendActive,
  noSpendClaimed,
  onActivate,
  onVerify,
}: NoSpendTabProps) {
  const { t } = useI18n();

  return (
        <div className="space-y-6 animate-in slide-in-from-right-8 duration-300 max-w-xl mx-auto">
          <div className="fin-card p-8 flex flex-col items-center text-center space-y-6 relative overflow-hidden border border-rose-500/10">
            
            <div className="w-24 h-24 rounded-[2rem] bg-rose-500/10 text-rose-500 flex items-center justify-center shrink-0 border border-rose-500/20 animate-pulse">
              <span className="material-symbols-outlined text-5xl">block</span>
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-black dark:text-white">
                {t('challenge.noSpend.title')}
              </h3>
              <p className="text-xs text-slate-400 font-bold leading-relaxed max-w-md mx-auto">
                {t('challenge.noSpend.desc')}
              </p>
            </div>

            {!noSpendActive ? (
              <button
                onClick={onActivate}
                className="w-full py-4 bg-rose-500 text-white rounded-2xl font-black text-sm shadow-lg shadow-rose-500/20 active:scale-95 transition-all"
              >
                {t('challenge.noSpend.activateBtn')}
              </button>
            ) : noSpendClaimed ? (
              <div className="w-full p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded-2xl font-black text-sm flex items-center justify-center gap-2">
                <span className="material-symbols-outlined">emoji_events</span>
                {t('challenge.noSpend.successMessage')}
              </div>
            ) : (
              <div className="w-full space-y-3">
                <div className="p-4 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-2xl font-black text-sm flex items-center justify-center gap-2">
                  <span className="material-symbols-outlined animate-spin">autorenew</span>
                  {t('challenge.noSpend.activeHelp')}
                </div>
                <button
                  onClick={onVerify}
                  className="w-full py-4 bg-[#002b59] text-white rounded-2xl font-black text-sm shadow-lg active:scale-95 transition-all"
                >
                  {t('challenge.noSpend.claimBtn')}
                </button>
              </div>
            )}
          </div>
        </div>
  );
}
