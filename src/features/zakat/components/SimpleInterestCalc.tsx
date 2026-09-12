import React, { useState } from 'react';
import { useI18n } from '../../../i18n/index';
import { useFormat } from '../../../core/hooks/useFormat';
import { parseNum, sanitizeNumericInput } from '../../../core/utils';

export function SimpleInterestCalc() {
  const { t } = useI18n();
  const { fmt } = useFormat();
  const [principal, setPrincipal] = useState('10000');
  const [rate, setRate] = useState('5');
  const [years, setYears] = useState('3');

  const P = parseNum(principal) || 0;
  const R = parseNum(rate) || 0;
  const T = parseNum(years) || 0;
  const interest = P * R * T / 100;
  const total = P + interest;
  const has = P > 0 && R > 0 && T > 0;

  return (
    <div className="p-4 space-y-5 animate-in fade-in duration-500">
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-green-600 to-emerald-400 flex items-center justify-center shadow-xl shadow-green-500/30">
          <span className="material-symbols-outlined text-white text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>account_balance</span>
        </div>
        <div>
          <h2 className="text-xl font-black text-slate-800 dark:text-white">{t('calc.simpleInterest.title')}</h2>
          <p className="text-xs font-bold text-slate-400">{t('calc.simpleInterest.desc')}</p>
        </div>
      </div>

      {[
        { label: t('calc.principal'), value: principal, set: setPrincipal, icon: 'payments', color: 'green' },
        { label: t('calc.rate'), value: rate, set: setRate, icon: 'percent', color: 'emerald' },
        { label: t('calc.years'), value: years, set: setYears, icon: 'calendar_month', color: 'teal' },
      ].map((f, i) => (
        <div key={i} className="bg-white dark:bg-[#1e2124] rounded-3xl border-2 border-slate-100 dark:border-slate-800 px-5 py-4 flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl bg-${f.color}-50 dark:bg-${f.color}-900/20 flex items-center justify-center`}>
            <span className={`material-symbols-outlined text-lg text-${f.color}-500`} style={{ fontVariationSettings: "'FILL' 1" }}>{f.icon}</span>
          </div>
          <div className="flex-1">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{f.label}</label>
            <input type="text" inputMode="decimal" dir="ltr" value={f.value} onChange={e => f.set(sanitizeNumericInput(e.target.value))} onCompositionEnd={e => f.set(sanitizeNumericInput(e.currentTarget.value))} className="w-full bg-transparent text-xl font-black text-slate-800 dark:text-white focus:outline-none" />
          </div>
        </div>
      ))}

      <div className={`rounded-[2rem] transition-all ${has ? 'opacity-100' : 'opacity-40'}`}>
        <div className="bg-gradient-to-br from-green-600 to-emerald-500 p-0.5 rounded-[2rem]">
          <div className="bg-green-700/90 dark:bg-[#0a2e1a]/95 rounded-[1.875rem] p-5 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm font-bold text-green-100/70">{t('calc.interestEarned')}</span>
              <span className="text-sm font-black text-emerald-300">+{has ? fmt(interest) : '—'}</span>
            </div>
            <div className="h-px bg-white/10" />
            <div className="flex justify-between items-center">
              <span className="text-base font-black text-white">{t('vat.total')}</span>
              <span className="text-2xl font-black text-white">{has ? fmt(total) : '—'}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-slate-50 dark:bg-[#1e2124] rounded-2xl px-5 py-3 border border-slate-100 dark:border-slate-800">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{t('calc.formula')}</p>
        <p className="text-sm font-black text-slate-500 font-mono" dir="ltr">I = P × R × T = {P} × {R}% × {T}</p>
      </div>
    </div>
  );
}
