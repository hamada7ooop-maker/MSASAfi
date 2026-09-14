import React from 'react';
import { onActivate } from '@/core/a11yKeyboard';
import { useI18n } from '../../../i18n/index';
import { useFormat } from '../../../core/hooks/useFormat';

export type ZakatAssets = Record<string, string>;

export interface ExcludedAsset {
  key: 'livestock' | 'crops' | 'realestate';
  value: number;
}

export interface ZakatAssetsEditorProps {
  assets: ZakatAssets;
  onAssetChange: (key: string, value: string) => void;
  /** 'smart' shows the karat-itemised summary chip on the gold row. */
  goldCalcType: 'direct' | 'smart';
  /** Gold value in the base currency, computed by the parent. */
  goldValue: number;
  /** 24k-equivalent grams, computed by the parent (see the engine's
   *  `toPureGoldEquivalent`); shown as a chip, never recalculated here. */
  totalEquivalentWeight: number;
  onOpenGoldModal: () => void;

  /** Immediately-due debts, deducted from the zakatable base by the engine. */
  liabilities: string;
  onLiabilitiesChange: (v: string) => void;
  /** monetaryTotal - liabilities, floored at zero. Computed by the engine. */
  netZakatableBase: number;

  /**
   * Buckets the engine excluded from the 2.5% base, with their values.
   *
   * Rendered with their actual rulings rather than hidden: silently dropping
   * wealth a user entered is its own failure mode, distinct from the
   * over-charging this replaced.
   */
  excludedBreakdown: ExcludedAsset[];
}

/**
 * The zakatable-asset editor.
 *
 * Presentation only -- extracted from ZakatCalculator.tsx as part of L-1. It
 * renders one row per bucket and reports edits upward; it neither totals the
 * assets nor decides which of them are zakatable. Both of those are fiqh
 * questions and stay with the parent / `core/zakatEngine.ts`.
 */
