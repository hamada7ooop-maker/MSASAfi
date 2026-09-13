import React from 'react';
import { useI18n } from '../../../i18n/index';
import { useFormat } from '../../../core/hooks/useFormat';
import { useSettingsStore } from '../../../store/settingsStore';
import { toast } from '../../../toast';
import { sanitizeNumericInput } from '../../../core/utils';
import { AnimatedNumber } from './AnimatedNumber';

export interface ZakatNisabBannerProps {
  /** Zakat due, already computed by the parent. */
  zakatAmount: number;
  /** The nisab threshold in currency, already computed by the parent. */
  nisab: number;
  isAboveNisab: boolean;
  totalAssets: number;

  nisabMethod: 'gold' | 'silver';
  onNisabMethodChange: (m: 'gold' | 'silver') => void;
  /** Silver nisab is a Pro perk; the parent owns the entitlement check. */
  isPro: boolean;

  goldPrice: string;
  onGoldPriceChange: (v: string) => void;
  silverPrice: string;
  onSilverPriceChange: (v: string) => void;
  isSyncing: boolean;
  onSyncPrices: () => void;

  onSave: () => void;
}

/**
 * The headline "zakat due" banner, the nisab method selector and the metal
 * price inputs.
 *
 * Presentation only -- extracted from ZakatCalculator.tsx as part of L-1.
 * `zakatAmount`, `nisab` and `isAboveNisab` all arrive as props: this component
 * displays the verdict, it does not reach one. Keeping the arithmetic out of
 * here is the whole point, because a second implementation of the nisab rule
 * is a second chance to get someone's obligation wrong.
 */
