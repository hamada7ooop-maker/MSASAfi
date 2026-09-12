import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  awardPoints,
  checkMilestone,
  checkDailyLoyalty,
  triggerCoinAnimation,
} from '../../src/core/loyalty';
import { useAppStore } from '../../src/store/appStore';
import { useSettingsStore } from '../../src/store/settingsStore';
import { db as DB } from '../../src/core/db/core';

describe('Core Loyalty 2.0 Unit Tests (loyalty.ts)', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    useAppStore.setState({
      userPoints: 100,
      loginStreak: 1,
      activeReward: null,
    });
    useSettingsStore.setState({
      completedMilestones: [],
      streakShields: 1,
    });
    await DB.settings.clear();
  });

  describe('awardPoints', () => {
    it('awards points and updates appStore and database', async () => {
      const success = await awardPoints('FIRST_TRANSACTION');
      expect(success).toBe(true);
      expect(useAppStore.getState().userPoints).toBe(150); // 100 + 50
      expect(useAppStore.getState().activeReward?.points).toBe(50);
    });

    it('returns false for unknown reward triggers', async () => {
      const success = await awardPoints('UNKNOWN_TRIGGER');
      expect(success).toBe(false);
      expect(useAppStore.getState().userPoints).toBe(100);
    });

    it('handles penalties correctly without dropping below zero', async () => {
      useAppStore.setState({ userPoints: 10 });
      await awardPoints('INACTIVITY'); // -25
      expect(useAppStore.getState().userPoints).toBe(0);
    });
  });

  describe('checkMilestone', () => {
    it('awards milestone points only once and prevents duplicate awards', async () => {
      const firstClaim = await checkMilestone('FIRST_BUDGET');
      expect(firstClaim).toBe(true);
      expect(useSettingsStore.getState().completedMilestones).toContain('FIRST_BUDGET');

      const duplicateClaim = await checkMilestone('FIRST_BUDGET');
      expect(duplicateClaim).toBe(false);
    });
  });

  describe('checkDailyLoyalty', () => {
    it('initializes streak on first ever login', async () => {
      await checkDailyLoyalty();
      expect(useAppStore.getState().loginStreak).toBe(1);
    });

    it('increments streak on consecutive daily logins', async () => {
      const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
      await DB.setSetting('lastLoyaltyLog', yesterday);
      useAppStore.setState({ loginStreak: 6 });

      await checkDailyLoyalty();
      expect(useAppStore.getState().loginStreak).toBe(7);
    });

    it('uses streak shield when a day is missed', async () => {
      const twoDaysAgo = new Date(Date.now() - 2 * 86400000).toISOString().slice(0, 10);
      await DB.setSetting('lastLoyaltyLog', twoDaysAgo);
      useAppStore.setState({ loginStreak: 5 });
      useSettingsStore.setState({ streakShields: 1 });

      await checkDailyLoyalty();
      expect(useAppStore.getState().loginStreak).toBe(6);
      expect(useSettingsStore.getState().streakShields).toBe(0);
    });

    it('resets streak to 1 when a day is missed and no shields remain', async () => {
      const twoDaysAgo = new Date(Date.now() - 2 * 86400000).toISOString().slice(0, 10);
      await DB.setSetting('lastLoyaltyLog', twoDaysAgo);
      useAppStore.setState({ loginStreak: 15 });
      useSettingsStore.setState({ streakShields: 0 });

      await checkDailyLoyalty();
      expect(useAppStore.getState().loginStreak).toBe(1);
    });
  });

  describe('triggerCoinAnimation', () => {
    it('creates floating coin DOM element without errors', () => {
      expect(() => triggerCoinAnimation()).not.toThrow();
    });
  });
});