export function ZakatAssetsEditor({
  assets,
  onAssetChange,
  goldCalcType,
  goldValue,
  totalEquivalentWeight,
  onOpenGoldModal,
  liabilities,
  onLiabilitiesChange,
  netZakatableBase,
  excludedBreakdown,
}: ZakatAssetsEditorProps) {
  const { t } = useI18n();
  const { fmt } = useFormat();

  return (
    <>
          {/* Assets Title */}
          <div className="flex items-center justify-between">
            <h3 className="text-[#002b59] dark:text-blue-200 font-black text-lg uppercase tracking-tight">
              {t('zakat.assetsTitle')}
            </h3>
          </div>

          {/* Asset Inputs */}
          <div className="space-y-3">
            {[
              { id: 'cash', icon: 'account_balance', label: t('zakat.asset.cash'), color: 'text-blue-600', bg: 'bg-blue-50 dark:bg-blue-900/20' },
              { id: 'gold', icon: 'diamond', label: t('zakat.asset.gold'), color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/20' },
              { id: 'invest', icon: 'trending_up', label: t('zakat.asset.invest'), color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
              { id: 'trade', icon: 'storefront', label: t('zakat.asset.trade'), color: 'text-indigo-500', bg: 'bg-indigo-50 dark:bg-indigo-900/20' },
              { id: 'livestock', icon: 'pets', label: t('zakat.asset.livestock'), color: 'text-orange-500', bg: 'bg-orange-50 dark:bg-orange-900/20' },
              { id: 'crops', icon: 'eco', label: t('zakat.asset.crops'), color: 'text-green-500', bg: 'bg-green-50 dark:bg-green-900/20' },
              { id: 'realestate', icon: 'apartment', label: t('zakat.asset.realestate'), color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-900/20' }
            ].map((item) => {
              const isGoldRow = item.id === 'gold';
              const isGoldSmart = goldCalcType === 'smart';
              return (
                <div 
                  key={item.id} 
                  onClick={() => isGoldRow && onOpenGoldModal()}
                  className={`bg-white dark:bg-[#1c1f23] rounded-3xl p-4 flex items-center justify-between border border-slate-100 dark:border-slate-800 shadow-sm focus-within:ring-2 focus-within:ring-[#002b59]/20 transition-all ${isGoldRow ? 'cursor-pointer hover:border-amber-400/50' : ''}`}
  role="button" tabIndex={0} onKeyDown={onActivate(() => isGoldRow && onOpenGoldModal())}>
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${item.bg} ${item.color}`}>
                      <span className="material-symbols-outlined text-xl">{item.icon}</span>
                    </div>
                    <div>
                      <label className="font-black text-sm text-slate-800 dark:text-slate-200 truncate block">{item.label}</label>
                      {isGoldRow && (
                        <span className={`inline-flex items-center gap-1 text-[9px] font-black px-2 py-0.5 rounded-full mt-0.5 ${isGoldSmart ? 'bg-amber-100 text-amber-900 dark:bg-amber-950/40 dark:text-amber-400' : 'bg-slate-100 text-slate-500'}`}>
                          <span className="material-symbols-outlined text-[10px]">
                            {isGoldSmart ? 'auto_awesome' : 'edit'}
                          </span>
                          {isGoldSmart 
                            ? `${totalEquivalentWeight.toFixed(1)}g عيار 24` 
                            : t('zakat.gold.directValue')
                          }
                        </span>
                      )}
                    </div>
                  </div>
                  {isGoldRow ? (
                    <div className="w-28 bg-slate-50 dark:bg-[#121214] border border-slate-200/50 dark:border-slate-800 rounded-2xl py-3 px-3 text-center font-black text-sm text-amber-600 dark:text-amber-400 flex items-center justify-center gap-1">
                      {fmt(goldValue)}
                    </div>
                  ) : (
                    <input 
                      type="text" 
                      inputMode="decimal"
                      dir="ltr"
                      value={assets[item.id]}
                      onChange={(e) => onAssetChange(item.id, e.target.value)}
                      onCompositionEnd={(e) => onAssetChange(item.id, e.currentTarget.value)}
                      className="w-28 bg-slate-50 dark:bg-[#121214] border border-transparent rounded-2xl py-3 px-3 text-center font-black text-sm text-slate-800 dark:text-white focus:outline-none transition-all placeholder-slate-400" 
                      placeholder="0" 
                    />
                  )}
                </div>
              );
            })}
          </div>

          {/* ── Liabilities ─────────────────────────────────────────────── */}
          <div className="bg-white dark:bg-[#1c1f23] rounded-3xl p-4 flex items-center justify-between border border-slate-100 dark:border-slate-800 shadow-sm mt-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 bg-rose-50 dark:bg-rose-900/20 text-rose-500">
                <span className="material-symbols-outlined text-xl">credit_card_off</span>
              </div>
              <div>
                <label className="font-black text-sm text-slate-800 dark:text-slate-200 truncate block">
                  {t('zakat.liabilities')}
                </label>
                <span className="text-[9px] font-bold text-slate-400">
                  {t('zakat.liabilitiesHint')}
                </span>
              </div>
            </div>
            <input
              type="text"
              inputMode="decimal"
              dir="ltr"
              value={liabilities}
              onChange={(e) => onLiabilitiesChange(e.target.value)}
              onCompositionEnd={(e) => onLiabilitiesChange(e.currentTarget.value)}
              className="w-28 bg-slate-50 dark:bg-[#121214] border border-transparent rounded-2xl py-3 px-3 text-center font-black text-sm text-rose-600 dark:text-rose-400 focus:outline-none transition-all placeholder-slate-400"
              placeholder="0"
            />
          </div>

          {/* Net base, so the user can see what the 2.5% is actually taken on */}
          <div className="flex items-center justify-between px-5 py-3 mt-2 rounded-2xl bg-slate-100/70 dark:bg-slate-900/40">
            <span className="text-[11px] font-black text-slate-500 dark:text-slate-400">
              {t('zakat.netBase')}
            </span>
            <span className="text-sm font-black text-[#002b59] dark:text-emerald-400 tnum">
              {fmt(netZakatableBase)}
            </span>
          </div>

          {/* ── Assets with separate rulings ────────────────────────────── */}
          {excludedBreakdown.length > 0 && (
            <div className="mt-4 rounded-3xl border border-amber-300/50 dark:border-amber-500/20 bg-amber-50/70 dark:bg-amber-950/20 p-4 space-y-3">
              <div className="flex items-start gap-2">
                <span
                  className="material-symbols-outlined text-amber-600 dark:text-amber-400 text-lg shrink-0"
                  aria-hidden="true"
                >
                  balance
                </span>
                <div>
                  <h4 className="text-[12px] font-black text-amber-900 dark:text-amber-200">
                    {t('zakat.excludedTitle')}
                  </h4>
                  <p className="text-[10px] font-bold text-amber-800/80 dark:text-amber-200/70 mt-0.5 leading-relaxed">
                    {t('zakat.excludedNotice')}
                  </p>
                </div>
              </div>

              <ul className="space-y-2">
                {excludedBreakdown.map((item) => (
                  <li
                    key={item.key}
                    className="rounded-2xl bg-white/70 dark:bg-slate-900/40 px-3 py-2.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] font-black text-slate-700 dark:text-slate-200">
                        {t(`zakat.asset.${item.key}`)}
                      </span>
                      <span className="text-[11px] font-black text-slate-500 tnum">
                        {fmt(item.value)}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                      {t(`zakat.rule.${item.key}`)}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          )}
    </>
  );
}
