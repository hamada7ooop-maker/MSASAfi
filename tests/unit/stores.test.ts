import { describe, it, expect, beforeEach } from 'vitest';
import { useAppStore } from '../../src/store/appStore';
import { useSettingsStore } from '../../src/store/settingsStore';

describe('Zustand Stores Unit Tests (appStore.ts & settingsStore.ts)', () => {
  beforeEach(() => {
    useAppStore.setState({
      currentPage: 'home',
      previousPage: 'splash',
      incognito: false,
      selectedItems: [],
      selectedType: 'expense',
      selectedCategory: '',
      txnQuery: '',
      txnFilter: 'ALL',
      txnPage: 0,
      isQuickAddOpen: false,
      isGlobalActionOpen: false,
      isMenuOpen: false,
      isSearchOpen: false,
      isNotifPanelOpen: false,
      isLocked: false,
      hasPin: false,
      autoLock: true,
      userPoints: 0,
      loginStreak: 0,
      notifCount: 0,
      activeReward: null,
    });

    useSettingsStore.setState({
      language: 'ar',
      baseCurrency: 'SAR',
      currencyDisplayMode: 'symbol',
      theme: 'system',
      hasOnboarded: true,
      useBiometric: false,
      shakeToBlur: true,
      hourlyRate: 50,
      isWorkHoursEnabled: true,
      completedMilestones: [],
      streakShields: 0,
    });
  });

  describe('useAppStore', () => {
    it('handles navigation and page transitions', () => {
      const { setCurrentPage } = useAppStore.getState();
      setCurrentPage('reports');
      expect(useAppStore.getState().currentPage).toBe('reports');
      expect(useAppStore.getState().previousPage).toBe('home');
    });

    it('manages multi-selection state', () => {
      const { toggleSelection, setAllSelection, clearSelection } = useAppStore.getState();
      toggleSelection('txn_1');
      expect(useAppStore.getState().selectedItems).toEqual(['txn_1']);

      toggleSelection('txn_2');
      expect(useAppStore.getState().selectedItems).toEqual(['txn_1', 'txn_2']);

      toggleSelection('txn_1');
      expect(useAppStore.getState().selectedItems).toEqual(['txn_2']);

      setAllSelection(['a', 'b', 'c']);
      expect(useAppStore.getState().selectedItems).toHaveLength(3);

      clearSelection();
      expect(useAppStore.getState().selectedItems).toEqual([]);
    });

    it('toggles overlays and modals state', () => {
      const store = useAppStore.getState();
      store.setQuickAddOpen(true);
      expect(useAppStore.getState().isQuickAddOpen).toBe(true);

      store.setMenuOpen(true);
      expect(useAppStore.getState().isMenuOpen).toBe(true);

      store.toggleNotifPanel();
      expect(useAppStore.getState().isNotifPanelOpen).toBe(true);

      store.toggleNotifPanel();
      expect(useAppStore.getState().isNotifPanelOpen).toBe(false);
    });

    it('updates search, filter, and pagination', () => {
      const store = useAppStore.getState();
      store.setTxnQuery('coffee');
      store.setTxnFilter('EXPENSE');
      store.setTxnPage(2);

      expect(useAppStore.getState().txnQuery).toBe('coffee');
      expect(useAppStore.getState().txnFilter).toBe('EXPENSE');
      expect(useAppStore.getState().txnPage).toBe(2);
    });
  });

  describe('useSettingsStore', () => {
    it('updates language, base currency and display modes', () => {
      const store = useSettingsStore.getState();
      store.setLang('en');
      expect(useSettingsStore.getState().language).toBe('en');

      store.setBaseCurrency('USD');
      expect(useSettingsStore.getState().baseCurrency).toBe('USD');

      store.setCurrencyDisplayMode('code');
      expect(useSettingsStore.getState().currencyDisplayMode).toBe('code');
    });

    it('updates work hours and hourly rate calculations', () => {
      const store = useSettingsStore.getState();
      store.setHourlyRate(75);
      store.setIsWorkHoursEnabled(false);

      expect(useSettingsStore.getState().hourlyRate).toBe(75);
      expect(useSettingsStore.getState().isWorkHoursEnabled).toBe(false);
    });

    it('manages shields and milestones', () => {
      const store = useSettingsStore.getState();
      store.setStreakShields(3);
      store.setCompletedMilestones(['FIRST_TXN']);

      expect(useSettingsStore.getState().streakShields).toBe(3);
      expect(useSettingsStore.getState().completedMilestones).toContain('FIRST_TXN');
    });
  });

  describe('useArcadeStore', () => {
    it('manages high scores and daily points awarding', async () => {
      const { useArcadeStore } = await import('../../src/features/arcade/store/arcadeStore');

      const store = useArcadeStore.getState();
      expect(store.getHighScore('flappy')).toBe(0);

      store.setHighScore('flappy', 150);
      expect(useArcadeStore.getState().getHighScore('flappy')).toBe(150);

      // Does not decrease high score
      store.setHighScore('flappy', 100);
      expect(useArcadeStore.getState().getHighScore('flappy')).toBe(150);

      // Points check and award
      expect(store.isDailyPointsAwarded('flappy')).toBe(false);

      const awarded = await store.awardDailyPoints('flappy', 20);
      expect(awarded).toBe(true);
      expect(useArcadeStore.getState().isDailyPointsAwarded('flappy')).toBe(true);

      // Second award on the same day should return false
      const reAwarded = await store.awardDailyPoints('flappy', 20);
      expect(reAwarded).toBe(false);
    });
  });
});
