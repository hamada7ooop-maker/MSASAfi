import React from 'react';
import { useI18n } from '../../../i18n/index';
import { useFormat } from '../../../core/hooks/useFormat';
import { useSettingsStore } from '../../../store/settingsStore';
import { parseNum, sanitizeNumericInput } from '../../../core/utils';

export interface GoldItem {
  id: string;
  label: string;
  weight: string;
  caliber: number;
}

export interface GoldSmartCalcModalProps {
  open: boolean;
  /** 'smart' itemises jewellery by karat; 'direct' takes a single value. */
  calcType: 'direct' | 'smart';
  onCalcTypeChange: (t: 'direct' | 'smart') => void;
  items: GoldItem[];
  onAddItem: () => void;
  onDeleteItem: (id: string) => void;
  onUpdateItem: (id: string, key: 'label' | 'weight' | 'caliber', val: string | number) => void;
  directValue: string;
  onDirectValueChange: (v: string) => void;

  /**
   * Derived figures, computed by the parent and passed in.
   *
   * They are NOT recomputed here on purpose. Karat conversion is fiqh-adjacent
   * arithmetic (`toPureGoldEquivalent` in core/zakatEngine.ts), and duplicating
   * it in a presentational component is exactly how two answers to the same
   * religious question end up in one codebase.
   */
  equivalentWeight: number;
  actualWeight: number;
  goldValue: number;
  /** Progress toward the 85g gold nisab, already clamped to 0-100. */
  progressPct: number;

  onCancel: () => void;
  onApply: () => void;
}

/**
 * The "smart" gold calculator sheet.
 *
 * Presentation only -- extracted from ZakatCalculator.tsx as part of L-1. Every
 * number it shows arrives as a prop; it performs no zakat arithmetic of its own.
 */
