import React, { useState } from 'react';
import { useI18n } from '../../../i18n/index';
import { useFormat } from '../../../core/hooks/useFormat';
import { parseNum, sanitizeNumericInput } from '../../../core/utils';

export function LoanCalc() {
  const { t } = useI18n();
  const { fmt } = useFormat();
  const [amount, setAmount] = useState('500000');
  const [rate, setRate] = useState('4.5');
  const [years, setYears] = useState('25');

  const P = parseNum(amount) || 0;
  const R = (parseNum(rate) || 0) / 100 / 12;
  const N = (parseNum(years) || 0) * 12;
  const monthly = R > 0 && N > 0 ? P * R * Math.pow(1 + R, N) / (Math.pow(1 + R, N) - 1) : 0;
  const totalPaid = monthly * N;
  const totalInterest = totalPaid - P;
  const has = P > 0 && R > 0 && N > 0;

  return (
    <div className="p-4 space-y-5 animate-in fade-in duration-500">
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-rose-600 to-pink-400 flex items-center justify-center shadow-xl shadow-rose-500/30">
          <span className="material-symbols-outlined text-white text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>home</span>
        </div>
        <div>
          <h2 className="text-xl font-black text-slate-800 dark:text-white">{t('calc.loan.title') || 'حاسبة القرض'}</h2>
          <p className="text-xs font-bold text-slate-400">{t('calc.loan.desc') || 'عقاري، سيارة، أو شخصي'}</p>
        </div>
      </div>

      {[
        { label: t('calc.loanAmount') || 'مبلغ القرض', value: amount, set: setAmount, icon: 'account_balance' },
        { label: t('calc.rate') || 'نسبة الفائدة السنوية (%)', value: rate, set: setRate, icon: 'percent' },
        { label: t('calc.years') || 'مدة القرض (سنوات)', value: years, set: setYears, icon: 'calendar_month' },
      ].map((f, i) => (
        <div key={i} className="bg-white dark:bg-[#1e2124] rounded-3xl border-2 border-slate-100 dark:border-slate-800 px-5 py-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-900/20 flex items-center justify-center">
            <span className="material-symbols-outlined text-lg text-rose-500" style={{ fontVariationSettings: "'FILL' 1" }}>{f.icon}</span>
          </div>
          <div className="flex-1">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{f.label}</label>
            <input type="text" inputMode="decimal" dir="ltr" value={f.value} onChange={e => f.set(sanitizeNumericInput(e.target.value))} onCompositionEnd={e => f.set(sanitizeNumericInput(e.currentTarget.value))} className="w-full bg-transparent text-xl font-black text-slate-800 dark:text-white focus:outline-none" />
          </div>
        </div>
      ))}

      <div className={`rounded-[2rem] transition-all ${has ? 'opacity-100' : 'opacity-40'}`}>
        <div className="bg-gradient-to-br from-rose-600 to-pink-500 p-0.5 rounded-[2rem]">
          <div className="bg-rose-700/90 dark:bg-[#2e0a1a]/95 rounded-[1.875rem] p-5 space-y-3">
            <div className="flex justify-between"><span className="text-sm font-bold text-rose-100/70">{t('calc.monthlyPayment') || 'القسط الشهري'}</span><span className="text-xl font-black text-white">{has ? fmt(monthly) : '—'}</span></div>
            <div className="h-px bg-white/10" />
            <div className="flex justify-between"><span className="text-sm font-bold text-rose-100/70">{t('calc.totalInterest') || 'إجمالي الفوائد'}</span><span className="text-sm font-black text-pink-300">{has ? fmt(totalInterest) : '—'}</span></div>
            <div className="h-px bg-white/10" />
            <div className="flex justify-between"><span className="text-sm font-bold text-rose-100/70">{t('calc.totalPaid') || 'إجمالي المدفوع'}</span><span className="text-sm font-black text-white">{has ? fmt(totalPaid) : '—'}</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}
