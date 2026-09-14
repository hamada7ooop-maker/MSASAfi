import React from 'react';
import { onActivate } from '@/core/a11yKeyboard';
import { useI18n } from '../../../i18n/index';
import { useFormat } from '../../../core/hooks/useFormat';
import { parseNum } from '../../../core/utils';
import { buildAssetMeta } from '../assetMeta';

export interface ZakatHistoryEntry {
  date: string;
  amount: number;
  assets: Record<string, unknown>;
  method: 'gold' | 'silver';
}

export interface ZakatHistoryTabProps {
  history: ZakatHistoryEntry[];
  /** Index of the expanded row, or null. Owned by the parent so the tab can be
   *  unmounted and remounted without losing the open row. */
  expandedIndex: number | null;
  onToggleExpand: (index: number | null) => void;
  /** The detailed per-asset breakdown is a Pro perk. */
  isPro: boolean;
}

/**
 * Saved zakat calculations.
 *
 * Presentation only -- extracted from ZakatCalculator.tsx as part of L-1.
 * No fiqh arithmetic lives here: every figure is rendered from what the parent
 * already computed and stored, so this component cannot change what anyone
 * owes.
 */
export function ZakatHistoryTab({
  history,
  expandedIndex,
  onToggleExpand,
  isPro,
}: ZakatHistoryTabProps) {
  const { t } = useI18n();
  const { fmt } = useFormat();
  const assetMeta = buildAssetMeta(t);

  return (
    <>
        <div className="flex flex-col gap-4">
           {!isPro && (
              <div className="p-10 text-center bg-white dark:bg-[#1e2124] rounded-[3rem] border border-dashed border-slate-300 dark:border-slate-700">
                <span className="material-symbols-outlined text-5xl text-slate-300 mb-4">lock</span>
                <h4 className="font-black text-slate-800 dark:text-white mb-2">{t('shop.perk.zakatPro')}</h4>
                <p className="text-xs text-slate-500 mb-6">{t('shop.perk.zakatProDesc')}</p>
                <button onClick={() => window.location.hash = '/shop'} className="px-8 py-3 bg-[#002b59] text-white rounded-full font-black text-xs active:scale-95 transition-all">
                  {t('title.shop')}
                </button>
              </div>
           )}
           
           {isPro && history.length === 0 && (
              <div className="p-20 text-center text-slate-400 font-bold italic text-sm">
                {t('zakat.noHistory') || 'No saved calculations yet'}
              </div>
           )}

           {isPro && history.map((entry, idx) => {
              const isExpanded = expandedIndex === idx;
              return (
                <div 
                  key={idx} 
                  className="bg-white dark:bg-[#1c1f23] rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col overflow-hidden transition-all duration-300"
                >
                  {/* Main Summary Card */}
                  <div 
                    onClick={() => onToggleExpand(isExpanded ? null : idx)}
                    className="p-5 flex items-center justify-between cursor-pointer active:bg-slate-50 dark:active:bg-slate-800 transition-colors"
  role="button" tabIndex={0} onKeyDown={onActivate(() => onToggleExpand(isExpanded ? null : idx))}>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black text-slate-400 mb-1">{new Date(entry.date).toLocaleDateString()}</span>
                      <span className="font-black text-slate-800 dark:text-white text-lg">{fmt(entry.amount)}</span>
                      <span className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mt-1">
                        {entry.method === 'gold' ? t('zakat.nisabGold') : t('zakat.nisabSilver')}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-slate-400">{t('zakat.details')}</span>
                      <span className={`material-symbols-outlined text-slate-400 transition-transform duration-300 ${isExpanded ? 'rotate-90 text-amber-500' : ''}`}>
                        chevron_left
                      </span>
                    </div>
                  </div>

                  {/* Expandable Asset Breakdown */}
                  {isExpanded && entry.assets && (
                    <div className="px-5 pb-5 pt-3 border-t border-slate-100/50 dark:border-slate-800/50 bg-slate-50/50 dark:bg-slate-900/30 space-y-3 animate-in slide-in-from-top duration-300">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">
                        {t('zakat.breakdownTitle')}
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {Object.entries(entry.assets).map(([key, val]) => {
                          const valNum = parseNum(val as string) || 0;
                          if (valNum <= 0) return null;
                          const meta = assetMeta[key] || { label: key, icon: 'help', color: 'text-slate-400', bg: 'bg-slate-100' };

                          return (
                            <div key={key} className="flex items-center justify-between bg-white dark:bg-[#1a1c1e] p-3 rounded-2xl border border-slate-200/40 dark:border-slate-800/80">
                              <div className="flex items-center gap-2">
                                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${meta.bg} ${meta.color}`}>
                                  <span className="material-symbols-outlined text-sm">{meta.icon}</span>
                                </div>
                                <span className="text-xs font-black text-slate-700 dark:text-slate-200">
                                  {meta.label}
                                </span>
                              </div>
                              <span className="text-xs font-black text-slate-800 dark:text-white tabular-nums">
                                {fmt(valNum)}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
           })}
        </div>
    </>
  );
}