export function GoldSmartCalcModal({
  open,
  calcType,
  onCalcTypeChange,
  items,
  onAddItem,
  onDeleteItem,
  onUpdateItem,
  directValue,
  onDirectValueChange,
  equivalentWeight,
  actualWeight,
  goldValue,
  progressPct,
  onCancel,
  onApply,
}: GoldSmartCalcModalProps) {
  const { t } = useI18n();
  const { fmt } = useFormat();
  const baseCurrency = useSettingsStore((st) => st.baseCurrency);

  if (!open) return null;

  return (
      <div className="fixed inset-0 z-[200] flex items-end md:items-center justify-center p-0 md:p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
        <div className="bg-white dark:bg-[#1a1c1e] w-full md:max-w-2xl rounded-t-[2.5rem] md:rounded-[2.5rem] max-h-[90vh] overflow-y-auto shadow-2xl border-t md:border border-slate-100 dark:border-slate-800 flex flex-col p-6 animate-in slide-in-from-bottom duration-500 relative">
          
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-amber-500 text-2xl">diamond</span>
              <h3 className="text-[#002b59] dark:text-amber-400 font-black text-lg">
                {t('zakat.gold.calcType')}
              </h3>
            </div>
            <button aria-label={t('action.close') || 'Close'} 
              onClick={() => onCancel()}
              className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:text-slate-800 dark:hover:text-white"
            >
              <span className="material-symbols-outlined text-lg" aria-hidden="true">close</span>
            </button>
          </div>

          {/* Content Body */}
          <div className="flex-1 py-6 space-y-6">
            
            {/* Tab Selector */}
            <div className="flex p-1 bg-slate-100 dark:bg-slate-900 rounded-full border border-slate-200 dark:border-slate-800">
              <button
                onClick={() => onCalcTypeChange('direct')}
                className={`flex-1 py-2.5 rounded-full text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
                  calcType === 'direct'
                    ? 'bg-[#002b59] text-white shadow-sm'
                    : 'text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800'
                }`}
              >
                <span className="material-symbols-outlined text-sm">edit</span>
                {t('zakat.gold.directValue')}
              </button>
              <button
                onClick={() => onCalcTypeChange('smart')}
                className={`flex-1 py-2.5 rounded-full text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
                  calcType === 'smart'
                    ? 'bg-[#002b59] text-white shadow-sm'
                    : 'text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800'
                }`}
              >
                <span className="material-symbols-outlined text-sm">auto_awesome</span>
                {t('zakat.gold.smartCalc')}
              </button>
            </div>

            {/* DIRECT ENTRY MODE */}
            {calcType === 'direct' && (
              <div className="space-y-4 animate-in fade-in duration-300">
                <div className="bg-slate-50 dark:bg-slate-900/50 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 space-y-4">
                  <label className="block text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    {t('zakat.gold.directValueLabel')}
                  </label>
                  <div className="flex items-center gap-2 bg-white dark:bg-slate-900 px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-800">
                    <input
                      type="text"
                      inputMode="decimal"
                      dir="ltr"
                      value={directValue}
                      onChange={(e) => onDirectValueChange(sanitizeNumericInput(e.target.value))}
                      onCompositionEnd={(e) => onDirectValueChange(sanitizeNumericInput(e.currentTarget.value))}
                      placeholder="0.00"
                      className="flex-1 bg-transparent font-black text-lg text-slate-800 dark:text-white focus:outline-none placeholder-slate-400"
                    />
                    <span className="font-bold text-slate-500">{baseCurrency}</span>
                  </div>
                  <p className="text-[10px] text-slate-400 font-medium leading-relaxed">
                    {t('zakat.gold.directValueHint')}
                  </p>
                </div>
              </div>
            )}

            {/* SMART CALCULATOR MODE */}
            {calcType === 'smart' && (
              <div className="space-y-6 animate-in fade-in duration-300">
                
                {/* Nisab Progress */}
                <div className="bg-amber-500/5 dark:bg-amber-500/10 rounded-3xl p-4 border border-amber-500/15 space-y-3">
                  <div className="flex items-center justify-between text-xs font-black text-amber-800 dark:text-amber-400">
                    <span>{t('zakat.gold.nisabProgress')}</span>
                    <span>{equivalentWeight.toFixed(2)} / 85 {t('zakat.gold.weight')}</span>
                  </div>
                  <div className="w-full h-3 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden relative">
                    <div 
                      className="h-full bg-gradient-to-r from-amber-400 to-amber-600 rounded-full transition-all duration-500" 
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                  <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5 leading-relaxed">
                    <span className="material-symbols-outlined text-[14px] text-amber-500 shrink-0">
                      {equivalentWeight >= 85 ? 'stars' : 'info'}
                    </span>
                    {equivalentWeight >= 85 
                      ? t('zakat.gold.aboveNisabMsg') 
                      : t('zakat.gold.belowNisabMsg').replace('{grams}', (85 - equivalentWeight).toFixed(2))
                    }
                  </p>
                </div>

                {/* List of Gold Items */}
                <div className="space-y-3 max-h-[30vh] overflow-y-auto pr-1">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                      {t('zakat.gold.itemsList')}
                    </h4>
                    <button aria-label={t('action.add') || 'Add'}
                      onClick={onAddItem}
                      className="text-xs font-black text-amber-600 dark:text-amber-400 flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-sm" aria-hidden="true">add</span>
                      {t('zakat.gold.addItem')}
                    </button>
                  </div>

                  {items.map((item) => (
                    <div key={item.id} className="bg-slate-50 dark:bg-slate-900 rounded-3xl p-4 border border-slate-100 dark:border-slate-800/60 space-y-3 relative group">
                      
                      {/* Top Line */}
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          dir="auto"
                          placeholder={t('zakat.gold.itemLabelPh')}
                          value={item.label}
                          onChange={(e) => onUpdateItem(item.id, 'label', e.target.value)}
                          onCompositionEnd={(e) => onUpdateItem(item.id, 'label', e.currentTarget.value)}
                          className="bg-white dark:bg-[#121214] border border-slate-200/50 dark:border-slate-800 rounded-xl px-3 py-2 text-xs font-black text-slate-800 dark:text-white flex-1 focus:outline-none focus:ring-1 focus:ring-amber-500"
                        />
                        {items.length > 1 && (
                          <button aria-label={t('action.delete') || 'Delete'}
                            onClick={() => onDeleteItem(item.id)}
                            className="w-8 h-8 rounded-full bg-red-50 dark:bg-red-950/20 text-red-500 hover:bg-red-100 flex items-center justify-center shrink-0"
                          >
                            <span className="material-symbols-outlined text-sm" aria-hidden="true">delete</span>
                          </button>
                        )}
                      </div>

                      {/* Details Grid */}
                      <div className="grid grid-cols-2 gap-3 items-center">
                        {/* Weight input */}
                        <div className="flex items-center gap-2 bg-white dark:bg-[#121214] border border-slate-200/50 dark:border-slate-800 rounded-xl px-3 py-2">
                          <input
                            type="text"
                            inputMode="decimal"
                            dir="ltr"
                            placeholder={t('zakat.gold.weightPh')}
                            value={item.weight}
                            onChange={(e) => onUpdateItem(item.id, 'weight', e.target.value)}
                            onCompositionEnd={(e) => onUpdateItem(item.id, 'weight', e.currentTarget.value)}
                            className="w-full bg-transparent font-black text-xs text-slate-800 dark:text-white focus:outline-none placeholder-slate-400"
                          />
                          <span className="text-[10px] font-bold text-slate-400">g</span>
                        </div>

                        {/* Caliber segmented button */}
                        <div className="flex bg-slate-100 dark:bg-[#121214] p-0.5 rounded-xl border border-slate-200/40 dark:border-slate-800/80">
                          {[18, 21, 22, 24].map(c => (
                            <button
                              key={c}
                              onClick={() => onUpdateItem(item.id, 'caliber', c)}
                              className={`flex-1 py-1 rounded-lg text-[9px] font-black transition-all ${
                                item.caliber === c
                                  ? 'bg-[#002b59] text-white shadow-sm'
                                  : 'text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800'
                              }`}
                            >
                              {c}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Equivalency Badge */}
                      <div className="flex items-center justify-between text-[9px] font-bold text-slate-400 pt-1">
                        <span>{t('zakat.gold.caliber')}: {t('zakat.gold.caliberDisplay', { caliber: String(item.caliber) })}</span>
                        <span className="bg-amber-100/50 dark:bg-amber-950/20 text-amber-800 dark:text-amber-400 px-2 py-0.5 rounded-lg">
                          {t('zakat.gold.eqWeight')}: {((parseNum(item.weight) || 0) * (item.caliber / 24)).toFixed(2)}g
                        </span>
                      </div>

                    </div>
                  ))}
                </div>

                {/* Summary calculations */}
                <div className="bg-[#002b59]/5 dark:bg-[#121214] border border-slate-200/50 dark:border-slate-800 p-5 rounded-3xl grid grid-cols-3 gap-3 text-center">
                  <div>
                    <span className="block text-[8px] font-black text-slate-400 uppercase tracking-wider mb-1">{t('zakat.gold.actualWeightLabel')}</span>
                    <span className="font-black text-xs text-slate-700 dark:text-slate-200">{actualWeight.toFixed(2)}g</span>
                  </div>
                  <div>
                    <span className="block text-[8px] font-black text-slate-400 uppercase tracking-wider mb-1">{t('zakat.gold.eqWeightLabel')}</span>
                    <span className="font-black text-xs text-amber-600 dark:text-amber-400">{equivalentWeight.toFixed(2)}g</span>
                  </div>
                  <div>
                    <span className="block text-[8px] font-black text-slate-400 uppercase tracking-wider mb-1">{t('zakat.gold.estValueLabel')}</span>
                    <span className="font-black text-xs text-emerald-600 dark:text-emerald-400">{fmt(goldValue)}</span>
                  </div>
                </div>

              </div>
            )}

          </div>

          {/* Bottom Actions */}
          <div className="flex items-center gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              onClick={() => onCancel()}
              className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-200 rounded-2xl font-black text-xs active:scale-95 transition-all"
            >
              {t('action.cancel') || 'إلغاء'}
            </button>
            <button
              onClick={onApply}
              className="flex-1 py-3 bg-emerald-500 text-white rounded-2xl font-black text-xs shadow-lg active:scale-95 transition-all"
            >
              {t('zakat.gold.applySave')}
            </button>
          </div>

        </div>
      </div>
  );
}
