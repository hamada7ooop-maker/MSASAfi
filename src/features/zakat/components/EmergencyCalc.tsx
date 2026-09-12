import React, { useState } from 'react';
import { useI18n } from '../../../i18n/index';
import { parseNum, sanitizeNumericInput } from '../../../core/utils';

/** حاسبة "كم شهراً تعيش بدون وظيفة" */
export function EmergencyCalc() {
  const { t } = useI18n();
  const [savings, setSavings] = useState('50000');
  const [monthlyExp, setMonthlyExp] = useState('5000');

  const S = parseNum(savings) || 0;
  const E = parseNum(monthlyExp) || 0;
  const months = E > 0 ? S / E : 0;
  const has = S > 0 && E > 0;

  const getStatus = () => {
    if (months >= 12) return { text: t('calc.emergency.status1') || 'وضع ممتاز 🎉', color: 'text-green-300', bg: 'from-green-600 to-emerald-500' };
    if (months >= 6) return { text: t('calc.emergency.status2') || 'وضع جيد 👍', color: 'text-yellow-300', bg: 'from-yellow-600 to-amber-500' };
    if (months >= 3) return { text: t('calc.emergency.status3') || 'يحتاج تحسين ⚠️', color: 'text-orange-300', bg: 'from-orange-600 to-red-500' };
    return { text: t('calc.emergency.status4') || 'وضع خطر 🚨', color: 'text-red-300', bg: 'from-red-600 to-rose-500' };
  };
  const status = getStatus();

  return (
    <div className="p-4 space-y-5 animate-in fade-in duration-500">
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-600 to-yellow-400 flex items-center justify-center shadow-xl shadow-amber-500/30">
          <span className="material-symbols-outlined text-white text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>shield</span>
        </div>
        <div>
          <h2 className="text-xl font-black text-slate-800 dark:text-white">{t('calc.emergency.title') || 'صندوق الطوارئ'}</h2>
          <p className="text-xs font-bold text-slate-400">{t('calc.emergency.desc') || 'كم شهراً يمكنك العيش بدون دخل؟'}</p>
        </div>
      </div>

      {[
        { label: t('calc.emergency.savings') || 'إجمالي مدخراتك', value: savings, set: setSavings, icon: 'account_balance' },
        { label: t('calc.emergency.monthlyExp') || 'مصروفك الشهري', value: monthlyExp, set: setMonthlyExp, icon: 'payments' },
      ].map((f, i) => (
        <div key={i} className="bg-white dark:bg-[#1e2124] rounded-3xl border-2 border-slate-100 dark:border-slate-800 px-5 py-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center">
            <span className="material-symbols-outlined text-lg text-amber-500" style={{ fontVariationSettings: "'FILL' 1" }}>{f.icon}</span>
          </div>
          <div className="flex-1">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{f.label}</label>
            <input type="text" inputMode="decimal" dir="ltr" value={f.value} onChange={e => f.set(sanitizeNumericInput(e.target.value))} onCompositionEnd={e => f.set(sanitizeNumericInput(e.currentTarget.value))} className="w-full bg-transparent text-xl font-black text-slate-800 dark:text-white focus:outline-none" />
          </div>
        </div>
      ))}

      <div className={`rounded-[2rem] transition-all ${has ? 'opacity-100' : 'opacity-40'}`}>
        <div className={`bg-gradient-to-br ${status.bg} p-0.5 rounded-[2rem]`}>
          <div className="relative bg-slate-900/90 rounded-[1.875rem] p-6 text-center overflow-hidden">
            <p className="text-white/50 text-[10px] font-black uppercase tracking-[0.3em] mb-2">{t('calc.emergency.safeTime') || 'مدة الأمان المالي'}</p>
            <div className="flex items-end justify-center gap-2 mb-2">
              <span className="text-6xl font-black text-white">{has ? months.toFixed(1) : '—'}</span>
              <span className="text-xl font-black text-white/60 mb-2">{t('calc.emergency.months') || 'شهر'}</span>
            </div>
            {has && <p className={`text-sm font-black ${status.color}`}>{status.text}</p>}
            {has && months < 6 && <p className="text-white/40 text-xs font-bold mt-2">{t('calc.emergency.advice') || 'يُنصح بتوفير 6-12 شهر من المصاريف كصندوق طوارئ'}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
