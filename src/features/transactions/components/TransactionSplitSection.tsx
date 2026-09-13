import React from 'react';
import { useI18n } from '../../../i18n/index';
import { useFormat } from '../../../core/hooks/useFormat';
import { useSettingsStore } from '../../../store/settingsStore';
import { toast } from '../../../toast';

export interface TransactionSplit {
  category: string;
  amount: string;
  description?: string;
}

interface TransactionSplitSectionProps {
  /** Only expenses can be split; the caller still owns that decision. */
  isSplitEnabled: boolean;
  setIsSplitEnabled: (v: boolean) => void;
  splits: TransactionSplit[];
  setSplits: React.Dispatch<React.SetStateAction<TransactionSplit[]>>;
  /** The parent transaction's total, used to validate the distribution. */
  amount: string;
  setAmount: (v: string) => void;
  /** Seeds the first split row when the feature is switched on. */
  selectedCategory: string;
  categories: Array<{ id?: string; name: string; icon?: string; type?: string }>;
}

/**
 * Splitting one expense across several categories.
 *
 * Extracted verbatim from AddTransactionPage, which had grown to 1315 lines.
 * This was the largest self-contained block in that file and the only one with
 * real arithmetic in it, so it is the piece that benefits most from living on
 * its own where it can be read and tested directly.
 */