export function ZakatNisabBanner({
  zakatAmount,
  nisab,
  isAboveNisab,
  totalAssets,
  nisabMethod,
  onNisabMethodChange,
  isPro,
  goldPrice,
  onGoldPriceChange,
  silverPrice,
  onSilverPriceChange,
  isSyncing,
  onSyncPrices,
  onSave,
}: ZakatNisabBannerProps) {
  const { t } = useI18n();
  const { fmt } = useFormat();
  const baseCurrency = useSettingsStore((s) => s.baseCurrency);

  return (
    <>
          {/* Zakat Banner */}
          <section className="sticky top-[73px] z-20 rounded-3xl md:rounded-[2.5rem] p-5 md:p-8 flex flex-col items-center justify-center relative overflow-hidden bg-gradient-to-br from-[#002b59] to-blue-800 shadow-2xl shadow-blue-900/20 transition-all duration-300">
            <div className="absolute inset-0 bg-white/5 pointer-events-none"></div>
            
            <h2 className="font-bold text-sm mb-2 z-10 text-blue-200 uppercase tracking-widest">
              {t('zakat.totalDue')}
            </h2>
            
            <div className="flex items-baseline gap-2 z-10 text-white">
              <AnimatedNumber value={zakatAmount} formatter={fmt} baseCurrency={baseCurrency} />
            </div>
            
            {!isAboveNisab && totalAssets > 0 && (
              <p className="text-[10px] mt-4 z-10 px-4 py-1.5 rounded-full text-red-200 bg-red-900/40 backdrop-blur-md border border-red-500/30 font-bold animate-pulse">
                {t('zakat.belowNisab')} ({fmt(nisab)})
              </p>
            )}
            {isAboveNisab && (
               <button 
                onClick={onSave}
                className="mt-6 z-10 px-6 py-2.5 rounded-full bg-emerald-500 text-white font-black text-xs shadow-lg active:scale-95 transition-all flex items-center gap-2"
               >
                 <span className="material-symbols-outlined text-sm">save</span>
                 {t('zakat.save')}
               </button>
            )}
          </section>

          {/* Nisab Selector */}
          <div className="bg-white dark:bg-[#1e2124] rounded-[2rem] p-2 flex border border-slate-200 dark:border-slate-800 shadow-sm">
            <button 
              onClick={() => onNisabMethodChange('gold')}
              className={`flex-1 py-3 rounded-2xl text-[10px] font-black transition-all flex items-center justify-center gap-2 ${nisabMethod === 'gold' ? 'bg-amber-100 text-amber-900' : 'text-slate-400'}`}
            >
              <span className="material-symbols-outlined text-sm">diamond</span>
              {t('zakat.nisabGold')}
            </button>
            <button 
              onClick={() => isPro ? onNisabMethodChange('silver') : toast(t('shop.perk.zakatPro') + ' Required', 'error')}
              className={`flex-1 py-3 rounded-2xl text-[10px] font-black transition-all flex items-center justify-center gap-2 ${nisabMethod === 'silver' ? 'bg-slate-100 text-slate-900' : 'text-slate-400'} ${!isPro ? 'opacity-50' : ''}`}
            >
              <span className="material-symbols-outlined text-sm">token</span>
              {t('zakat.nisabSilver')}
              {!isPro && <span className="material-symbols-outlined text-xs">lock</span>}
            </button>
          </div>

          {/* Price Syncing */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-amber-50 dark:bg-amber-900/10 p-4 rounded-3xl border border-amber-100 dark:border-amber-900/20">
              <p className="text-[9px] font-black text-amber-700 dark:text-amber-500 mb-2 uppercase tracking-widest">{t('zakat.goldPriceToday')}</p>
              <div className="flex items-center justify-between mb-3 gap-2">
                <div className="flex items-center gap-1 bg-white dark:bg-amber-950/40 px-3 py-1.5 rounded-2xl border border-amber-200/50 dark:border-amber-900/30 flex-1">
                  <input 
                    type="text" 
                    inputMode="decimal"
                    dir="ltr"
                    value={goldPrice} 
                    onChange={(e) => {
                      onGoldPriceChange(sanitizeNumericInput(e.target.value));
                    }}
                    onCompositionEnd={(e) => {
                      onGoldPriceChange(sanitizeNumericInput(e.currentTarget.value));
                    }}
                    className="w-full bg-transparent font-black text-sm text-amber-900 dark:text-amber-100 focus:outline-none placeholder-amber-400"
                    placeholder="0"
                  />
                  <small className="text-[10px] font-bold text-amber-600 dark:text-amber-400">{baseCurrency}</small>
                </div>
                 <button onClick={() => onSyncPrices()} disabled={isSyncing} className="w-8 h-8 rounded-full bg-white dark:bg-amber-900/30 flex items-center justify-center text-amber-600 shadow-sm active:rotate-180 transition-all duration-500 shrink-0 disabled:opacity-50">
                  <span className={`material-symbols-outlined text-sm ${isSyncing ? 'animate-spin' : ''}`}>sync</span>
                </button>
              </div>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-3xl border border-slate-200 dark:border-slate-700/50">
              <p className="text-[9px] font-black text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-widest">{t('zakat.silverPriceToday')}</p>
              <div className="flex items-center justify-between mb-3 gap-2">
                <div className="flex items-center gap-1 bg-white dark:bg-slate-900/40 px-3 py-1.5 rounded-2xl border border-slate-200/50 dark:border-slate-800/30 flex-1">
                  <input 
                    type="text" 
                    inputMode="decimal"
                    dir="ltr"
                    value={silverPrice} 
                    onChange={(e) => {
                      onSilverPriceChange(sanitizeNumericInput(e.target.value));
                    }}
                    onCompositionEnd={(e) => {
                      onSilverPriceChange(sanitizeNumericInput(e.currentTarget.value));
                    }}
                    className="w-full bg-transparent font-black text-sm text-slate-800 dark:text-slate-100 focus:outline-none placeholder-slate-400"
                    placeholder="0"
                  />
                  <small className="text-[10px] font-bold text-slate-500 dark:text-slate-400">{baseCurrency}</small>
                </div>
                 <button onClick={() => isPro ? onSyncPrices() : toast(t('shop.perk.zakatPro') + ' Required', 'error')} disabled={isSyncing} className={`w-8 h-8 rounded-full bg-white dark:bg-slate-700 flex items-center justify-center text-slate-600 shadow-sm ${!isPro ? 'opacity-30' : 'active:rotate-180 transition-all duration-500'} shrink-0 disabled:opacity-50`}>
                  <span className={`material-symbols-outlined text-sm ${isSyncing ? 'animate-spin' : ''}`}>{isPro ? 'sync' : 'lock'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Zakat Educational Card */}
          <div className="bg-[#002b59]/5 dark:bg-[#002b59]/10 rounded-[2rem] p-6 border border-[#002b59]/10 dark:border-[#002b59]/20 flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-3 duration-500">
            <div className="flex items-center gap-2 text-[#002b59] dark:text-blue-300">
              <span className="material-symbols-outlined text-lg">info</span>
              <h4 className="font-black text-xs uppercase tracking-wider">{t('zakat.edu.title')}</h4>
            </div>
            <p className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-300 font-medium">
              {t('zakat.edu.desc', { pct: '2.5%' })}
            </p>
            <div className="grid grid-cols-2 gap-3 text-[10px]">
              <div className="bg-white/80 dark:bg-[#121214]/60 p-3 rounded-2xl border border-slate-200/50 dark:border-slate-800/50">
                <span className="block font-black text-slate-800 dark:text-slate-200 mb-1">{t('zakat.edu.goldNisabTitle')}</span>
                <span className="text-slate-500 dark:text-slate-400">{t('zakat.edu.goldNisabDesc')}</span>
              </div>
              <div className="bg-white/80 dark:bg-[#121214]/60 p-3 rounded-2xl border border-slate-200/50 dark:border-slate-800/50">
                <span className="block font-black text-slate-800 dark:text-slate-200 mb-1">{t('zakat.edu.silverNisabTitle')}</span>
                <span className="text-slate-500 dark:text-slate-400">{t('zakat.edu.silverNisabDesc')}</span>
              </div>
            </div>
          </div>

    </>
  );
}
