import React, { useState } from 'react';
import { useI18n } from '../../../i18n/index';
import { useFormat } from '../../../core/hooks/useFormat';
import { parseNum, sanitizeNumericInput } from '../../../core/utils';

export function RetirementCalc() {
  const { t } = useI18n();
  const { fmt } = useFormat();
  const [age, setAge] = useState('30');
  const [retireAge, setRetireAge] = useState('60');
  const [monthly, setMonthly] = useState('2000');
  const [rate, setRate] = useState('7');

  const currentAge = Math.round(parseNum(age)) || 0;
  const targetAge = Math.round(parseNum(retireAge)) || 60;
  const contribution = parseNum(monthly) || 0;
  const R = (parseNum(rate) || 0) / 100 / 12;
  const months = (targetAge - currentAge) * 12;
  const has = months > 0 && contribution > 0;

  let total = 0;
  if (has && R > 0) {
    total = contribution * (Math.pow(1 + R, months) - 1) / R;
  } else if (has) {
    total = contribution * months;
  }
  const totalContributed = contribution * months;
  const interestEarned = total - totalContributed;

  return (
    <div className="p-4 space-y-5 animate-in fade-in duration-500">
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-600 to-teal-400 flex items-center justify-center shadow-xl shadow-cyan-500/30">
          <span className="material-symbols-outlined text-white text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>elderly</span>
        </div>
        <div>
          <h2 className="text-xl font-black text-slate-800 dark:text-white">{t('calc.retirement.title') || 'حاسبة التقاعد'}</h2>
          <p className="text-xs font-bold text-slate-400">{t('calc.retirement.desc') || 'خطط لمستقبلك المالي'}</p>
        </div>
      </div>

      {[
        { label: t('calc.retirement.currentAge') || 'عمرك الحالي', value: age, set: setAge, icon: 'person' },
        { label: t('calc.retirement.retireAge') || 'سن التقاعد المستهدف', value: retireAge, set: setRetireAge, icon: 'flag' },
        { label: t('calc.retirement.monthlyContribution') || 'الادخار الشهري', value: monthly, set: setMonthly, icon: 'account_balance' },
        { label: t('calc.retirement.returnRate') || 'العائد السنوي المتوقع (%)', value: rate, set: setRate, icon: 'trending_up' },
      ].map((f, i) => (
        <div key={i} className="bg-white dark:bg-[#1e2124] rounded-3xl border-2 border-slate-100 dark:border-slate-800 px-5 py-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-50 dark:bg-cyan-900/20 flex items-center justify-center">
            <span className="material-symbols-outlined text-lg text-cyan-500" style={{ fontVariationSettings: "'FILL' 1" }}>{f.icon}</span>
          </div>
          <div className="flex-1">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{f.label}</label>
            <input type="text" inputMode="decimal" dir="ltr" value={f.value} onChange={e => f.set(sanitizeNumericInput(e.target.value))} onCompositionEnd={e => f.set(sanitizeNumericInput(e.currentTarget.value))} className="w-full bg-transparent text-xl font-black text-slate-800 dark:text-white focus:outline-none" />
          </div>
        </div>
      ))}

      <div className={`rounded-[2rem] transition-all ${has ? 'opacity-100' : 'opacity-40'}`}>
        <div className="bg-gradient-to-br from-cyan-600 to-teal-500 p-0.5 rounded-[2rem]">
          <div className="bg-cyan-800/90 dark:bg-[#0a1e2e]/95 rounded-[1.875rem] p-5 space-y-3 text-center">
            <p className="text-cyan-200/60 text-[10px] font-black uppercase tracking-[0.3em]">{t('calc.retirement.totalAtRetirement') || 'رصيد التقاعد المتوقع'}</p>
            <p className="text-4xl font-black text-white drop-shadow-lg">{has ? fmt(total) : '—'}</p>
            {has && (
              <div className="flex justify-around pt-3 border-t border-white/10 text-xs">
                <div><p className="text-cyan-200/50 font-bold">{t('calc.retirement.yourContributions') || 'مساهماتك'}</p><p className="font-black text-white">{fmt(totalContributed)}</p></div>
                <div><p className="text-cyan-200/50 font-bold">{t('calc.retirement.compoundInterest') || 'عوائد الاستثمار'}</p><p className="font-black text-teal-300">+{fmt(interestEarned)}</p></div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
