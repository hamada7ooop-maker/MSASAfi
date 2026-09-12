import { describe, it, expect, beforeEach } from 'vitest';
import { useAppStore } from '@/store/appStore';
import { useSettingsStore, DEFAULT_SETTINGS } from '@/store/settingsStore';

describe('Zustand Stores Deep Comprehensive Unit Tests (appStore & settingsStore)', () => {
  beforeEach(() => {
    // Reset stores to predictable base state
    useSettingsStore.setState({ ...DEFAULT_SETTINGS });
    useAppStore.setState({
      currentPage: 'home',
      previousPage: 'splash',
      incognito: false,
      isPreviewActive: false,
      selectedItems: [],
      selectedType: 'expense',
      selectedCategory: 'Food',
      txnQuery: '',
      txnFilter: 'ALL',
      txnPage: 0,
      isQuickAddOpen: false,
      isGlobalActionOpen: false,
      editingTransactionId: null,
      pendingAction: null,
      reportPeriod: 'monthly',
      customRange: null,
      isMenuOpen: false,
      isSearchOpen: false,
      isLocked: false,
      hasPin: false,
      autoLock: true,
      isHomeEditing: false,
      isQAEditing: false,
      isReportBuilderOpen: false,
      userPoints: 0,
      loginStreak: 0,
      notifCount: 0,
      isNotifPanelOpen: false,
      activeReward: null
    });
  });

  describe('useAppStore Complete Actions Coverage', () => {
    it('covers all global UI and modal toggles', () => {
      const store = useAppStore.getState();

      store.setIncognito(true);
      expect(useAppStore.getState().incognito).toBe(true);

      store.setPreviewActive(true);
      expect(useAppStore.getState().isPreviewActive).toBe(true);

      store.setSelectedType('income');
      expect(useAppStore.getState().selectedType).toBe('income');

      store.setSelectedCategory('Freelance');
      expect(useAppStore.getState().selectedCategory).toBe('Freelance');

      store.setGlobalActionOpen(true);
      expect(useAppStore.getState().isGlobalActionOpen).toBe(true);

      store.setEditingTransactionId('txn_edit_99');
      expect(useAppStore.getState().editingTransactionId).toBe('txn_edit_99');

      store.setPendingAction('CREATE_GOAL');
      expect(useAppStore.getState().pendingAction).toBe('CREATE_GOAL');

      store.setReportPeriod('yearly');
      expect(useAppStore.getState().reportPeriod).toBe('yearly');

      store.setCustomRange({ from: '2026-01-01', to: '2026-06-30' });
      expect(useAppStore.getState().customRange).toEqual({ from: '2026-01-01', to: '2026-06-30' });

      store.setSearchOpen(true);
      expect(useAppStore.getState().isSearchOpen).toBe(true);

      store.setLocked(true);
      expect(useAppStore.getState().isLocked).toBe(true);

      store.setHasPin(true);
      expect(useAppStore.getState().hasPin).toBe(true);

      store.setAutoLock(false);
      expect(useAppStore.getState().autoLock).toBe(false);

      store.setQAEditing(true);
      expect(useAppStore.getState().isQAEditing).toBe(true);

      store.setHomeEditing(true);
      expect(useAppStore.getState().isHomeEditing).toBe(true);

      store.setReportBuilderOpen(true);
      expect(useAppStore.getState().isReportBuilderOpen).toBe(true);
    });

    it('covers loyalty, points, and notifications state in appStore', () => {
      const store = useAppStore.getState();

      store.setUserPoints(1250);
      expect(useAppStore.getState().userPoints).toBe(1250);

      store.setLoginStreak(14);
      expect(useAppStore.getState().loginStreak).toBe(14);

      store.setNotifCount(5);
      expect(useAppStore.getState().notifCount).toBe(5);

      store.setNotifPanelOpen(true);
      expect(useAppStore.getState().isNotifPanelOpen).toBe(true);

      store.setActiveReward({ name: 'VIP Theme', points: 500 });
      expect(useAppStore.getState().activeReward).toEqual({ name: 'VIP Theme', points: 500 });
    });
  });

  describe('useSettingsStore Complete Actions Coverage', () => {
    it('covers appearance, typography, layout orders and QA settings', () => {
      const store = useSettingsStore.getState();

      store.setTheme('system');
      expect(useSettingsStore.getState().theme).toBe('system');

      store.setDarkPalette('deep_dark');
      expect(useSettingsStore.getState().darkPalette).toBe('deep_dark');

      store.setLightPalette('warm_sand');
      expect(useSettingsStore.getState().lightPalette).toBe('warm_sand');

      store.setFontSize('small');
      expect(useSettingsStore.getState().fontSize).toBe('small');

      store.setHomeOrder(['banner', 'stats', 'accounts', 'charts']);
      expect(useSettingsStore.getState().homeOrder).toEqual(['banner', 'stats', 'accounts', 'charts']);

      store.setQAOrder(['add_txn', 'scan_receipt', 'calc']);
      expect(useSettingsStore.getState().qaOrder).toEqual(['add_txn', 'scan_receipt', 'calc']);

      store.setQAVisibility({ add_txn: true, scan_receipt: false });
      expect(useSettingsStore.getState().qaVisibility).toEqual({ add_txn: true, scan_receipt: false });

      store.setQAColumns(4);
      expect(useSettingsStore.getState().qaColumns).toBe(4);
    });

    it('covers salary breakdown, digital envelopes, and child accounts lifecycle', () => {
      const store = useSettingsStore.getState();

      // Salary Structure
      store.setSalaryStructure(
        15000,
        [{ id: 'h1', name: 'Housing Allowance', amount: 3750 }],
        [{ id: 'd1', name: 'Social Insurance', amount: 1462 }]
      );
      expect(useSettingsStore.getState().salaryBasic).toBe(15000);
      expect(useSettingsStore.getState().salaryAllowances).toHaveLength(1);
      expect(useSettingsStore.getState().salaryDeductions).toHaveLength(1);

      store.setSalaryAllowances([{ id: 'h2', name: 'Transport', amount: 1000 }]);
      expect(useSettingsStore.getState().salaryAllowances[0].name).toBe('Transport');

      store.setSalaryDeductions([{ id: 'd2', name: 'Medical', amount: 300 }]);
      expect(useSettingsStore.getState().salaryDeductions[0].name).toBe('Medical');

      // Envelopes
      store.setEnvelopes([]);
      store.addEnvelope('Grocery Envelope', 2000, '#10b981', 'shopping_cart');
      const env = useSettingsStore.getState().envelopes[0];
      expect(env).toBeDefined();
      expect(env.name).toBe('Grocery Envelope');

      store.updateEnvelopeBalance(env.id, 450);
      expect(useSettingsStore.getState().envelopes[0].spent).toBe(450);

      store.deleteEnvelope(env.id);
      expect(useSettingsStore.getState().envelopes).toHaveLength(0);

      // Child Accounts
      store.setChildAccounts([]);
      store.addChildAccount('Yousef', 8, 30, 'daily');
      const child = useSettingsStore.getState().childAccounts[0];
      expect(child).toBeDefined();
      expect(child.name).toBe('Yousef');

      store.payChildAllowance(child.id);
      expect(useSettingsStore.getState().childAccounts[0].balance).toBe(30);

      store.addChildTransaction(child.id, 'Ice Cream', 5, 'expense');
      expect(useSettingsStore.getState().childAccounts[0].balance).toBe(25);

      store.addChildTransaction(child.id, 'Helping Grandma Reward', 10, 'income');
      expect(useSettingsStore.getState().childAccounts[0].balance).toBe(35);

      store.deleteChildAccount(child.id);
      expect(useSettingsStore.getState().childAccounts).toHaveLength(0);
    });

    it('covers milestones, simple mode, locked years, and security flags', () => {
      const store = useSettingsStore.getState();

      store.setCompletedMilestones(['M1', 'M2', 'M3']);
      expect(useSettingsStore.getState().completedMilestones).toEqual(['M1', 'M2', 'M3']);

      store.setIsSimpleMode(true);
      expect(useSettingsStore.getState().isSimpleMode).toBe(true);

      store.setLockedYears([2023, 2024]);
      expect(useSettingsStore.getState().lockedYears).toEqual([2023, 2024]);

      store.setAiPremiumUntil(1900000000);
      expect(useSettingsStore.getState().aiPremiumUntil).toBe(1900000000);

      store.setHasOnboarded(true);
      expect(useSettingsStore.getState().hasOnboarded).toBe(true);
    });

    it('ensures NextGen highlight widgets (predictiveAI, financialScore, gamification, city3d) are present and visible on migration', () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mergeFn = (useSettingsStore.persist as any).getOptions().merge;
      expect(mergeFn).toBeDefined();

      const legacyState = {
        enablePredictiveAI: false,
        enableGamification: false,
        enable3DCity: false,
        homeOrder: [
          { id: 'balance', visible: true, labelKey: 'home.section.balance', icon: 'account_balance_wallet' },
          { id: 'predictiveAI', visible: false, labelKey: 'home.section.predictiveAI', icon: 'smart_toy' },
          { id: 'gamification', visible: false, labelKey: 'home.section.gamification', icon: 'sports_esports' },
          { id: 'city3d', visible: false, labelKey: 'home.section.city3d', icon: 'location_city' },
        ],
      };

      const merged = mergeFn(legacyState, useSettingsStore.getState());

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const predictive = merged.homeOrder.find((i: any) => i.id === 'predictiveAI');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const financialScore = merged.homeOrder.find((i: any) => i.id === 'financialScore');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const gamification = merged.homeOrder.find((i: any) => i.id === 'gamification');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const city3d = merged.homeOrder.find((i: any) => i.id === 'city3d');

      expect(predictive).toBeDefined();
      expect(predictive?.visible).toBe(true);
      expect(financialScore).toBeDefined();
      expect(financialScore?.visible).toBe(true);
      expect(gamification).toBeDefined();
      expect(gamification?.visible).toBe(true);
      expect(city3d).toBeDefined();
      expect(city3d?.visible).toBe(true);
    });
  });
});
