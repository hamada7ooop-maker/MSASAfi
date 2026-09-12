import { db as DB } from './db/core';
import { toast } from '../toast';
import { t } from '../i18n/engine';
import { useAppStore } from '../store/appStore';
import { useSettingsStore } from '../store/settingsStore';
import { silentFail } from './utils';

export interface RewardItem {
  id: string;
  mc: number;
  label: string;
}

export type RewardTrigger = keyof typeof REWARDS | string;

/**
 * Masarifi Loyalty 2.0 - Engagement & Milestone Based System
 */
export const REWARDS: Record<string, RewardItem> = {
  // --- DAILY LOGINS & STREAKS ---
  DAILY_LOG: { id: 'daily_log', mc: 10, label: 'loyalty.daily' },
  STREAK_7:   { id: 'streak_7',   mc: 100,  label: 'loyalty.streak7' },
  STREAK_14:  { id: 'streak_14',  mc: 250,  label: 'loyalty.streak14' },
  STREAK_30:  { id: 'streak_30',  mc: 600,  label: 'loyalty.streak30' },
  STREAK_60:  { id: 'streak_60',  mc: 1500, label: 'loyalty.streak60' },
  STREAK_90:  { id: 'streak_90',  mc: 3000, label: 'loyalty.streak90' },

  // --- MILESTONES (ONE-TIME) ---
  FIRST_TRANSACTION: { id: 'first_txn',     mc: 50,  label: 'milestone.first_txn' },
  FIRST_ACCOUNT:     { id: 'first_acc',     mc: 50,  label: 'milestone.first_acc' },
  FIRST_GOAL:        { id: 'first_goal',    mc: 100, label: 'milestone.first_goal' },
  FIRST_DEBT:        { id: 'first_debt',    mc: 100, label: 'milestone.first_debt' },
  FIRST_BILL:        { id: 'first_bill',    mc: 100, label: 'milestone.first_bill' },
  FIRST_CARD:        { id: 'first_card',    mc: 100, label: 'milestone.first_card' },
  FIRST_BUDGET:      { id: 'first_budget',  mc: 100, label: 'milestone.first_budget' },
  FIRST_CHALLENGE:   { id: 'first_chall',   mc: 100, label: 'milestone.first_chall' },
  FIRST_INVESTMENT:  { id: 'first_inv',     mc: 150, label: 'milestone.first_inv' },
  FIRST_RECURRING:   { id: 'first_recur',   mc: 150, label: 'milestone.first_recur' },
  FIRST_REPORT:      { id: 'first_rep',     mc: 80,  label: 'milestone.first_rep' },
  FIRST_AI_CHAT:     { id: 'first_ai',      mc: 50,  label: 'milestone.first_ai' },
  FIRST_THEME:       { id: 'first_theme',   mc: 50,  label: 'milestone.first_theme' },
  FIRST_CATEGORY:    { id: 'first_cat',     mc: 30,  label: 'milestone.first_cat' },
  FIRST_BACKUP:      { id: 'first_backup',  mc: 200, label: 'milestone.first_backup' },
  FIRST_SYNC:        { id: 'first_sync',    mc: 250, label: 'milestone.first_sync' },
  FIRST_MEMBER:      { id: 'first_mem',     mc: 100, label: 'milestone.first_mem' },
  ZAKAT_PRO:         { id: 'zakat_pro',     mc: 200, label: 'milestone.zakat_pro' },
  VISIONARY:         { id: 'visionary',     mc: 150, label: 'milestone.visionary' },
  ADVISOR:           { id: 'advisor',       mc: 200, label: 'milestone.advisor' },
  OPPORTUNITY:       { id: 'opportunity',   mc: 300, label: 'milestone.opportunity' },
  FIRST_WEATHER:     { id: 'first_weather', mc: 50,  label: 'milestone.first_weather' },
  FIRST_TELEGRAM:    { id: 'first_telegram', mc: 150, label: 'milestone.first_telegram' },
  FIRST_INFLATION:   { id: 'first_inflation', mc: 100, label: 'milestone.first_inflation' },

  FIRST_IMPORT:      { id: 'first_import',  mc: 200, label: 'milestone.first_import' },
  SMART_PLANNER:     { id: 'smart_planner', mc: 120, label: 'milestone.smart_planner' },
  ECO_GUARDIAN:      { id: 'eco_guardian',  mc: 80,  label: 'milestone.eco_guardian' },
  SALARY_PLANNER:    { id: 'salary_plan',   mc: 150, label: 'milestone.first_salary_structure' },

  // --- WAVE 3 ADVANCED REWARDS ---
  NO_SPEND_SUCCESS:  { id: 'no_spend',      mc: 100, label: 'challenges.nospend.success' },
  WEEK_52_SAVED:     { id: 'week_52_saved',  mc: 15,  label: 'challenges.week52.saved_week' },
  WEEK_52_COMPLETE:  { id: 'week_52_compl',  mc: 1000, label: 'challenges.week52.complete_desc' },
  GLOSSARY_EXPLORE:  { id: 'glossary_expl',  mc: 50,  label: 'glossary.xp_rewarded' },

  // --- ACTIONS ---
  APP_SHARE:         { id: 'app_share',     mc: 100, label: 'loyalty.share' },
  
  // --- PENALTIES ---
  INACTIVITY:        { id: 'inactivity',    mc: -25, label: 'loyalty.inactivity' },
};

