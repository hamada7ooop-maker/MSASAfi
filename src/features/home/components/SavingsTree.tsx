import React, { useState } from 'react';
import { useI18n } from '../../../i18n/index';
import { InfoModal } from '@/components/ui/InfoModal';

import type { MonthlySummary } from '@/core/services/StatisticsService';
import type { Budget } from '@/types';

interface SavingsTreeProps {
  monthlyStats: MonthlySummary;
  budgets: Budget[];
}

export const SavingsTree = React.memo(function SavingsTree({ monthlyStats, budgets }: SavingsTreeProps) {
  const { t } = useI18n();
  const [isTreeModalOpen, setIsTreeModalOpen] = useState(false);

  const totalBudgets = budgets.reduce((sum, b) => sum + (b.limit || 0), 0);
  const budgetRatio = totalBudgets > 0 ? (monthlyStats.expense || 0) / totalBudgets : 0;

  let treeState = { icon: 'seedling', labelKey: 'home.tree.start', color: 'text-green-300', animation: 'animate-pulse' };
  
  if (totalBudgets === 0) {
    treeState = { icon: 'seedling', labelKey: 'home.tree.setBudgets', color: 'text-green-400', animation: 'animate-pulse' };
  } else {
    if (budgetRatio >= 1.0) {
      treeState = { icon: 'local_florist', labelKey: 'home.tree.withered', color: 'text-rose-500', animation: 'animate-bounce' };
    } else if (budgetRatio >= 0.8) {
      treeState = { icon: 'psychiatry', labelKey: 'home.tree.warning', color: 'text-amber-500', animation: 'animate-pulse' };
    } else if (budgetRatio >= 0.4) {
      treeState = { icon: 'potted_plant', labelKey: 'home.tree.growing', color: 'text-emerald-500', animation: 'animate-in zoom-in' };
    } else if (budgetRatio > 0) {
      treeState = { icon: 'nature', labelKey: 'home.tree.flourishing', color: 'text-green-500', animation: 'animate-in fade-in zoom-in duration-1000' };
    } else {
      treeState = { icon: 'eco', labelKey: 'home.tree.start', color: 'text-green-300', animation: 'animate-pulse' };
    }
  }

  const treePb = totalBudgets > 0 ? Math.min(Math.round(budgetRatio * 100), 100) : 0;
  const treePbColor = treePb >= 100 ? 'bg-rose-500' : treePb >= 80 ? 'bg-amber-500' : 'bg-emerald-500';

  return (
    <>
      <div 
        onClick={() => setIsTreeModalOpen(true)}
        className="relative overflow-hidden bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-[32px] p-6 border border-green-100 dark:border-green-800/30 flex items-center justify-between group cursor-pointer hover:shadow-lg transition-all"
      >
        <div className="z-10">
          <h3 className="font-black text-green-800 dark:text-green-300 text-[10px] mb-1 uppercase tracking-widest opacity-60">
            {t('home.treeTitle')}
          </h3>
          <p className="text-sm text-green-700 dark:text-green-400 font-black">
            {['nature', 'potted_plant'].includes(treeState.icon) ? '✨ ' : '⚠️ '} 
            {t(treeState.labelKey)}
          </p>
          
          <div className="mt-4 bg-white/50 dark:bg-black/20 rounded-full h-2.5 w-32 overflow-hidden relative shadow-inner">
             <div 
               className={`absolute top-0 bottom-0 left-0 ${treePbColor} rounded-full transition-all duration-1000`}
               style={{ width: `${treePb}%` }}
             ></div>
          </div>
        </div>

        <div className={`z-10 w-24 h-24 bg-white/90 dark:bg-black/40 rounded-[2.5rem] flex items-center justify-center shadow-2xl shadow-green-200/40 dark:shadow-black/60 border border-white/50 dark:border-white/10 ${treeState.animation}`}>
          <span 
            className={`material-symbols-outlined ${treeState.color} text-6xl drop-shadow-sm`}
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            {treeState.icon}
          </span>
        </div>

        <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-green-400/10 rounded-full blur-3xl"></div>
      </div>

      <InfoModal
        isOpen={isTreeModalOpen}
        onClose={() => setIsTreeModalOpen(false)}
        title={t('home.treeExplainTitle')}
        description={t('home.treeModal.desc')}
        headerIcon="psychiatry"
        headerIconColorClass="text-emerald-400"
        headerIconBgClass="bg-emerald-500/10 border-emerald-500/20 shadow-emerald-500/10"
        points={[
          {
            icon: 'nature',
            iconColorClass: 'text-green-400',
            iconBgClass: 'bg-green-500/10 border-green-500/20',
            title: t('home.treeModal.flourishTitle'),
            titleColorClass: 'text-emerald-300',
            body: t('home.treeModal.flourishBody')
          },
          {
            icon: 'potted_plant',
            iconColorClass: 'text-green-400',
            iconBgClass: 'bg-green-500/10 border-green-500/20',
            title: t('home.treeModal.growingTitle'),
            titleColorClass: 'text-emerald-400',
            body: t('home.treeModal.growingBody')
          },
          {
            icon: 'psychiatry',
            iconColorClass: 'text-amber-400',
            iconBgClass: 'bg-amber-500/10 border-amber-500/20',
            title: t('home.treeModal.warningTitle'),
            titleColorClass: 'text-amber-400',
            body: t('home.treeModal.warningBody')
          },
          {
            icon: 'local_florist',
            iconColorClass: 'text-rose-400',
            iconBgClass: 'bg-rose-500/10 border-rose-500/20',
            title: t('home.treeModal.witheredTitle'),
            titleColorClass: 'text-rose-400',
            body: t('home.treeModal.witheredBody')
          }
        ]}
      />
    </>
  );
});
