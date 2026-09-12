import React, { useState } from 'react';
import { useI18n } from '../../../i18n/index';
import { useFormat } from '../../../core/hooks/useFormat';
import { parseNum, sanitizeNumericInput } from '../../../core/utils';

export function TipCalc() {
  const { t } = useI18n();
  const { fmt } = useFormat();
  const [bill, setBill] = useState('');
  const [tipPct, setTipPct] = useState('15');
  const [people, setPeople] = useState('1');

  const B = parseNum(bill) || 0;
  const T = parseNum(tipPct) || 0;
  const P = parseInt(people) || 1;
  const tip = B * T / 100;
  const total = B + tip;
  const perPerson = total / P;
  const has = B > 0;

  return (
    <div className="p-4 space-y-5 animate-in fade-in duration-500">
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-pink-600 to-rose-400 flex items-center justify-center shadow-xl shadow-pink-500/30">
          <span className="material-symbols-outlined text-white text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>restaurant</span>
        </div>
        <div>
          <h2 className="text-xl font-black text-slate-800 dark:text-white">{t('calc.tip.title') || 'حاسبة البقشيش'}</h2>
          <p className="text-xs font-bold text-slate-400">{t('calc.tip.desc') || 'قسّم الفاتورة بسهولة'}</p>
        </div>
      </div>

      <div className="bg-white dark:bg-[#1e2124] rounded-3xl border-2 border-slate-100 dark:border-slate-800 px-5 py-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-pink-50 dark:bg-pink-900/20 flex items-center justify-center">
          <span className="material-symbols-outlined text-lg text-pink-500" style={{ fontVariationSettings: "'FILL' 1" }}>receipt</span>
        </div>
        <div className="flex-1">
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{t('calc.tip.billAmount') || 'مبلغ الفاتورة'}</label>
          <input type="text" inputMode="decimal" dir="ltr" value={bill} onChange={e => setBill(sanitizeNumericInput(e.target.value))} onCompositionEnd={e => setBill(sanitizeNumericInput(e.currentTarget.value))} placeholder="0" className="w-full bg-transparent text-2xl font-black text-slate-800 dark:text-white focus:outline-none placeholder-slate-200 dark:placeholder-slate-700" />
        </div>
      </div>

      {/* Tip percentage chips */}
      <div>
        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 px-1">{t('calc.tip.tipPct') || 'نسبة البقشيش'}</label>
        <div className="flex gap-2">
          {['5', '10', '15', '20', '25'].map(p => (
            <button key={p} onClick={() => setTipPct(p)}
              className={`flex-1 py-3 rounded-2xl text-sm font-black transition-all ${tipPct === p ? 'bg-pink-500 text-white shadow-lg shadow-pink-500/30' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
              {p}%
            </button>
          ))}
        </div>
      </div>

      {/* People count */}
      <div className="bg-white dark:bg-[#1e2124] rounded-3xl border-2 border-slate-100 dark:border-slate-800 px-5 py-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-pink-50 dark:bg-pink-900/20 flex items-center justify-center">
          <span className="material-symbols-outlined text-lg text-pink-500" style={{ fontVariationSettings: "'FILL' 1" }}>group</span>
        </div>
        <div className="flex-1">
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{t('calc.tip.peopleCount') || 'عدد الأشخاص'}</label>
          <div className="flex items-center gap-4">
            <button onClick={() => setPeople(String(Math.max(1, P - 1)))} className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-black text-lg active:scale-90">−</button>
            <span className="text-2xl font-black text-slate-800 dark:text-white">{P}</span>
            <button onClick={() => setPeople(String(P + 1))} className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-black text-lg active:scale-90">+</button>
          </div>
        </div>
      </div>

      <div className={`rounded-[2rem] transition-all ${has ? 'opacity-100' : 'opacity-40'}`}>
        <div className="bg-gradient-to-br from-pink-600 to-rose-500 p-0.5 rounded-[2rem]">
          <div className="bg-pink-700/90 dark:bg-[#2e0a1e]/95 rounded-[1.875rem] p-5 space-y-3">
            <div className="flex justify-between"><span className="text-sm font-bold text-pink-100/70">{t('calc.tip.tipAmount') || 'البقشيش'}</span><span className="text-sm font-black text-rose-300">+{has ? fmt(tip) : '—'}</span></div>
            <div className="flex justify-between"><span className="text-sm font-bold text-pink-100/70">{t('calc.tip.total') || 'الإجمالي'}</span><span className="text-sm font-black text-white">{has ? fmt(total) : '—'}</span></div>
            {P > 1 && (<><div className="h-px bg-white/10" /><div className="flex justify-between"><span className="text-base font-black text-white">{t('calc.tip.perPerson') || 'لكل شخص'}</span><span className="text-2xl font-black text-white">{has ? fmt(perPerson) : '—'}</span></div></>)}
          </div>
        </div>
      </div>
    </div>
  );
}
