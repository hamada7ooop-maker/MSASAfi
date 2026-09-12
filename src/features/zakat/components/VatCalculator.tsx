import React, { useState } from 'react';
import { useI18n } from '../../../i18n/index';
import { useFormat } from '../../../core/hooks/useFormat';
import { parseNum, sanitizeNumericInput } from '../../../core/utils';

export function VatCalculator() {
  const { t } = useI18n();
  const { fmt } = useFormat();
  const [amount, setAmount] = useState('');
  const [rate, setRate] = useState('15');
  const [isInclusive, setIsInclusive] = useState(false);
  const [amountFocused, setAmountFocused] = useState(false);
  const [rateFocused, setRateFocused] = useState(false);

  const numAmount = parseNum(amount) || 0;
  const numRate = parseNum(rate) || 15;

  let baseAmount = 0, vatAmount = 0, totalAmount = 0;

  if (isInclusive) {
    totalAmount = numAmount;
    baseAmount = totalAmount / (1 + numRate / 100);
    vatAmount = totalAmount - baseAmount;
  } else {
    baseAmount = numAmount;
    vatAmount = baseAmount * (numRate / 100);
    totalAmount = baseAmount + vatAmount;
  }

  const hasResult = numAmount > 0;

  return (
    <div className="p-4 space-y-5 animate-in fade-in slide-in-from-bottom-3 duration-500">
      
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-600 to-sky-400 flex items-center justify-center shadow-xl shadow-blue-500/30">
          <span className="material-symbols-outlined text-white text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>receipt_long</span>
        </div>
        <div>
          <h2 className="text-xl font-black text-slate-800 dark:text-white tracking-tight">{t('vat.title') || 'حاسبة الضريبة'}</h2>
          <p className="text-xs font-bold text-slate-400 dark:text-slate-500">{t('vat.desc') || 'احتساب ضريبة القيمة المضافة'}</p>
        </div>
      </div>

      {/* Toggle: Exclusive / Inclusive */}
      <div className="relative flex bg-slate-100 dark:bg-slate-800/60 rounded-2xl p-1">
        <div
          className="absolute top-1 bottom-1 rounded-xl bg-white dark:bg-[#1e2124] shadow-md transition-all duration-300"
          style={{ 
            width: 'calc(50% - 4px)',
            left: isInclusive ? 'calc(50% + 2px)' : '4px'
          }}
        />
        <button
          onClick={() => setIsInclusive(false)}
          className={`relative flex-1 py-2.5 text-xs font-black rounded-xl transition-colors duration-300 z-10 ${!isInclusive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'}`}
        >
          {t('vat.exclusive') || 'بدون ضريبة'}
        </button>
        <button
          onClick={() => setIsInclusive(true)}
          className={`relative flex-1 py-2.5 text-xs font-black rounded-xl transition-colors duration-300 z-10 ${isInclusive ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'}`}
        >
          {t('vat.inclusive') || 'شامل الضريبة'}
        </button>
      </div>

      {/* Input: المبلغ */}
      <div className={`relative bg-white dark:bg-[#1e2124] rounded-3xl border-2 transition-all duration-300 overflow-hidden ${amountFocused ? 'border-blue-500 shadow-xl shadow-blue-500/15' : 'border-slate-100 dark:border-slate-800'}`}>
        <div className="flex items-center gap-3 px-5 py-4">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors duration-300 ${amountFocused ? 'bg-blue-500 shadow-lg shadow-blue-500/30' : 'bg-blue-50 dark:bg-blue-900/20'}`}>
            <span className={`material-symbols-outlined text-lg transition-colors duration-300 ${amountFocused ? 'text-white' : 'text-blue-500'}`} style={{ fontVariationSettings: "'FILL' 1" }}>payments</span>
          </div>
          <div className="flex-1 min-w-0">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{t('vat.amount') || 'المبلغ'}</label>
            <input
              type="text"
              inputMode="decimal"
              dir="ltr"
              value={amount}
              onChange={e => setAmount(sanitizeNumericInput(e.target.value))}
              onCompositionEnd={e => setAmount(sanitizeNumericInput(e.currentTarget.value))}
              onFocus={() => setAmountFocused(true)}
              onBlur={() => setAmountFocused(false)}
              placeholder="0"
              className="w-full bg-transparent text-xl font-black text-slate-800 dark:text-white focus:outline-none placeholder-slate-200 dark:placeholder-slate-700"
            />
          </div>
        </div>
        {amountFocused && <div className="h-0.5 bg-gradient-to-r from-blue-600 via-sky-400 to-blue-600 animate-in slide-in-from-left-full duration-300" />}
      </div>

      {/* Input: نسبة الضريبة */}
      <div className={`relative bg-white dark:bg-[#1e2124] rounded-3xl border-2 transition-all duration-300 overflow-hidden ${rateFocused ? 'border-sky-500 shadow-xl shadow-sky-500/15' : 'border-slate-100 dark:border-slate-800'}`}>
        <div className="flex items-center gap-3 px-5 py-4">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors duration-300 ${rateFocused ? 'bg-sky-500 shadow-lg shadow-sky-500/30' : 'bg-sky-50 dark:bg-sky-900/20'}`}>
            <span className={`material-symbols-outlined text-lg transition-colors duration-300 ${rateFocused ? 'text-white' : 'text-sky-500'}`} style={{ fontVariationSettings: "'FILL' 1" }}>percent</span>
          </div>
          <div className="flex-1 min-w-0">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{t('vat.rate') || 'نسبة الضريبة (%)'}</label>
            <input
              type="text"
              inputMode="decimal"
              dir="ltr"
              value={rate}
              onChange={e => setRate(sanitizeNumericInput(e.target.value))}
              onCompositionEnd={e => setRate(sanitizeNumericInput(e.currentTarget.value))}
              onFocus={() => setRateFocused(true)}
              onBlur={() => setRateFocused(false)}
              placeholder="15"
              className="w-full bg-transparent text-xl font-black text-slate-800 dark:text-white focus:outline-none placeholder-slate-200 dark:placeholder-slate-700"
            />
          </div>
          {/* Quick Rate Chips */}
          <div className="flex gap-1.5 shrink-0">
            {['5', '10', '15', '20'].map(r => (
              <button
                key={r}
                onClick={() => setRate(r)}
                className={`px-2 py-1 rounded-lg text-[10px] font-black transition-all ${rate === r ? 'bg-sky-500 text-white shadow-md' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 hover:bg-sky-100 dark:hover:bg-sky-900/30'}`}
              >
                {r}%
              </button>
            ))}
          </div>
        </div>
        {rateFocused && <div className="h-0.5 bg-gradient-to-r from-sky-600 via-blue-400 to-sky-600 animate-in slide-in-from-left-full duration-300" />}
      </div>

      {/* Result Card */}
      <div className={`rounded-[2rem] overflow-hidden transition-all duration-500 ${hasResult ? 'opacity-100 translate-y-0' : 'opacity-50'}`}>
        <div className="bg-gradient-to-br from-blue-600 via-blue-500 to-sky-500 p-0.5 rounded-[2rem]">
          <div className="bg-blue-600/95 dark:bg-[#0c2a4a]/95 rounded-[1.875rem] p-5 space-y-4 backdrop-blur-sm">
            
            {/* Row: المبلغ الأساسي */}
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-300/60" />
                <span className="text-sm font-bold text-blue-100/80">{t('vat.base') || 'المبلغ الأساسي'}</span>
              </div>
              <span className="text-sm font-black text-white">{hasResult ? fmt(baseAmount) : '—'}</span>
            </div>

            {/* Divider */}
            <div className="h-px bg-white/10" />

            {/* Row: مبلغ الضريبة */}
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-sky-300/60" />
                <span className="text-sm font-bold text-blue-100/80">{t('vat.tax') || 'قيمة الضريبة'} ({numRate}%)</span>
              </div>
              <span className="text-sm font-black text-sky-300">+{hasResult ? fmt(vatAmount) : '—'}</span>
            </div>

            {/* Divider */}
            <div className="h-px bg-white/10" />

            {/* Row: الإجمالي */}
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-base text-white/80">calculate</span>
                <span className="text-base font-black text-white">{t('vat.total') || 'الإجمالي'}</span>
              </div>
              <span className="text-2xl font-black text-white drop-shadow-lg">
                {hasResult ? fmt(totalAmount) : '—'}
              </span>
            </div>

          </div>
        </div>
      </div>

    </div>
  );
}
