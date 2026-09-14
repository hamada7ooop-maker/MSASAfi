import React, { useState } from 'react';
import { useI18n } from '../../../i18n/index';
import { InfoModal } from '@/components/ui/InfoModal';

interface AIPulseProps {
  sustainability: {
    status: 'sunny' | 'cloudy' | 'stormy';
    basis: 'budget' | 'income';
    daysLeft: number;
  } | null;
}

/**
 * AIPulse Component - Displays the financial sustainability "Pulse".
 */
export const AIPulse = React.memo(function AIPulse({ sustainability }: AIPulseProps) {
  const { t } = useI18n();
  const [isPulseModalOpen, setIsPulseModalOpen] = useState(false);

  if (!sustainability) return null;

  const statuses = {
    sunny: { 
      icon: '🎯', 
      color: 'text-emerald-500', 
      bg: 'from-emerald-500/10 to-transparent', 
      label: t('home.pulse.stable'), 
      sub: t('home.pulse.stableSub'),
      dot: 'bg-emerald-500'
    },
    cloudy: { 
      icon: '⚠️', 
      color: 'text-amber-500', 
      bg: 'from-amber-500/10 to-transparent', 
      label: t('home.pulse.warning'), 
      sub: t('home.pulse.warningSub'),
      dot: 'bg-amber-400'
    },
    stormy: { 
      icon: '🚨', 
      color: 'text-red-500', 
      bg: 'from-red-500/10 to-transparent', 
      label: t('home.pulse.danger'), 
      sub: t('home.pulse.dangerSub'),
      dot: 'bg-red-500'
    }
  };

  const cur = statuses[sustainability.status] || statuses.sunny;

  return (
    <>
      <div className={`fin-card bg-gradient-to-br ${cur.bg} dark:bg-slate-800/40 p-7 flex flex-col relative overflow-hidden group hover:shadow-xl transition-all duration-500`}>
        <div className="z-10 w-full mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-1.5 h-1.5 rounded-full ${cur.dot} animate-pulse`}></div>
            <h3 className="text-premium-header text-[10px] uppercase tracking-[0.2em] opacity-40">{t('home.pulse.statusTitle')}</h3>
          </div>
          <button 
            onClick={() => setIsPulseModalOpen(true)}
            className="w-8 h-8 rounded-full bg-black/5 dark:bg-white/5 flex items-center justify-center text-slate-400 hover:text-blue-500 transition-colors"
            title={t('home.pulseExplainTitle') || 'النبض المالي'}
          >
            <span className="material-symbols-outlined text-base" aria-hidden="true">info</span>
          </button>
        </div>
        
        <div className="z-10 flex items-center justify-between w-full mt-2">
           <div>
             <p className={`text-2xl font-black ${cur.color} mb-1 tracking-tighter`}>{cur.label}</p>
             <p className="text-[11px] text-slate-500 dark:text-slate-400 font-bold max-w-[140px] leading-tight">{cur.sub}</p>
           </div>
           <div className="text-6xl filter drop-shadow-[0_8px_16px_rgba(0,0,0,0.1)] group-hover:scale-110 transition-transform duration-700">{cur.icon}</div>
        </div>
        
        <div className="z-10 w-full mt-6 bg-white/60 dark:bg-black/20 backdrop-blur-md rounded-2xl p-4 border border-white/40 dark:border-white/5 flex items-center justify-between">
           <div className="flex items-center gap-2">
             <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
               {sustainability.basis === 'budget' ? t('home.pulse.basisBudget') : t('home.pulse.basisIncome')}
             </span>
           </div>
           {sustainability.status === 'stormy' && sustainability.daysLeft > 0 && (
             <p className="text-[10px] text-red-500 bg-red-100 dark:bg-red-900/30 px-3 py-1 rounded-full font-black animate-bounce shadow-sm">
               {sustainability.daysLeft} {t('home.pulse.daysLeftSuffix')}
             </p>
           )}
        </div>
      </div>

      <InfoModal
        isOpen={isPulseModalOpen}
        onClose={() => setIsPulseModalOpen(false)}
        title={t('home.pulseExplainTitle') || 'النبض المالي'}
        description={t('home.pulseExplainBody') || 'نحن نحلل سرعة إنفاقك بناءً على ميزانياتك المحددة أولاً لضمان انضباطك المالي، وفي حال عدم وجود ميزانية نعتمد على دخلك المتبقي لتنبيهك.'}
        headerIcon="monitor_heart"
        headerIconColorClass="text-indigo-400"
        headerIconBgClass="bg-indigo-500/10 border-indigo-500/20 shadow-indigo-500/10"
        points={[
          {
            icon: '🎯',
            iconColorClass: 'text-emerald-400',
            iconBgClass: 'bg-emerald-500/10 border-emerald-500/20',
            title: t('home.pulse.stable') || 'مستقر وممتاز',
            titleColorClass: 'text-emerald-300',
            body: ' ' + (t('home.pulse.stableSub') || 'مصروفاتك ضمن الحدود الآمنة والمخطط لها.')
          },
          {
            icon: '⚠️',
            iconColorClass: 'text-amber-400',
            iconBgClass: 'bg-amber-500/10 border-amber-500/20',
            title: t('home.pulse.warning') || 'إنذار مبكر',
            titleColorClass: 'text-amber-300',
            body: ' ' + (t('home.pulse.warningSub') || 'اقتربت من استنفاد الحد المسموح، احذر في مصاريفك القادمة.')
          },
          {
            icon: '🚨',
            iconColorClass: 'text-rose-400',
            iconBgClass: 'bg-rose-500/10 border-rose-500/20',
            title: t('home.pulse.danger') || 'مرحلة الخطر',
            titleColorClass: 'text-rose-300',
            body: ' ' + (t('home.pulse.dangerSub') || 'لقد تجاوزت ميزانيتك أو دخلك. توقف فوراً عن المصاريف غير الضرورية.')
          }
        ]}
      />
    </>
  );
});
