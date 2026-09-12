import React, { useState } from 'react';
import { useI18n } from '../../../i18n/index';
import { useFormat } from '../../../core/hooks/useFormat';
import { parseNum, sanitizeNumericInput } from '../../../core/utils';

export function InflationCalc() {
  const { t } = useI18n();
  const { fmt } = useFormat();
  const [amount, setAmount] = useState('1000');
  const [rate, setRate] = useState('3');
  const [years, setYears] = useState('10');

  const A = parseNum(amount) || 0;
  const R = parseNum(rate) || 0;
  const T = parseNum(years) || 0;
  const futureValue = A * Math.pow(1 + R / 100, T);
  const purchasingPower = A / Math.pow(1 + R / 100, T);
  const loss = A - purchasingPower;
  const has = A > 0 && R > 0 && T > 0;

  return (
    <div className="p-4 space-y-5 animate-in fade-in duration-500">
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-600 to-amber-400 flex items-center justify-center shadow-xl shadow-orange-500/30">
          <span className="material-symbols-outlined text-white text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>local_fire_department</span>
        </div>
        <div>
          <h2 className="text-xl font-black text-slate-800 dark:text-white">{t('calc.inflation.title') || 'حاسبة التضخم'}</h2>
          <p className="text-xs font-bold text-slate-400">{t('calc.inflation.desc') || 'تأثير التضخم على قيمة أموالك'}</p>
        </div>
      </div>

      {[
        { label: t('vat.amount') || 'المبلغ الحالي', value: amount, set: setAmount, icon: 'payments' },
        { label: t('calc.inflationRate') || 'معدل التضخم السنوي (%)', value: rate, set: setRate, icon: 'trending_up' },
        { label: t('calc.years') || 'عدد السنوات', value: years, set: setYears, icon: 'calendar_month' },
      ].map((f, i) => (
        <div key={i} className="bg-white dark:bg-[#1e2124] rounded-3xl border-2 border-slate-100 dark:border-slate-800 px-5 py-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center">
            <span className="material-symbols-outlined text-lg text-orange-500" style={{ fontVariationSettings: "'FILL' 1" }}>{f.icon}</span>
          </div>
          <div className="flex-1">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{f.label}</label>
            <input type="text" inputMode="decimal" dir="ltr" value={f.value} onChange={e => f.set(sanitizeNumericInput(e.target.value))} onCompositionEnd={e => f.set(sanitizeNumericInput(e.currentTarget.value))} className="w-full bg-transparent text-xl font-black text-slate-800 dark:text-white focus:outline-none" />
          </div>
        </div>
      ))}

      <div className={`rounded-[2rem] transition-all ${has ? 'opacity-100' : 'opacity-40'}`}>
        <div className="bg-gradient-to-br from-orange-600 to-amber-500 p-0.5 rounded-[2rem]">
          <div className="bg-orange-700/90 dark:bg-[#2e1a0a]/95 rounded-[1.875rem] p-5 space-y-3">
            <div className="flex justify-between"><span className="text-sm font-bold text-orange-100/70">{t('calc.inflation.futureCost') || 'المبلغ المطلوب مستقبلاً لنفس القيمة'}</span><span className="text-sm font-black text-white">{has ? fmt(futureValue) : '—'}</span></div>
            <div className="h-px bg-white/10" />
            <div className="flex justify-between"><span className="text-sm font-bold text-orange-100/70">{t('calc.inflation.futureValue') || 'القوة الشرائية المستقبلية'}</span><span className="text-sm font-black text-amber-300">{has ? fmt(purchasingPower) : '—'}</span></div>
            <div className="h-px bg-white/10" />
            <div className="flex justify-between"><span className="text-sm font-bold text-orange-100/70">{t('calc.inflation.valueLost') || 'فقدان القيمة'}</span><span className="text-sm font-black text-red-300">-{has ? fmt(loss) : '—'}</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}
