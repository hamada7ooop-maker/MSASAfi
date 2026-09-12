import React, { useState } from 'react';
import { useI18n } from '../../../i18n/index';
import { useFormat } from '../../../core/hooks/useFormat';
import { parseNum, sanitizeNumericInput } from '../../../core/utils';

export function ROICalc() {
  const { t } = useI18n();
  const { fmt } = useFormat();
  const [invested, setInvested] = useState('10000');
  const [returned, setReturned] = useState('15000');

  const I = parseNum(invested) || 0;
  const R = parseNum(returned) || 0;
  const profit = R - I;
  const roi = I > 0 ? (profit / I) * 100 : 0;
  const has = I > 0 && R > 0;

  return (
    <div className="p-4 space-y-5 animate-in fade-in duration-500">
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-600 to-purple-400 flex items-center justify-center shadow-xl shadow-violet-500/30">
          <span className="material-symbols-outlined text-white text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>monitoring</span>
        </div>
        <div>
          <h2 className="text-xl font-black text-slate-800 dark:text-white">{t('calc.roi.title')}</h2>
          <p className="text-xs font-bold text-slate-400">{t('calc.roi.desc')}</p>
        </div>
      </div>

      {[
        { label: t('calc.roi.cost'), value: invested, set: setInvested, icon: 'output' },
        { label: t('calc.roi.return'), value: returned, set: setReturned, icon: 'input' },
      ].map((f, i) => (
        <div key={i} className="bg-white dark:bg-[#1e2124] rounded-3xl border-2 border-slate-100 dark:border-slate-800 px-5 py-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-50 dark:bg-violet-900/20 flex items-center justify-center">
            <span className="material-symbols-outlined text-lg text-violet-500" style={{ fontVariationSettings: "'FILL' 1" }}>{f.icon}</span>
          </div>
          <div className="flex-1">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{f.label}</label>
            <input type="text" inputMode="decimal" dir="ltr" value={f.value} onChange={e => f.set(sanitizeNumericInput(e.target.value))} onCompositionEnd={e => f.set(sanitizeNumericInput(e.currentTarget.value))} className="w-full bg-transparent text-xl font-black text-slate-800 dark:text-white focus:outline-none" />
          </div>
        </div>
      ))}

      <div className={`rounded-[2rem] transition-all ${has ? 'opacity-100' : 'opacity-40'}`}>
        <div className="bg-gradient-to-br from-violet-600 to-purple-500 p-0.5 rounded-[2rem]">
          <div className="relative bg-violet-800/90 dark:bg-[#1a0a2e]/95 rounded-[1.875rem] p-6 text-center overflow-hidden">
            <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-40 h-40 bg-violet-400/20 rounded-full blur-3xl pointer-events-none" />
            <p className="text-violet-200/60 text-[10px] font-black uppercase tracking-[0.3em] mb-2 relative z-10">{t('calc.roi.title')}</p>
            <p className={`text-5xl font-black relative z-10 ${roi >= 0 ? 'text-green-300' : 'text-red-400'}`}>{has ? `${roi.toFixed(1)}%` : '—'}</p>
            {has && <p className={`text-sm font-black mt-2 relative z-10 ${profit >= 0 ? 'text-green-300/70' : 'text-red-300/70'}`}>{profit >= 0 ? '+' : ''}{fmt(profit)}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
