import { describe, it, expect, beforeEach } from 'vitest';
import { useSettingsStore, DEFAULT_SETTINGS } from '../../src/store/settingsStore';

/**
 * Direct coverage for the settings backbone store: the plain setters that the
 * modular slice stores project, and — most importantly — the persist `merge`
 * migration pipeline that upgrades legacy persisted home orders (monolith
 * widgets split into pulses, renames) and auto-heals next-gen widgets.
 */
describe('Settings Store Unit Tests (settingsStore.ts)', () => {
  beforeEach(() => {
    useSettingsStore.setState({ ...DEFAULT_SETTINGS });
    localStorage.clear();
  });

  describe('setters', () => {
    it('applies the layout setters (home order, quick access)', () => {
      const s = useSettingsStore.getState();
      const order = [{ id: 'balance', visible: false, labelKey: 'x', icon: 'y' }];
      s.setHomeOrder(order);
      s.setQAOrder(['goals', 'reports']);
      s.setQAVisibility({ goals: false });
      s.setQAColumns(6);
      const after = useSettingsStore.getState();
      expect(after.homeOrder).toEqual(order);
      expect(after.qaOrder).toEqual(['goals', 'reports']);
      expect(after.qaVisibility).toEqual({ goals: false });
      expect(after.qaColumns).toBe(6);
    });

    it('applies the calendar and AI preference setters', () => {
      const s = useSettingsStore.getState();
      s.setFirstDayOfMonth(2);
      s.setFirstDayOfWeek(1);
      s.setAiResponseLength('detailed');
      s.setAiPremiumUntil(1234567);
      const after = useSettingsStore.getState();
      expect(after.firstDayOfMonth).toBe(2);
      expect(after.firstDayOfWeek).toBe(1);
      expect(after.aiResponseLength).toBe('detailed');
      expect(after.aiPremiumUntil).toBe(1234567);
    });

    it('applies the work & salary structure setters atomically and individually', () => {
      const s = useSettingsStore.getState();
      s.setHourlyRate(120);
      s.setIsWorkHoursEnabled(true);
      s.setSalaryStructure(10000, [{ label: 'سكن', amount: 2000 }], [{ label: 'تأمين', amount: 300 }]);
      expect(useSettingsStore.getState()).toMatchObject({
        hourlyRate: 120,
        isWorkHoursEnabled: true,
        salaryBasic: 10000,
        salaryAllowances: [{ label: 'سكن', amount: 2000 }],
        salaryDeductions: [{ label: 'تأمين', amount: 300 }],
      });
      useSettingsStore.getState().setSalaryBasic(12000);
      useSettingsStore.getState().setSalaryAllowances([]);
      useSettingsStore.getState().setSalaryDeductions([]);
      expect(useSettingsStore.getState()).toMatchObject({
        salaryBasic: 12000,
        salaryAllowances: [],
        salaryDeductions: [],
      });
    });

    it('applies the milestone / gamification / lock setters', () => {
      const s = useSettingsStore.getState();
      s.setHasOnboarded(true);
      s.setCompletedMilestones(['first_tx']);
      s.setUnlockedItems(['badge_1']);
      s.setStreakShields(2);
      s.setLockedYears([2024, 2025]);
      s.setIsSimpleMode(true);
      expect(useSettingsStore.getState()).toMatchObject({
        hasOnboarded: true,
        completedMilestones: ['first_tx'],
        unlockedItems: ['badge_1'],
        streakShields: 2,
        lockedYears: [2024, 2025],
        isSimpleMode: true,
      });
    });
  });

  describe('persist merge — legacy homeOrder migrations', () => {
    it('splits legacy monolith widgets into their successors', async () => {
      const legacy = {
        state: {
          baseCurrency: 'USD',
          homeOrder: [
            { id: 'market', visible: true, labelKey: 'home.section.market', icon: 'old' },
            { id: 'pulse', visible: false, labelKey: 'home.section.pulse', icon: 'old' },
            { id: 'savings', visible: true, labelKey: 'home.section.savings', icon: 'old' },
            { id: 'bills', visible: true, labelKey: 'home.section.bills', icon: 'old' },
          ],
          qaOrder: ['goals'],
        },
        version: 0,
      };
      localStorage.setItem('masarifi-settings-v2', JSON.stringify(legacy));
      await useSettingsStore.persist.rehydrate();

      const state = useSettingsStore.getState();
      expect(state.baseCurrency).toBe('USD'); // persisted value wins

      const ids = state.homeOrder.map((i) => i.id);
      // 'market' → economicPulse + currencyPulse + cryptoPulse + newsPulse
      expect(ids).toContain('economicPulse');
      expect(ids).toContain('currencyPulse');
      expect(ids).toContain('cryptoPulse');
      expect(ids).toContain('newsPulse');
      // 'pulse' → aiPulse + habitStreak
      expect(ids).toContain('aiPulse');
      expect(ids).toContain('habitStreak');
      // 'savings' → tree + whatIf ; 'bills' → upcoming
      expect(ids).toContain('tree');
      expect(ids).toContain('whatIf');
      expect(ids).toContain('upcoming');
      expect(ids).not.toContain('market');
      expect(ids).not.toContain('savings');
      expect(ids).not.toContain('bills');

      // Visibility is inherited from the legacy monolith (pulse was hidden).
      const aiPulse = state.homeOrder.find((i) => i.id === 'aiPulse');
      expect(aiPulse?.visible).toBe(false);

      // Defaults missing from the persisted order are appended.
      expect(state.homeOrder.find((i) => i.id === 'balance')).toBeTruthy();
    });

    it('auto-heals next-gen widgets: adds the missing ones and forces them visible', async () => {
      const legacy = {
        state: {
          homeOrder: [
            { id: 'balance', visible: true, labelKey: 'x', icon: 'y' },
            { id: 'predictiveAI', visible: false, labelKey: 'x', icon: 'y' },
          ],
          qaOrder: [],
        },
        version: 0,
      };
      localStorage.setItem('masarifi-settings-v2', JSON.stringify(legacy));
      await useSettingsStore.persist.rehydrate();

      const state = useSettingsStore.getState();
      const ids = state.homeOrder.map((i) => i.id);
      for (const id of ['predictiveAI', 'financialScore', 'gamification', 'city3d']) {
        expect(ids).toContain(id);
        expect(state.homeOrder.find((i) => i.id === id)?.visible).toBe(true);
      }
    });

    it('completes a partial quick-access order with the missing defaults', async () => {
      const legacy = {
        state: { qaOrder: ['goals'], homeOrder: [] },
        version: 0,
      };
      localStorage.setItem('masarifi-settings-v2', JSON.stringify(legacy));
      await useSettingsStore.persist.rehydrate();

      const qaOrder = useSettingsStore.getState().qaOrder;
      expect(qaOrder[0]).toBe('goals'); // user's order is preserved first
      for (const item of DEFAULT_SETTINGS.qaOrder) {
        expect(qaOrder).toContain(item); // missing defaults appended
      }
    });

    it('keeps current defaults when nothing valid is persisted', async () => {
      localStorage.setItem('masarifi-settings-v2', 'null');
      await useSettingsStore.persist.rehydrate();
      expect(useSettingsStore.getState().homeOrder).toEqual(DEFAULT_SETTINGS.homeOrder);
    });
  });

  describe('hapticsEnabled — Directive 19 vocabulary master switch', () => {
    it('defaults to enabled', () => {
      expect(DEFAULT_SETTINGS.hapticsEnabled).toBe(true);
      expect(useSettingsStore.getState().hapticsEnabled).toBe(true);
    });

    it('flips via the setter and persists through rehydrate', async () => {
      useSettingsStore.getState().setHapticsEnabled(false);
      expect(useSettingsStore.getState().hapticsEnabled).toBe(false);
      await useSettingsStore.persist.rehydrate();
      expect(useSettingsStore.getState().hapticsEnabled).toBe(false);
      useSettingsStore.getState().setHapticsEnabled(true);
      expect(useSettingsStore.getState().hapticsEnabled).toBe(true);
    });

    it('heals old persists that predate the key: defaults to enabled', async () => {
      const legacy = { state: { language: 'en', theme: 'dark' }, version: 0 };
      localStorage.setItem('masarifi-settings-v2', JSON.stringify(legacy));
      await useSettingsStore.persist.rehydrate();
      expect(useSettingsStore.getState().hapticsEnabled).toBe(true);
      expect(useSettingsStore.getState().language).toBe('en');
    });
  });
});
