import React, { useState } from 'react';
import { useI18n } from '../../../i18n/index';
import { useFormat } from '../../../core/hooks/useFormat';
import { getMonthName } from '@core/utils';
import { InfoModal } from '@/components/ui/InfoModal';

import type { MonthlySummary } from '@/core/services/StatisticsService';

interface DailyPacingProps {
  monthlyStats: MonthlySummary;
  balance: number;
}

export const DailyPacing = React.memo(function DailyPacing({ monthlyStats, balance }: DailyPacingProps) {
  const { t } = useI18n();
  const { fmt } = useFormat();
  const [isPacingModalOpen, setIsPacingModalOpen] = useState(false);

  const now = new Date();
  const daysPassed = now.getDate();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const daysLeftMonth = Math.max(1, daysInMonth - daysPassed + 1);
  
  const avgDailySpend = daysPassed > 0 ? Math.round(monthlyStats.expense / daysPassed) : 0;
  const recommendedDaily = Math.max(0, Math.round(balance / daysLeftMonth));

  return (
    <>
      <div 
        className="bg-surface rounded-[32px] p-7 shadow-xl border border-outline-variant/30 cursor-pointer hover:shadow-lg transition-all group"
        onClick={() => setIsPacingModalOpen(true)}
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-black text-sm uppercase tracking-tighter flex items-center gap-2 text-primary">
            <span className="material-symbols-outlined">speed</span>
            {t('home.dailyPacing')}
          </h3>
          <span className="bg-primary/10 text-primary px-3 py-1 rounded-xl text-[9px] font-black uppercase tracking-widest">
            {getMonthName(now.getMonth())}
          </span>
        </div>
        
        <div className="space-y-3">
          <div className="flex justify-between items-center bg-surface-container-low p-4 rounded-2xl border border-outline-variant/30">
            <div>
              <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">{t('home.avgDailySpend')}</p>
              <p className="text-[8px] text-slate-400 font-bold mt-1 uppercase">{t('home.avgDailySpendSub')}</p>
            </div>
            <p className="font-black text-rose-500 text-lg tabular-nums">{fmt(avgDailySpend)}</p>
          </div>
          
          <div className="flex justify-between items-center bg-emerald-50/50 dark:bg-emerald-900/10 p-4 rounded-2xl border border-emerald-100/50 dark:border-emerald-900/30">
            <div>
              <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-black uppercase tracking-widest">{t('home.safeLimit')}</p>
              <p className="text-[8px] text-emerald-500/70 font-bold mt-1 uppercase">{t('home.safeLimitSub')}</p>
            </div>
            <p className="font-black text-emerald-600 dark:text-emerald-400 text-lg tabular-nums">{fmt(recommendedDaily)}</p>
          </div>
        </div>
        
        <div className="mt-5 pt-5 border-t border-outline-variant/30">
          <p className="text-[10px] text-slate-400 font-black flex items-center justify-center gap-1.5 uppercase tracking-widest">
            <span className="material-symbols-outlined text-[14px]">calendar_month</span>
            {t('home.daysRemaining')} <span className="text-blue-500 font-black">{daysLeftMonth} {t('home.daysSuffix')}</span>
          </p>
        </div>
      </div>

      <InfoModal
        isOpen={isPacingModalOpen}
        onClose={() => setIsPacingModalOpen(false)}
        title={t('home.pacingExplainTitle') || 'الإنفاق اليومي'}
        description={t('home.pacingExplainBody') || 'تساعدك هذه الأداة على مراقبة سرعة إنفاقك وتحديد الحد الآمن لضمان عدم نفاد رصيدك قبل نهاية الشهر.'}
        headerIcon="speed"
        headerIconColorClass="text-blue-400"
        headerIconBgClass="bg-blue-500/10 border-blue-500/20 shadow-blue-500/10"
        points={[
          {
            icon: 'calculate',
            iconColorClass: 'text-rose-400',
            iconBgClass: 'bg-rose-500/10 border-rose-500/20',
            title: t('home.pacingPoint1Title') || 'متوسط الصرف اليومي',
            titleColorClass: 'text-rose-300',
            body: ' ' + (t('home.pacingPoint1Body') || 'يحسب إجمالي مصروفاتك مقسوماً على عدد الأيام التي انقضت من الشهر الحالي.')
          },
          {
            icon: 'verified_user',
            iconColorClass: 'text-emerald-400',
            iconBgClass: 'bg-emerald-500/10 border-emerald-500/20',
            title: t('home.pacingPoint2Title') || 'الحد الآمن المسموح',
            titleColorClass: 'text-emerald-300',
            body: ' ' + (t('home.pacingPoint2Body') || 'يقسم رصيدك المتبقي على عدد الأيام المتبقية في الشهر ليعطيك الحد الأقصى الذي يمكنك صرفه يومياً دون أن تقع في عجز مالي.')
          }
        ]}
      />
    </>
  );
});
