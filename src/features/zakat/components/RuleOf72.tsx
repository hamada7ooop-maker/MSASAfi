import React, { useState } from 'react';
import { useI18n } from '../../../i18n/index';
import { parseNum, sanitizeNumericInput } from '../../../core/utils';

export function RuleOf72() {
  const { t } = useI18n();
  const [rate, setRate] = useState('5');
  const [rateFocused, setRateFocused] = useState(false);

  const numRate = parseNum(rate) || 0;
  const years = numRate > 0 ? 72 / numRate : 0;
  const hasResult = numRate > 0;

  return (
    <div className="p-4 space-y-5 animate-in fade-in slide-in-from-bottom-3 duration-500">

      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-600 to-violet-400 flex items-center justify-center shadow-xl shadow-purple-500/30">
          <span className="material-symbols-outlined text-white text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>query_stats</span>
        </div>
        <div>
          <h2 className="text-xl font-black text-slate-800 dark:text-white tracking-tight">{t('rule72.title')}</h2>
          <p className="text-xs font-bold text-slate-400 dark:text-slate-500">{t('rule72.desc')}</p>
        </div>
      </div>

      {/* Info Card */}
      <div className="bg-purple-50 dark:bg-purple-900/10 rounded-2xl px-4 py-3 flex items-start gap-3 border border-purple-100 dark:border-purple-900/20">
        <span className="material-symbols-outlined text-purple-500 text-lg shrink-0 mt-0.5">info</span>
        <p className="text-xs font-bold text-slate-500 dark:text-slate-400 leading-relaxed">
          {t('rule72.desc')}
        </p>
      </div>

      {/* Input: نسبة العائد */}
      <div className={`relative bg-white dark:bg-[#1e2124] rounded-3xl border-2 transition-all duration-300 overflow-hidden ${rateFocused ? 'border-purple-500 shadow-xl shadow-purple-500/15' : 'border-slate-100 dark:border-slate-800'}`}>
        <div className="flex items-center gap-3 px-5 py-4">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all duration-300 ${rateFocused ? 'bg-purple-500 shadow-lg shadow-purple-500/30 scale-110' : 'bg-purple-50 dark:bg-purple-900/20'}`}>
            <span className={`material-symbols-outlined text-lg transition-colors duration-300 ${rateFocused ? 'text-white' : 'text-purple-500'}`} style={{ fontVariationSettings: "'FILL' 1" }}>trending_up</span>
          </div>
          <div className="flex-1 min-w-0">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
              {t('rule72.rate')}
            </label>
            <input
              type="text"
              inputMode="decimal"
              dir="ltr"
              value={rate}
              onChange={e => setRate(sanitizeNumericInput(e.target.value))}
              onCompositionEnd={e => setRate(sanitizeNumericInput(e.currentTarget.value))}
              onFocus={() => setRateFocused(true)}
              onBlur={() => setRateFocused(false)}
              placeholder="0"
              className="w-full bg-transparent text-2xl font-black text-slate-800 dark:text-white focus:outline-none placeholder-slate-200 dark:placeholder-slate-700"
            />
          </div>
          {/* Suggested rates */}
          <div className="flex flex-col gap-1.5 shrink-0">
            {['3', '5', '7', '10'].map(r => (
              <button
                key={r}
                onClick={() => setRate(r)}
                className={`px-2 py-0.5 rounded-lg text-[10px] font-black transition-all ${rate === r ? 'bg-purple-500 text-white shadow-md' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 hover:bg-purple-100 dark:hover:bg-purple-900/30'}`}
              >
                {r}%
              </button>
            ))}
          </div>
        </div>
        {rateFocused && <div className="h-0.5 bg-gradient-to-r from-purple-600 via-violet-400 to-purple-600 animate-in slide-in-from-left-full duration-300" />}
      </div>

      {/* Result Card - Glassmorphism Premium */}
      <div className={`transition-all duration-500 ${hasResult ? 'opacity-100 scale-100' : 'opacity-40 scale-95'}`}>
        <div className="bg-gradient-to-br from-purple-600 via-violet-600 to-indigo-600 p-0.5 rounded-[2rem]">
          <div className="relative bg-purple-700/90 dark:bg-[#1a0a2e]/95 rounded-[1.875rem] p-6 text-center overflow-hidden backdrop-blur-sm">
            
            {/* Background glow orb */}
            <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-40 h-40 bg-purple-400/20 rounded-full blur-3xl pointer-events-none" />
            
            {/* Label */}
            <p className="text-purple-200/70 text-[10px] font-black uppercase tracking-[0.3em] mb-3 relative z-10">
              {t('rule72.result')}
            </p>
            
            {/* Big Number */}
            <div className="relative z-10 mb-2">
              {hasResult ? (
                <div className="flex items-end justify-center gap-2">
                  <span className="text-6xl font-black text-white drop-shadow-2xl tracking-tight leading-none">
                    {years.toFixed(1)}
                  </span>
                  <span className="text-2xl font-black text-purple-200/70 mb-1">
                    {t('misc.years') || 'سنة'}
                  </span>
                </div>
              ) : (
                <span className="text-6xl font-black text-purple-300/40">—</span>
              )}
            </div>

            {/* Sub-info */}
            {hasResult && (
              <p className="relative z-10 text-purple-200/60 text-xs font-bold animate-in fade-in duration-500">
                {t('rule72.resultDesc', { rate: String(numRate), years: years.toFixed(1) })}
              </p>
            )}

          </div>
        </div>
      </div>

      {/* Formula explanation */}
      <div className="bg-slate-50 dark:bg-[#1e2124] rounded-2xl px-5 py-4 flex items-center gap-4 border border-slate-100 dark:border-slate-800">
        <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
          <span className="text-lg">📐</span>
        </div>
        <div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">{t('calc.formula')}</p>
          <p className="text-sm font-black text-slate-600 dark:text-slate-300 font-mono" dir="ltr">
            Years = 72 ÷ {numRate > 0 ? numRate : 'r'} {hasResult ? `= ${years.toFixed(2)}` : ''}
          </p>
        </div>
      </div>

    </div>
  );
}
