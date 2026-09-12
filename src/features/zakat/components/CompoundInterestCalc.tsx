import React, { useState } from 'react';
import { useI18n } from '../../../i18n/index';
import { useFormat } from '../../../core/hooks/useFormat';
import { parseNum, sanitizeNumericInput } from '../../../core/utils';

export function CompoundInterestCalc() {
  const { t } = useI18n();
  const { fmt } = useFormat();
  const [principal, setPrincipal] = useState('10000');
  const [rate, setRate] = useState('7');
  const [years, setYears] = useState('10');
  const [compound, setCompound] = useState('12'); // times per year

  const P = parseNum(principal) || 0;
  const R = parseNum(rate) || 0;
  const T = parseNum(years) || 0;
  const N = parseNum(compound) || 12;
  const total = P * Math.pow(1 + R / 100 / N, N * T);
  const interest = total - P;
  const has = P > 0 && R > 0 && T > 0;

  return (
    <div className="p-4 space-y-5 animate-in fade-in duration-500">
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-600 to-blue-400 flex items-center justify-center shadow-xl shadow-indigo-500/30">
          <span className="material-symbols-outlined text-white text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>show_chart</span>
        </div>
        <div>
          <h2 className="text-xl font-black text-slate-800 dark:text-white">{t('calc.compoundInterest.title')}</h2>
          <p className="text-xs font-bold text-slate-400">{t('calc.compoundInterest.desc')}</p>
        </div>
      </div>

      {[
        { label: t('calc.principal'), value: principal, set: setPrincipal, icon: 'payments' },
        { label: t('calc.rate'), value: rate, set: setRate, icon: 'percent' },
        { label: t('calc.years'), value: years, set: setYears, icon: 'calendar_month' },
      ].map((f, i) => (
        <div key={i} className="bg-white dark:bg-[#1e2124] rounded-3xl border-2 border-slate-100 dark:border-slate-800 px-5 py-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 flex items-center justify-center">
            <span className="material-symbols-outlined text-lg text-indigo-500" style={{ fontVariationSettings: "'FILL' 1" }}>{f.icon}</span>
          </div>
          <div className="flex-1">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{f.label}</label>
            <input type="text" inputMode="decimal" dir="ltr" value={f.value} onChange={e => f.set(sanitizeNumericInput(e.target.value))} onCompositionEnd={e => f.set(sanitizeNumericInput(e.currentTarget.value))} className="w-full bg-transparent text-xl font-black text-slate-800 dark:text-white focus:outline-none" />
          </div>
        </div>
      ))}

      {/* Compound frequency */}
      <div className="flex gap-2">
        {[
          { v: '1', l: t('calc.freq.yearly') }, 
          { v: '4', l: t('calc.freq.quarterly') }, 
          { v: '12', l: t('calc.freq.monthly') }, 
          { v: '365', l: t('calc.freq.daily') }
        ].map(o => (
          <button key={o.v} onClick={() => setCompound(o.v)}
            className={`flex-1 py-2.5 rounded-2xl text-xs font-black transition-all ${compound === o.v ? 'bg-indigo-500 text-white shadow-lg' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
            {o.l}
          </button>
        ))}
      </div>

      <div className={`rounded-[2rem] transition-all ${has ? 'opacity-100' : 'opacity-40'}`}>
        <div className="bg-gradient-to-br from-indigo-600 to-blue-500 p-0.5 rounded-[2rem]">
          <div className="bg-indigo-700/90 dark:bg-[#0a0a2e]/95 rounded-[1.875rem] p-5 space-y-3">
            <div className="flex justify-between"><span className="text-sm font-bold text-indigo-100/70">{t('calc.principal')}</span><span className="text-sm font-black text-white">{fmt(P)}</span></div>
            <div className="h-px bg-white/10" />
            <div className="flex justify-between"><span className="text-sm font-bold text-indigo-100/70">{t('calc.interestEarned')}</span><span className="text-sm font-black text-blue-300">+{has ? fmt(interest) : '—'}</span></div>
            <div className="h-px bg-white/10" />
            <div className="flex justify-between items-center">
              <span className="text-base font-black text-white">{t('vat.total')}</span>
              <span className="text-2xl font-black text-white">{has ? fmt(total) : '—'}</span>
            </div>
            {has && <p className="text-indigo-200/50 text-[10px] font-bold text-center">{t('calc.compoundInterest.growthInsight', { growth: ((total / P - 1) * 100).toFixed(1), years: String(T) })}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