export function TransactionSplitSection({
  isSplitEnabled,
  setIsSplitEnabled,
  splits,
  setSplits,
  amount,
  setAmount,
  selectedCategory,
  categories,
}: TransactionSplitSectionProps) {
  const { t, isLTR } = useI18n();
  const { parseNum, sanitizeNumericInput } = useFormat();
  const decimalPlaces = useSettingsStore((s) => s.decimalPlaces);

  return (
  <section className="bg-slate-50/50 dark:bg-slate-900/40 rounded-[2rem] p-6 border border-slate-100 dark:border-slate-800/30 shadow-inner space-y-4">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-4 text-right rtl:text-right">
        <div className="w-10 h-10 rounded-2xl bg-violet-50 dark:bg-violet-900/20 text-violet-500 flex items-center justify-center">
          <span className="material-symbols-outlined">call_split</span>
        </div>
        <div>
          <span className="font-bold text-sm text-[#002b59] dark:text-blue-100 block">
            {t('travel.splitTransaction')}
          </span>
          <span className="text-[10px] text-slate-400 font-bold">
            {t('travel.splitAcrossCategories')}
          </span>
        </div>
      </div>
      <button 
        type="button"
        onClick={() => {
          setIsSplitEnabled(!isSplitEnabled);
          if (!isSplitEnabled && splits.length === 0) {
            setSplits([{ category: selectedCategory, amount: amount }]);
          }
        }}
        className={`w-10 h-6 rounded-full flex p-1 transition-colors relative cursor-pointer ${isSplitEnabled ? 'bg-violet-500' : 'bg-slate-200 dark:bg-slate-700'}`}
      >
        <div className={`w-4 h-4 bg-white rounded-full transition-transform ${isSplitEnabled ? (isLTR ? 'translate-x-4' : '-translate-x-4') : 'translate-x-0'}`}></div>
      </button>
    </div>

    {isSplitEnabled && (
      <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800/30 animate-in fade-in duration-300">
        {splits.map((s, idx) => (
          <div key={idx} className="flex gap-2 items-center bg-slate-100/50 dark:bg-slate-800/30 p-3 rounded-2xl">
            <div className="flex-1 text-right rtl:text-right">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                {t('settings.categories')}
              </label>
              <select
                value={s.category}
                onChange={(e) => {
                  const newSplits = [...splits];
                  newSplits[idx].category = e.target.value;
                  setSplits(newSplits);
                }}
                className="w-full bg-transparent border-none outline-none font-bold text-xs text-[#002b59] dark:text-blue-100"
              >
                <option value="">{t('travel.selectTrip') || 'Select...'}</option>
                {categories.filter(c => c.type === 'expense' || c.type === 'both').map(c => (
                  <option key={c.id} value={c.name}>{t(c.name)}</option>
                ))}
              </select>
            </div>

            <div className="w-24 text-right rtl:text-right">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                {t('txn.amount')}
              </label>
              <input
                type="text"
                inputMode="decimal"
                dir="ltr"
                autoComplete="off"
                value={s.amount}
                onChange={(e) => {
                  const newSplits = [...splits];
                  newSplits[idx].amount = sanitizeNumericInput(e.target.value);
                  setSplits(newSplits);
                }}
                onCompositionEnd={(e) => {
                  const newSplits = [...splits];
                  newSplits[idx].amount = sanitizeNumericInput((e.target as HTMLInputElement).value);
                  setSplits(newSplits);
                }}
                placeholder="0.00"
                className="w-full bg-transparent border-none outline-none font-bold text-xs text-[#002b59] dark:text-blue-100 placeholder:text-slate-300"
              />
            </div>

            <div className="flex-1 text-right rtl:text-right">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">
                {t('txn.description')}
              </label>
              <input
                type="text"
                dir="auto"
                autoComplete="off"
                value={s.description || ''}
                onChange={(e) => {
                  const newSplits = [...splits];
                  newSplits[idx].description = e.target.value;
                  setSplits(newSplits);
                }}
                onCompositionEnd={(e) => {
                  const newSplits = [...splits];
                  newSplits[idx].description = (e.target as HTMLInputElement).value;
                  setSplits(newSplits);
                }}
                placeholder={t('txn.splitDescPh') || 'Split description...'}
                className="w-full bg-transparent border-none outline-none font-bold text-xs text-[#002b59] dark:text-blue-100 placeholder:text-slate-300"
              />
            </div>

            <button
              type="button"
              onClick={() => {
                setSplits(splits.filter((_, i) => i !== idx));
              }}
              className="w-8 h-8 rounded-full bg-rose-50 dark:bg-rose-900/10 text-rose-600 dark:text-rose-400 flex items-center justify-center active:scale-90 transition-all mt-3"
            >
              <span className="material-symbols-outlined text-sm">delete</span>
            </button>
          </div>
        ))}

        <button
          type="button"
          onClick={() => {
            setSplits([...splits, { category: '', amount: '', description: '' }]);
          }}
          className="w-full py-3 rounded-2xl bg-violet-50 dark:bg-violet-900/10 text-violet-600 dark:text-violet-400 font-black text-xs active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <span className="material-symbols-outlined text-sm">add</span>
          {t('travel.splitAddCategory')}
        </button>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => {
              const totalVal = parseNum(amount) || 0;
              if (totalVal <= 0 || splits.length === 0) return;
              const count = splits.length;
              const shareVal = parseFloat((totalVal / count).toFixed(decimalPlaces));
              const newSplits = splits.map(s => ({
                ...s,
                amount: shareVal.toFixed(decimalPlaces)
              }));
              setSplits(newSplits);
              toast(t('travel.splitEqually') + ' ✓', 'success');
            }}
            disabled={splits.length === 0 || parseNum(amount) <= 0}
            className="py-2.5 rounded-2xl bg-indigo-50/50 hover:bg-indigo-50 dark:bg-indigo-950/20 dark:hover:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-bold text-[10px] active:scale-95 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
          >
            <span className="material-symbols-outlined text-xs">balance</span>
            {t('travel.splitEqually') || 'Distribute equally'}
          </button>

          <button
            type="button"
            onClick={() => {
              setSplits([{ category: selectedCategory, amount: amount, description: '' }]);
              toast(t('travel.splitReset') + ' ✓', 'info');
            }}
            className="py-2.5 rounded-2xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/40 dark:hover:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-bold text-[10px] active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <span className="material-symbols-outlined text-xs">restart_alt</span>
            {t('travel.splitReset') || 'Reset'}
          </button>
        </div>

        {/* Calculations & Status Messages */}
        {(() => {
          const totalVal = parseNum(amount) || 0;
          const distributed = splits.reduce((sum, s) => sum + (parseNum(s.amount) || 0), 0);
          const remaining = totalVal - distributed;

          const hasEmptyOrZeroAmount = splits.some(s => !s.amount || parseNum(s.amount) <= 0);
          const hasEmptyCategory = splits.some(s => !s.category);
          const categoriesSelected = splits.map(s => s.category).filter(Boolean);
          const hasDuplicateCategory = categoriesSelected.some((cat, idx) => categoriesSelected.indexOf(cat) !== idx);

          const isPerfect = splits.length >= 2 && Math.abs(remaining) < 0.005 && !hasEmptyOrZeroAmount && !hasEmptyCategory && !hasDuplicateCategory;
          const showDiscrepancy = Math.abs(remaining) >= 0.005 || (splits.length >= 2 && !isPerfect);

          return (
            <div className="pt-2">
              {isPerfect ? (
                <div className="p-4 rounded-3xl bg-green-500/10 dark:bg-green-500/5 border border-green-500/20 text-green-600 dark:text-green-400 text-center font-bold text-[11px] flex flex-col gap-1.5 items-center justify-center animate-in fade-in duration-300">
                  <span className="material-symbols-outlined text-lg animate-bounce">check_circle</span>
                  <span>{t('travel.splitPerfect') || 'تم توزيع المبلغ بالكامل بنجاح! 🎉'}</span>
                </div>
              ) : showDiscrepancy ? (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="p-4 rounded-3xl bg-rose-500/10 dark:bg-rose-500/5 border border-rose-500/20 text-rose-600 dark:text-rose-400 font-bold text-[11px] space-y-2">
                    <div className="flex items-center justify-center gap-1.5 text-rose-500 mb-1">
                      <span className="material-symbols-outlined text-lg animate-pulse">warning</span>
                      <span className="font-black">
                        {hasDuplicateCategory
                          ? t('txn.splitDuplicateCategoryWarning')
                          : hasEmptyOrZeroAmount || hasEmptyCategory
                          ? t('txn.splitIncompleteWarning')
                          : t('txn.splitDiscrepancyWarning')}
                      </span>
                    </div>
                    
                    <div className="space-y-1.5 pt-1.5 border-t border-rose-500/15 text-center leading-relaxed">
                      <p className="text-[11px]">
                        <span className={remaining > 0 ? "text-amber-500 font-black" : remaining < 0 ? "text-rose-500 font-black" : "text-slate-500 dark:text-slate-400 font-black"}>
                          {t('txn.splitRemainingUndistributed', { amount: remaining.toFixed(decimalPlaces) })}
                        </span>
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 font-black">
                        {t('txn.splitMismatchDesc', {
                          distributed: distributed.toFixed(decimalPlaces),
                          total: totalVal.toFixed(decimalPlaces)
                        })}
                      </p>
                    </div>
                  </div>

                  {/* Solver Action Grid */}
                  {splits.length > 0 && (
                    <div className="p-4 rounded-3xl backdrop-blur-md bg-white/40 dark:bg-slate-900/40 border border-white/20 dark:border-slate-800/40 shadow-xl space-y-4">
                      <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider text-center flex items-center justify-center gap-1.5">
                        <span className="material-symbols-outlined text-sm text-indigo-500">lightbulb</span>
                        {t('txn.splitSolveSelect')}
                      </p>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            const newSplits = [...splits];
                            const lastIdx = newSplits.length - 1;
                            const currentLastAmt = parseNum(newSplits[lastIdx].amount) || 0;
                            const adjustedAmt = Math.max(0, currentLastAmt + remaining);
                            newSplits[lastIdx] = {
                              ...newSplits[lastIdx],
                              amount: adjustedAmt.toFixed(decimalPlaces)
                            };
                            setSplits(newSplits);
                            toast(t('txn.splitSolveLastSuccess'), 'success');
                          }}
                          className="p-3 text-right rounded-2xl bg-indigo-50/50 hover:bg-indigo-50 dark:bg-indigo-950/20 dark:hover:bg-indigo-950/40 border border-indigo-500/10 active:scale-[0.98] transition-all flex flex-col gap-1 cursor-pointer group"
                        >
                          <span className="font-black text-xs text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-sm group-hover:rotate-12 transition-transform">magic_button</span>
                            {t('txn.splitSolveLastCategory')}
                          </span>
                          <span className="text-[9px] text-slate-400 dark:text-slate-500 font-bold leading-normal">
                            {t('txn.splitSolveLastCategoryDesc')}
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            const remainingCents = Math.round(remaining * 100);
                            const sign = Math.sign(remainingCents);
                            let absCents = Math.abs(remainingCents);
                            
                            const newSplits = splits.map(s => ({ ...s }));
                            let idx = 0;
                            while (absCents > 0 && newSplits.length > 0) {
                              const currentAmtCents = Math.round((parseNum(newSplits[idx].amount) || 0) * 100);
                              const adjustedCents = Math.max(0, currentAmtCents + sign);
                              newSplits[idx].amount = (adjustedCents / 100).toFixed(decimalPlaces);
                              absCents--;
                              idx = (idx + 1) % newSplits.length;
                            }
                            setSplits(newSplits);
                            toast(t('txn.splitSolveSeqSuccess'), 'success');
                          }}
                          className="p-3 text-right rounded-2xl bg-emerald-50/50 hover:bg-emerald-50 dark:bg-emerald-950/20 dark:hover:bg-emerald-950/40 border border-emerald-500/10 active:scale-[0.98] transition-all flex flex-col gap-1 cursor-pointer group"
                        >
                          <span className="font-black text-xs text-emerald-600 dark:emerald-400 flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-sm group-hover:scale-110 transition-transform">balance</span>
                            {t('txn.splitSolveSequentially')}
                          </span>
                          <span className="text-[9px] text-slate-400 dark:text-slate-500 font-bold leading-normal">
                            {t('txn.splitSolveSequentiallyDesc')}
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setAmount(distributed.toFixed(decimalPlaces));
                            toast(t('txn.splitSolveTotalSuccess'), 'success');
                          }}
                          className="p-3 text-right rounded-2xl bg-amber-50/50 hover:bg-amber-50 dark:bg-amber-950/20 dark:hover:bg-amber-950/40 border border-amber-500/10 active:scale-[0.98] transition-all flex flex-col gap-1 cursor-pointer group"
                        >
                          <span className="font-black text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-sm group-hover:translate-x-0.5 transition-transform">ads_click</span>
                            {t('txn.splitSolveUpdateTotal')}
                          </span>
                          <span className="text-[9px] text-slate-400 dark:text-slate-500 font-bold leading-normal">
                            {t('txn.splitSolveUpdateTotalDesc', {
                              distributed: distributed.toFixed(decimalPlaces),
                              total: totalVal.toFixed(decimalPlaces)
                            })}
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            const newSplits = splits.map(s => {
                              const rounded = Math.round(parseNum(s.amount) || 0);
                              return { ...s, amount: rounded.toFixed(decimalPlaces) };
                            });
                            const newSum = newSplits.reduce((sum, s) => sum + (parseNum(s.amount) || 0), 0);
                            setSplits(newSplits);
                            setAmount(newSum.toFixed(decimalPlaces));
                            toast(t('txn.splitSolveRoundSuccess'), 'success');
                          }}
                          className="p-3 text-right rounded-2xl bg-sky-50/50 hover:bg-sky-50 dark:bg-sky-950/20 dark:hover:bg-sky-950/40 border border-sky-500/10 active:scale-[0.98] transition-all flex flex-col gap-1 cursor-pointer group"
                        >
                          <span className="font-black text-xs text-sky-600 dark:text-sky-400 flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-sm group-hover:rotate-45 transition-transform">pin</span>
                            {t('txn.splitSolveRoundAll')}
                          </span>
                          <span className="text-[9px] text-slate-400 dark:text-slate-500 font-bold leading-normal">
                            {t('txn.splitSolveRoundAllDesc')}
                          </span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          );
        })()}
      </div>
    )}
  </section>
  );
}