/**
 * Award Points to User
 */
export async function awardPoints(trigger: string, _metadata: Record<string, unknown> = {}): Promise<boolean> {
  try {
    const reward = REWARDS[trigger];
    if (!reward) return false;

    // 1. Sync Stores
    const appStore = useAppStore.getState();
    const currentMC = Number(appStore.userPoints) || 0;
    const newTotal = Math.max(0, currentMC + reward.mc);
    
    await DB.setSetting('userPoints', newTotal);
    if (appStore.setUserPoints) appStore.setUserPoints(newTotal);

    // 2. Trigger UI
    if (appStore.setActiveReward) {
      appStore.setActiveReward({ 
        name: reward.label, 
        points: reward.mc 
      });
    }

    triggerCoinAnimation();
    return true;
  } catch (err: unknown) {
    silentFail('[Loyalty] awardPoints failed')(err);
    return false;
  }
}

/**
 * Check and Award Milestones (One-time)
 */
export async function checkMilestone(trigger: string): Promise<boolean> {
  const store = useSettingsStore.getState();
  
  if (store.completedMilestones.includes(trigger)) return false;

  const success = await awardPoints(trigger);
  if (success) {
    const newMilestones = [...store.completedMilestones, trigger];
    store.setCompletedMilestones(newMilestones);
    await DB.setSetting('completedMilestones', newMilestones);
  }
  return success;
}

/**
 * Daily Login & Streak Logic
 */
export async function checkDailyLoyalty(): Promise<void> {
  const lastLog = (await DB.getSetting('lastLoyaltyLog')) as string | undefined;
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);

  if (lastLog === todayStr) return; // Already logged today

  const store = useSettingsStore.getState();
  const appStore = useAppStore.getState();
  
  let streak = appStore.loginStreak || 0;
  let shields = store.streakShields || 0;

  if (lastLog) {
    const lastDate = new Date(lastLog);
    const diffDays = Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      // Perfect streak
      streak++;
    } else if (diffDays > 1) {
      // Day(s) missed
      if (shields > 0) {
        shields--;
        streak++;
        store.setStreakShields(shields);
        await DB.setSetting('streakShields', shields);
        toast(t('loyalty.streakShieldUsed') || 'Streak Shield Protected You! 🛡️');
      } else {
        streak = 1; // Reset
      }
      
      // Long inactivity penalty (10+ days)
      if (diffDays >= 10) {
        await awardPoints('INACTIVITY');
      }
    }
  } else {
    streak = 1;
    await checkMilestone('FIRST_LOGIN'); // Special case for first time
  }

  // Update State & DB
  await DB.setSetting('loginStreak', streak);
  useAppStore.getState().setLoginStreak(streak);

  // Award Daily Base
  await awardPoints('DAILY_LOG');
  await DB.setSetting('lastLoyaltyLog', todayStr);

  // Milestone Bonuses
  if (streak === 7)  await awardPoints('STREAK_7');
  if (streak === 14) await awardPoints('STREAK_14');
  if (streak === 30) await awardPoints('STREAK_30');
  if (streak === 60) await awardPoints('STREAK_60');
  if (streak === 90) await awardPoints('STREAK_90');
}

export function triggerCoinAnimation(): void {
  try {
    if (typeof document === 'undefined') return;
    const coin = document.createElement('div');
    coin.className = 'fixed z-[100005] pointer-events-none text-6xl animate-rewardPop select-none';
    coin.style.cssText = 'left: 50%; top: 50%; transform: translate(-50%, -50%); pointer-events: none;';
    coin.textContent = '🪙';
    document.body.appendChild(coin);
    setTimeout(() => { if (coin.parentNode) coin.remove(); }, 2600);
  } catch (e: unknown) {
    silentFail('[Loyalty] triggerCoinAnimation error')(e);
  }
}

declare global {
  interface Window {
    awardPoints?: typeof awardPoints;
    checkMilestone?: typeof checkMilestone;
  }
}

if (typeof window !== 'undefined') {
  window.awardPoints = awardPoints;
  window.checkMilestone = checkMilestone;
}
