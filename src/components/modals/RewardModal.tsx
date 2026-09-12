import React from 'react';
import { useAppStore } from '../../store/appStore';
import { useShallow } from 'zustand/react/shallow';
import { useI18n } from '../../i18n/index';

export function RewardModal() {
  const { activeReward, setActiveReward } = useAppStore(
    useShallow((s) => ({
      activeReward: s.activeReward,
      setActiveReward: s.setActiveReward
    }))
  );
  const { t } = useI18n();

  if (!activeReward) return null;

  return (
    <div className="fixed inset-0 z-[100001] flex items-center justify-center p-6 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white dark:bg-surface-container w-full max-w-sm rounded-[2.5rem] p-8 text-center shadow-2xl border border-white/20 relative overflow-hidden animate-in zoom-in slide-in-from-bottom-8 duration-500">
        
        {/* Glow Effect */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-amber-500/20 blur-[80px] rounded-full -z-10"></div>
        
        {/* Coin Animation Container */}
        <div className="mb-6 relative h-24 flex items-center justify-center">
            <div className="text-7xl animate-rewardBounce">🪙</div>
        </div>

        <h2 className="text-2xl font-black text-slate-800 dark:text-white mb-2">
            {t('loyalty.achievementUnlocked') || 'Achievement Unlocked!'}
        </h2>
        
        <p className="text-slate-500 dark:text-slate-400 text-sm font-bold mb-6">
            {t(activeReward.name)}
        </p>

        <div className="bg-amber-50 dark:bg-amber-900/30 border border-amber-100 dark:border-amber-800/50 rounded-2xl py-4 mb-8">
            <span className="text-3xl font-black text-amber-600 dark:text-amber-400 tabular-nums">
                +{activeReward.points}
            </span>
            <span className="text-xs font-black text-amber-500 uppercase tracking-widest block mt-1">
                {t('loyalty.coins') || 'Masarifi Coins'}
            </span>
        </div>

        <button 
          onClick={() => setActiveReward(null)}
          className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 py-4 rounded-2xl font-black text-sm uppercase tracking-widest active:scale-95 transition-all shadow-xl shadow-black/10"
        >
          {t('action.gotIt') || 'Awesome!'}
        </button>
      </div>
    </div>
  );
}
