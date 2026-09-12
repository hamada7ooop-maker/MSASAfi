import { create } from 'zustand';
import { db as DB } from '@/core/db/core';
import { useAppStore } from '@/store/appStore';
import { toast } from '@/toast';
import { t } from '@/i18n/engine';
import { silentFail } from '@/core/utils';

export interface ArcadeState {
  highScores: Record<string, number>;
  dailyPointsDates: Record<string, string>;
  getHighScore: (gameId: string) => number;
  setHighScore: (gameId: string, score: number) => void;
  isDailyPointsAwarded: (gameId: string) => boolean;
  awardDailyPoints: (gameId: string, points: number) => Promise<boolean>;
}

export const useArcadeStore = create<ArcadeState>((set, get) => ({
  highScores: {},
  dailyPointsDates: {},

  getHighScore: (gameId: string) => {
    const cached = get().highScores[gameId];
    if (typeof cached === 'number') return cached;
    try {
      const val = localStorage.getItem('masarifi_arcade_' + gameId + '_score') || localStorage.getItem('masarifi_arcade_' + gameId + '_high_score');
      const num = val ? parseInt(val, 10) : 0;
      const valid = Number.isNaN(num) ? 0 : num;
      set((state) => ({
        highScores: { ...state.highScores, [gameId]: valid }
      }));
      return valid;
    } catch {
      /* localStorage unavailable or private browsing mode */
      return 0;
    }
  },

  setHighScore: (gameId: string, score: number) => {
    const current = get().getHighScore(gameId);
    if (score > current) {
      set((state) => ({
        highScores: { ...state.highScores, [gameId]: score }
      }));
      try {
        localStorage.setItem('masarifi_arcade_' + gameId + '_score', String(score));
      } catch {
        /* localStorage unavailable */
      }
    }
  },

  isDailyPointsAwarded: (gameId: string) => {
    const todayIso = new Date().toISOString().split('T')[0];
    const todayStr = new Date().toDateString();
    const cached = get().dailyPointsDates[gameId];
    if (cached === todayIso || cached === todayStr) return true;
    try {
      const saved = localStorage.getItem('masarifi_arcade_' + gameId + '_points_date');
      if (saved) {
        set((state) => ({
          dailyPointsDates: { ...state.dailyPointsDates, [gameId]: saved }
        }));
      }
      return saved === todayIso || saved === todayStr;
    } catch {
      /* localStorage unavailable */
      return false;
    }
  },

  awardDailyPoints: async (gameId: string, points: number) => {
    if (get().isDailyPointsAwarded(gameId)) return false;
    const todayIso = new Date().toISOString().split('T')[0];
    try {
      localStorage.setItem('masarifi_arcade_' + gameId + '_points_date', todayIso);
    } catch {
      /* localStorage unavailable */
    }
    set((state) => ({
      dailyPointsDates: { ...state.dailyPointsDates, [gameId]: todayIso }
    }));

    try {
      const cur = useAppStore.getState().userPoints;
      const next = cur + points;
      await DB.setSetting('userPoints', next);
      useAppStore.getState().setUserPoints(next);
      toast(t('arcade.earnedPoints', { points: String(points) }) || ('تهانينا! لقد حصلت على ' + points + ' نقطة ولاء لكسر رقمك القياسي! 🎉'), 'success');
      return true;
    } catch (e) {
      silentFail('[ArcadeStore] Error awarding points for ' + gameId)(e);
      return false;
    }
  }
}));
