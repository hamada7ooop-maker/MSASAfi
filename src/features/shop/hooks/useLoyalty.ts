import { useState, useCallback, useEffect } from 'react';
import { db as DB } from '@/core/db/core';
import { toast } from '../../../toast';
import { useI18n } from '../../../i18n/index';
import { useAppStore } from '../../../store/appStore';
import { useSettingsStore } from '../../../store/settingsStore';
import { silentFail } from '../../../core/utils';
import { toError } from '../../../core/hooks/useLiveQuerySafe';

export function useLoyalty() {
  const { t } = useI18n();
  const points = useAppStore(s => s.userPoints);
  const streak = useAppStore(s => s.loginStreak);
  const shields = useSettingsStore(s => s.streakShields);
  const unlocked = useSettingsStore(s => s.unlockedItems);

  const [isLoading, setIsLoading] = useState(true);
  // Directive 16: the loyalty store hydration has the same empty-vs-failed
  // ambiguity — a failed read leaves zeroed points that look like "0 earned".
  const [error, setError] = useState<Error | null>(null);

  const fetchLoyalty = useCallback(async () => {
    try {
      setIsLoading(true);
      const [p, str, sh, u] = await Promise.all([
        DB.getSetting('userPoints'),
        DB.getSetting('loginStreak'),
        DB.getSetting('streakShields'),
        DB.getSetting('unlockedRewards')
      ]);

      const appState = useAppStore.getState();
      const settingsState = useSettingsStore.getState();

      appState.setUserPoints(Number(p) || 0);
      appState.setLoginStreak(Number(str) || 0);
      settingsState.setStreakShields(Number(sh) || 0);
      settingsState.setUnlockedItems(Array.isArray(u) ? u : []);
      setError(null);

    } catch (err) {
      silentFail('[useLoyalty] Error fetching loyalty data')(err);
      setError(toError(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchLoyalty(); }, [fetchLoyalty]);

  const spendPoints = async (amount: number, rewardId: string) => {
    // Re-check current points from store to avoid stale closures
    const currentPoints = useAppStore.getState().userPoints;
    
    if (currentPoints >= amount) {
      const newPoints = currentPoints - amount;
      await DB.setSetting('userPoints', newPoints);
      
      const appStore = useAppStore.getState();
      const settings = useSettingsStore.getState();

      appStore.setUserPoints(newPoints);
      
      if (rewardId.includes('streak-shield')) {
        const dbShields = await DB.getSetting('streakShields');
        const newShields = (Number(dbShields) || 0) + 1;
        await DB.setSetting('streakShields', newShields);
        settings.setStreakShields(newShields);
        toast(t('shop.toast.shieldBought') || 'Streak Shield Purchased! 🛡️', 'success');
      } else if (rewardId.includes('ai-pro')) {
        const thirtyDays = 30 * 24 * 60 * 60 * 1000;
        const currentAiExpiry = await DB.getSetting('aiPremiumUntil');
        const newExpiry = Math.max(Date.now(), Number(currentAiExpiry) || 0) + thirtyDays;
        settings.setAiPremiumUntil(newExpiry);
        await DB.setSetting('aiPremiumUntil', newExpiry);
        toast(t('shop.toast.aiProBought') || 'AI Pro Activated for 30 Days! 🤖', 'success');
      } else {
        const dbUnlocked = await DB.getSetting('unlockedRewards');
        const currentUnlocked = Array.isArray(dbUnlocked) ? dbUnlocked : [];
        const newUnlocked = [...new Set([...currentUnlocked, rewardId])];
        await DB.setSetting('unlockedRewards', newUnlocked);
        settings.setUnlockedItems(newUnlocked);
        toast(t('reward.unlocked') || 'Reward Unlocked!', 'success');
      }
      
      return true;
    } else {
      toast(t('reward.not_enough') || 'Not enough points', 'error');
      return false;
    }
  };

  return {
    points,
    streak,
    shields,
    unlocked,
    isLoading,
    error,
    retry: fetchLoyalty,
    spendPoints,
    refresh: fetchLoyalty
  };
}
