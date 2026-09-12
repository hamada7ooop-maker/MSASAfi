import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { AppSettings, DigitalEnvelope, ChildAccount, ChildTransaction, LanguageCode } from '@/types';
export type { DigitalEnvelope, ChildAccount, ChildTransaction };

interface SettingsState extends AppSettings {
  setLang: (l: LanguageCode) => void;
  setTheme: (t: AppSettings['theme']) => void;
  setBaseCurrency: (c: string) => void;
  setNumberSystem: (s: 'latn' | 'arab') => void;
  setDecimalPlaces: (n: AppSettings['decimalPlaces']) => void;
  setNumberSeparator: (s: AppSettings['numberSeparator']) => void;
  setCurrencyDisplayMode: (m: AppSettings['currencyDisplayMode']) => void;
  setIncognito: (v: boolean) => void;
  setDbEncryption: (v: boolean) => void;
  setDarkPalette: (p: string) => void;
  setLightPalette: (p: string) => void;
  setHomeOrder: (o: SettingsState['homeOrder']) => void;
  setQAOrder: (o: string[]) => void;
  setQAVisibility: (v: Record<string, boolean>) => void;
  setQAColumns: (n: number) => void;
  setUseBiometric: (v: boolean) => void;
  setFontSize: (s: SettingsState['fontSize']) => void;
  setFirstDayOfMonth: (n: number) => void;
  setFirstDayOfWeek: (n: number) => void;
  setAiResponseLength: (l: SettingsState['aiResponseLength']) => void;
  setHourlyRate: (v: number) => void;
  setIsWorkHoursEnabled: (v: boolean) => void;
  setSalaryStructure: (basic: number, allowances: AppSettings['salaryAllowances'], deductions: AppSettings['salaryDeductions']) => void;
  setSalaryBasic: (v: number) => void;
  setSalaryAllowances: (v: AppSettings['salaryAllowances']) => void;
  setSalaryDeductions: (v: AppSettings['salaryDeductions']) => void;
  hasOnboarded: boolean;
  setHasOnboarded: (v: boolean) => void;
  
  // Loyalty 2.0 Fields
  completedMilestones: string[];
  setCompletedMilestones: (m: string[]) => void;
  unlockedItems: string[];
  setUnlockedItems: (items: string[]) => void;
  streakShields: number;
  setStreakShields: (n: number) => void;
  aiPremiumUntil: number; // Timestamp
  setAiPremiumUntil: (t: number) => void;
  lockedYears: number[];
  setLockedYears: (years: number[]) => void;

  // Wave 4 additions
  isSimpleMode: boolean;
  setIsSimpleMode: (v: boolean) => void;
  envelopes: DigitalEnvelope[];
  setEnvelopes: (envelopes: DigitalEnvelope[]) => void;
  addEnvelope: (name: string, limit: number, color: string, icon: string) => void;
  deleteEnvelope: (id: string) => void;
  updateEnvelopeBalance: (id: string, amount: number) => void;
  childAccounts: ChildAccount[];
  setChildAccounts: (accounts: ChildAccount[]) => void;
  addChildAccount: (name: string, age: number, allowance: number, allowancePeriod: 'daily' | 'weekly' | 'monthly') => void;
  updateChildAccount: (id: string, name: string, age: number, allowance: number, allowancePeriod: 'daily' | 'weekly' | 'monthly') => void;
  deleteChildAccount: (id: string) => void;
  addChildTransaction: (childId: string, description: string, amount: number, type: 'income' | 'expense') => void;
  payChildAllowance: (childId: string) => void;

  // Next-Gen UI Setters
}

