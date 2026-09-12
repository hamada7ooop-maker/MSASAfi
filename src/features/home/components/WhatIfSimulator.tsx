import React, { useState } from 'react';
import { useI18n } from '../../../i18n/index';
import { useFormat } from '../../../core/hooks/useFormat';
import { InfoModal } from '@/components/ui/InfoModal';

interface WhatIfSimulatorProps {
  categoryBreakdown: Record<string, number>;
}

export function WhatIfSimulator({ categoryBreakdown }: WhatIfSimulatorProps) {
  const { t, isLTR } = useI18n();
  const { fmt } = useFormat();
  const [pct, setPct] = useState(20);
  const [isWhatIfModalOpen, setIsWhatIfModalOpen] = useState(false);

  const topCatEntry = Object.entries(categoryBreakdown || {}).sort((a, b) => b[1] - a[1])[0];
  if (!topCatEntry) return null;

  const [topCatName, topCatAmount] = topCatEntry;
  const monthlySaving = topCatAmount * (pct / 100);
  const yearlySaving = monthlySaving * 12;

  // Calculate percentage for styling the track fill
  const fillPercentage = ((pct - 5) / 55) * 100;

  return (
    <div className="bg-white dark:bg-[#1c1f23] rounded-[32px] p-7 shadow-xl shadow-indigo-500/5 border border-slate-100 dark:border-slate-800 space-y-6">
      <div 
        className="flex items-center justify-between cursor-pointer group"
        onClick={() => setIsWhatIfModalOpen(true)}
      >
        <h3 className="font-black text-sm uppercase tracking-tighter flex items-center gap-2 group-hover:text-indigo-500 transition-colors">
          <span className="material-symbols-outlined text-indigo-500 text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>tune</span>
          {t('home.whatIfTitle')}
        </h3>
        <button className="w-8 h-8 rounded-full bg-slate-50 dark:bg-[#25282d] flex items-center justify-center text-slate-400 group-hover:text-indigo-500 transition-colors">
          <span className="material-symbols-outlined text-sm">info</span>
        </button>
      </div>

      <div className="flex items-start justify-between gap-4">
        <p className="text-xs text-slate-500 font-bold leading-relaxed flex-1">
          {t('home.whatIfIntro', { cat: t(`category.${topCatName}`) || topCatName })}
        </p>
        <div className="px-3 py-1.5 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-xl text-xs font-black shadow-lg shadow-indigo-500/20 transform hover:scale-105 transition-transform">
          {pct}%
        </div>
      </div>

      <div className="relative px-1 py-2">
        {/* Beautiful Gradient Background Track */}
        <div className="absolute top-1/2 left-1 right-1 -translate-y-1/2 h-3 bg-slate-100 dark:bg-slate-800 rounded-full shadow-inner overflow-hidden pointer-events-none">
           {/* Active Fill */}
           <div 
             className="absolute top-0 bottom-0 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 transition-all duration-300 ease-out"
             style={{ 
               width: `${fillPercentage}%`, 
               [isLTR ? 'left' : 'right']: 0 
             }}
           ></div>
        </div>
        
        {/* Invisible Range Input with Custom Thumb */}
        <input 
          type="range" 
          min="5" 
          max="60" 
          step="5"
          value={pct}
          onChange={(e) => setPct(parseInt(e.target.value))}
          className="relative w-full h-3 appearance-none bg-transparent cursor-pointer z-10 focus:outline-none
                     [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-7 [&::-webkit-slider-thumb]:h-7 
                     [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full 
                     [&::-webkit-slider-thumb]:shadow-[0_2px_10px_rgba(0,0,0,0.15)] 
                     [&::-webkit-slider-thumb]:border-4 [&::-webkit-slider-thumb]:border-indigo-500 
                     [&::-webkit-slider-thumb]:transition-transform hover:[&::-webkit-slider-thumb]:scale-110 active:[&::-webkit-slider-thumb]:scale-95
                     [&::-moz-range-thumb]:w-7 [&::-moz-range-thumb]:h-7 
                     [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:rounded-full 
                     [&::-moz-range-thumb]:shadow-[0_2px_10px_rgba(0,0,0,0.15)] 
                     [&::-moz-range-thumb]:border-4 [&::-moz-range-thumb]:border-indigo-500 
                     [&::-moz-range-thumb]:transition-transform hover:[&::-moz-range-thumb]:scale-110 active:[&::-moz-range-thumb]:scale-95"
        />
        
        {/* Value Markers */}
        <div className="flex justify-between mt-4 text-[9px] font-black text-slate-400 uppercase tracking-widest px-2">
          <span>5%</span>
          <span className="text-slate-300 dark:text-slate-600">30%</span>
          <span>60%</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-3xl border border-indigo-100/50 dark:border-indigo-800/30 flex flex-col items-center text-center">
          <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">
            {t('home.whatIfMonthly')}
          </p>
          <p className="font-black text-indigo-700 dark:text-indigo-300 text-lg">
            {fmt(monthlySaving)}
          </p>
        </div>
        <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-3xl border border-emerald-100/50 dark:border-emerald-800/30 flex flex-col items-center text-center">
          <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1">
            {t('home.whatIfYearly')}
          </p>
          <p className="font-black text-emerald-700 dark:text-emerald-300 text-lg">
            {fmt(yearlySaving)}
          </p>
        </div>
      </div>

      <InfoModal
        isOpen={isWhatIfModalOpen}
        onClose={() => setIsWhatIfModalOpen(false)}
        title={t('home.whatIfExplainTitle') || 'سحر التوفير التراكمي'}
        description={t('home.whatIfExplainBody') || 'هذه الأداة تحاكي قوة "التأثير التراكمي" في عالم المال. استقطاع نسبة بسيطة من أكثر مصاريفك قد لا يبدو مهماً اليوم، لكنه يصنع ثروة بنهاية العام.'}
        headerIcon="auto_graph"
        headerIconColorClass="text-indigo-400"
        headerIconBgClass="bg-indigo-500/10 border-indigo-500/20 shadow-indigo-500/10"
        points={[
          {
            icon: 'trending_down',
            iconColorClass: 'text-indigo-400',
            iconBgClass: 'bg-indigo-500/10 border-indigo-500/20',
            title: t('home.whatIfPoint1Title') || 'تخفيض المصاريف الكبيرة',
            titleColorClass: 'text-indigo-300',
            body: ' ' + (t('home.whatIfPoint1Body') || 'نحن نحدد الفئة التي تستهلك الجزء الأكبر من ميزانيتك ونقترح عليك نسبة بسيطة لتوفيرها.')
          },
          {
            icon: 'account_balance_wallet',
            iconColorClass: 'text-emerald-400',
            iconBgClass: 'bg-emerald-500/10 border-emerald-500/20',
            title: t('home.whatIfPoint2Title') || 'العائد السنوي المتوقع',
            titleColorClass: 'text-emerald-300',
            body: ' ' + (t('home.whatIfPoint2Body') || 'التوفير الشهري يتضاعف على مدار 12 شهراً، مما يُظهر لك قدرتك الحقيقية على الادخار دون مجهود كبير.')
          }
        ]}
      />
    </div>
  );
}