export const DEFAULT_SETTINGS = {
  language: 'ar',
  theme: 'auto',
  darkPalette: 'dim',
  lightPalette: 'default',
  baseCurrency: 'SAR',
  numberSystem: 'latn',
  decimalPlaces: 2,
  numberSeparator: 'comma_dot',
  fontSize: 'normal',
  currencyDisplayMode: 'symbol',
  incognito: false,
  dbEncryption: true,
  useBiometric: false,
  aiResponseLength: 'short',
  firstDayOfMonth: 1,
  firstDayOfWeek: 0,
  homeOrder: [
    { id: 'banner', visible: true, labelKey: 'home.section.banner', icon: 'campaign' },
    { id: 'balance', visible: true, labelKey: 'home.section.balance', icon: 'account_balance_wallet' },
    { id: 'incomeExpense', visible: true, labelKey: 'home.section.incomeExpense', icon: 'swap_vert' },
    { id: 'netWorth', visible: true, labelKey: 'home.section.netWorth', icon: 'trending_up' },
    { id: 'alerts', visible: true, labelKey: 'home.section.alerts', icon: 'notifications_active' },
    { id: 'pacing', visible: true, labelKey: 'home.section.dailyPacing', icon: 'speed' },
    { id: 'weeklyReview', visible: true, labelKey: 'home.section.weeklyReview', icon: 'date_range' },
    { id: 'quickAccess', visible: true, labelKey: 'home.section.quickAccess', icon: 'apps' },
    { id: 'dailyTip', visible: true, labelKey: 'home.section.dailyTip', icon: 'lightbulb' },
    { id: 'upcoming', visible: true, labelKey: 'home.section.upcoming', icon: 'event_repeat' },
    { id: 'topExpenses', visible: true, labelKey: 'home.section.topExpenses', icon: 'vertical_align_top' },
    { id: 'aiPulse', visible: true, labelKey: 'home.section.pulse', icon: 'bolt' },
    { id: 'habitStreak', visible: true, labelKey: 'home.section.habitStreak', icon: 'local_fire_department' },
    { id: 'insights', visible: true, labelKey: 'home.section.insights', icon: 'psychology' },
    { id: 'charts', visible: true, labelKey: 'home.section.charts', icon: 'bar_chart' },
    { id: 'tree', visible: true, labelKey: 'home.section.tree', icon: 'potted_plant' },
    { id: 'whatIf', visible: true, labelKey: 'home.section.whatIf', icon: 'tune' },
    { id: 'economicPulse', visible: true, labelKey: 'home.section.economic', icon: 'trending_up' },
    { id: 'currencyPulse', visible: true, labelKey: 'title.currencies', icon: 'currency_exchange' },
    { id: 'cryptoPulse', visible: true, labelKey: 'home.section.crypto', icon: 'currency_bitcoin' },
    { id: 'newsPulse', visible: true, labelKey: 'home.section.news', icon: 'newspaper' },
    { id: 'salaryCountdown', visible: true, labelKey: 'home.section.salaryCountdown', icon: 'payments' },
    { id: 'recent', visible: true, labelKey: 'home.section.recent', icon: 'history' },
    { id: 'predictiveAI', visible: true, labelKey: 'home.section.predictiveAI', icon: 'smart_toy' },
    { id: 'financialScore', visible: true, labelKey: 'home.section.financialScore', icon: 'speed' },
    { id: 'gamification', visible: true, labelKey: 'home.section.gamification', icon: 'sports_esports' },
    { id: 'city3d', visible: true, labelKey: 'home.section.city3d', icon: 'location_city' },
  ],
  qaOrder: ['transactions', 'advisor', 'accounts', 'assets', 'investments', 'goals', 'reports', 'debts', 'chatbot', 'calculators', 'vat', 'challenges', 'glossary', 'shop', 'family', 'recurring', 'currencies', 'categories', 'referrals', 'bills', 'settings', 'travel-budget', 'calculator', 'arcade'],
  qaVisibility: {},
  qaColumns: 4,
  hasOnboarded: false,
  completedMilestones: [],
  unlockedItems: [],
  streakShields: 0,
  aiPremiumUntil: 0,
  hourlyRate: 0,
  isWorkHoursEnabled: false,
  salaryBasic: 0,
  salaryAllowances: [],
  salaryDeductions: [],
  lockedYears: [],
  isSimpleMode: false,
  envelopes: [],
  childAccounts: [],
} satisfies AppSettings;

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...DEFAULT_SETTINGS,
      setLang: (l) => set({ language: l }),
      setTheme: (t) => set({ theme: t }),
      setBaseCurrency: (c) => set({ baseCurrency: c }),
      setNumberSystem: (s) => set({ numberSystem: s }),
      setDecimalPlaces: (n) => set({ decimalPlaces: n }),
      setNumberSeparator: (s) => set({ numberSeparator: s }),
      setCurrencyDisplayMode: (m) => set({ currencyDisplayMode: m }),
      setIncognito: (v) => set({ incognito: v }),
      setDbEncryption: (v) => set({ dbEncryption: v }),
      setDarkPalette: (p) => set({ darkPalette: p }),
      setLightPalette: (p) => set({ lightPalette: p }),
      setHomeOrder: (o) => set({ homeOrder: o }),
      setQAOrder: (o) => set({ qaOrder: o }),
      setQAVisibility: (v) => set({ qaVisibility: v }),
      setQAColumns: (n) => set({ qaColumns: n }),
      setUseBiometric: (v) => set({ useBiometric: v }),
      setFontSize: (s) => set({ fontSize: s }),
      setFirstDayOfMonth: (n) => set({ firstDayOfMonth: n }),
      setFirstDayOfWeek: (n) => set({ firstDayOfWeek: n }),
      setAiResponseLength: (l) => set({ aiResponseLength: l }),
      setHasOnboarded: (v) => set({ hasOnboarded: v }),
      setCompletedMilestones: (m) => set({ completedMilestones: m }),
      setUnlockedItems: (items) => set({ unlockedItems: items }),
      setStreakShields: (n) => set({ streakShields: n }),
      setAiPremiumUntil: (t) => set({ aiPremiumUntil: t }),
      setHourlyRate: (v) => set({ hourlyRate: v }),
      setIsWorkHoursEnabled: (v) => set({ isWorkHoursEnabled: v }),
      setSalaryStructure: (basic, allowances, deductions) => set({
        salaryBasic: basic,
        salaryAllowances: allowances,
        salaryDeductions: deductions
      }),
      setSalaryBasic: (v) => set({ salaryBasic: v }),
      setSalaryAllowances: (v) => set({ salaryAllowances: v }),
      setSalaryDeductions: (v) => set({ salaryDeductions: v }),
      setLockedYears: (years) => set({ lockedYears: years }),

      // Wave 4 additions
      setIsSimpleMode: (v) => set({ isSimpleMode: v }),
      setEnvelopes: (envelopes) => set({ envelopes }),
      addEnvelope: (name, limit, color, icon) => set((state) => ({
        envelopes: [...state.envelopes, { id: Date.now().toString() + '-' + Math.random().toString(36).substring(2, 11), name, limit, spent: 0, color, icon }]
      })),
      deleteEnvelope: (id) => set((state) => ({
        envelopes: state.envelopes.filter(e => e.id !== id)
      })),
      updateEnvelopeBalance: (id, amount) => set((state) => ({
        envelopes: state.envelopes.map(e => e.id === id ? { ...e, spent: Math.max(0, e.spent + amount) } : e)
      })),
      setChildAccounts: (childAccounts) => set({ childAccounts }),
      addChildAccount: (name, age, allowance, allowancePeriod) => set((state) => ({
        childAccounts: [...state.childAccounts, { id: Date.now().toString() + '-' + Math.random().toString(36).substring(2, 11), name, age, balance: 0, allowance, allowancePeriod, transactions: [] }]
      })),
      updateChildAccount: (id, name, age, allowance, allowancePeriod) => set((state) => ({
        childAccounts: state.childAccounts.map(c => c.id === id ? { ...c, name, age, allowance, allowancePeriod } : c)
      })),
      deleteChildAccount: (id) => set((state) => ({
        childAccounts: state.childAccounts.filter(c => c.id !== id)
      })),
      addChildTransaction: (childId, description, amount, type) => set((state) => ({
        childAccounts: state.childAccounts.map(c => {
          if (c.id !== childId) return c;
          const newTx = { id: Date.now().toString() + '-' + Math.random().toString(36).substring(2, 11), description, amount, date: new Date().toISOString(), type };
          const newBalance = type === 'income' ? c.balance + amount : c.balance - amount;
          return { ...c, balance: newBalance, transactions: [newTx, ...c.transactions] };
        })
      })),
      payChildAllowance: (childId) => set((state) => ({
        childAccounts: state.childAccounts.map(c => {
          if (c.id !== childId) return c;
          if (c.allowance <= 0) return c;
          const newTx = { id: Date.now().toString() + '-' + Math.random().toString(36).substring(2, 11), description: 'المصروف الدوري', amount: c.allowance, date: new Date().toISOString(), type: 'income' as const };
          return { ...c, balance: c.balance + c.allowance, transactions: [newTx, ...c.transactions] };
        })
      })),
    }),
    {
      name: 'masarifi-settings-v2',
      storage: createJSONStorage(() => localStorage),
      merge: (persistedState: unknown, currentState: SettingsState) => {
        if (!persistedState || typeof persistedState !== 'object') return currentState;
        const pState = persistedState as Partial<SettingsState>;
        const state = { ...currentState, ...pState };
        
        // --- Migration Logic ---
        if (pState.homeOrder) {
          const order = [...pState.homeOrder];
          
          // 1. Migrate 'market' (monolith) to separate pulses
          if (order.some(i => i.id === 'market')) {
            const index = order.findIndex(i => i.id === 'market');
            const wasVisible = order[index].visible;
            order.splice(index, 1, 
              { id: 'economicPulse', visible: wasVisible, labelKey: 'home.section.economic', icon: 'trending_up' },
              { id: 'currencyPulse', visible: wasVisible, labelKey: 'title.currencies', icon: 'currency_exchange' },
              { id: 'cryptoPulse', visible: wasVisible, labelKey: 'home.section.crypto', icon: 'currency_bitcoin' },
              { id: 'newsPulse', visible: wasVisible, labelKey: 'home.section.news', icon: 'newspaper' }
            );
          }

          // 2. Migrate 'pulse' to aiPulse + habitStreak
          if (order.some(i => i.id === 'pulse')) {
             const index = order.findIndex(i => i.id === 'pulse');
             const wasVisible = order[index].visible;
             order.splice(index, 1, 
               { id: 'aiPulse', visible: wasVisible, labelKey: 'home.section.pulse', icon: 'bolt' },
               { id: 'habitStreak', visible: wasVisible, labelKey: 'home.section.habitStreak', icon: 'local_fire_department' }
             );
          }

          // 3. Migrate 'savings' (legacy) to tree + whatIf
          if (order.some(i => i.id === 'savings')) {
            const index = order.findIndex(i => i.id === 'savings');
            const wasVisible = order[index].visible;
            order.splice(index, 1, 
              { id: 'tree', visible: wasVisible, labelKey: 'home.section.tree', icon: 'potted_plant' },
              { id: 'whatIf', visible: wasVisible, labelKey: 'home.section.whatIf', icon: 'tune' }
            );
          }

          // 4. Migrate 'bills' to 'upcoming'
          if (order.some(i => i.id === 'bills')) {
            const index = order.findIndex(i => i.id === 'bills');
            const wasVisible = order[index].visible;
            order.splice(index, 1, { id: 'upcoming', visible: wasVisible, labelKey: 'home.section.upcoming', icon: 'event_repeat' });
          }

          // 5. Final Deduplication & Cleanup
          const uniqueMap = new Map();
          // Add default items first to keep their default labels/icons
          DEFAULT_SETTINGS.homeOrder.forEach(item => uniqueMap.set(item.id, item));
          // Overwrite with user's order and visibility, but keep IDs unique
          order.forEach(item => {
            if (uniqueMap.has(item.id)) {
              const existing = uniqueMap.get(item.id);
              uniqueMap.set(item.id, { ...existing, ...item });
            } else {
              // If it's an ID we don't recognize as a default anymore, we can choose to discard it or keep it
              // For now, let's keep recognizeable ones
              uniqueMap.set(item.id, item);
            }
          });

          // 6. Final Sort: Try to maintain the order of the 'order' array
          const finalOrder = order
            .map(i => uniqueMap.get(i.id))
            .filter(Boolean);
          
          // Add any missing default items at the end
          DEFAULT_SETTINGS.homeOrder.forEach(item => {
            if (!finalOrder.find(f => f.id === item.id)) {
              finalOrder.push(item);
            }
          });

          state.homeOrder = finalOrder;
        }

        // 7. Ensure next-gen highlight features and twin cards are active and visible
        const nextGenIds = ['predictiveAI', 'financialScore', 'gamification', 'city3d'];
        if (state.homeOrder && state.homeOrder.length > 0) {
          nextGenIds.forEach(id => {
            const existing = state.homeOrder.find(i => i.id === id);
            if (!existing) {
              const def = DEFAULT_SETTINGS.homeOrder.find(i => i.id === id);
              if (def) state.homeOrder.push({ ...def, visible: true });
            } else {
              // Auto-heal widgets if they were inadvertently hidden by previous legacy migrations
              existing.visible = true;
            }
          });
        }
        
        // Merge qaOrder to add missing quick access items
        if (pState.qaOrder) {
          const persistedQaIds = new Set(pState.qaOrder);
          const missingQaItems = DEFAULT_SETTINGS.qaOrder.filter((item: string) => !persistedQaIds.has(item));
          state.qaOrder = [...pState.qaOrder, ...missingQaItems];
        }

        return state;
      }
    }
  )
);
