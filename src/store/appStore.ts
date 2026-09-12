import { create } from 'zustand';

interface AppState {
  // Navigation State
  currentPage: string;
  previousPage: string;
  setCurrentPage: (page: string) => void;
  reportPeriod: 'monthly' | 'yearly' | 'custom';
  customRange: { from: string; to: string } | null;

  // Global UI State
  incognito: boolean;
  isPreviewActive: boolean;
  setIncognito: (v: boolean) => void;
  setPreviewActive: (v: boolean) => void;

  // Transaction List State
  txnQuery: string;
  txnFilter: string;
  txnPage: number;
  setTxnQuery: (q: string) => void;
  setTxnFilter: (f: string) => void;
  setTxnPage: (p: number) => void;

  // Selection Logic (Bulk actions)
  selectedItems: string[];
  toggleSelection: (id: string) => void;
  clearSelection: () => void;
  setAllSelection: (ids: string[]) => void;

  // Transaction Form State
  selectedType: 'income' | 'expense';
  selectedCategory: string;
  setSelectedType: (type: 'income' | 'expense') => void;
  setSelectedCategory: (cat: string) => void;

  // Modal States
  isQuickAddOpen: boolean;
  isGlobalActionOpen: boolean;
  editingTransactionId: string | null;
  setQuickAddOpen: (v: boolean) => void;
  setGlobalActionOpen: (v: boolean) => void;
  setEditingTransactionId: (id: string | null) => void;
  pendingAction: string | null;
  setPendingAction: (action: string | null) => void;
  setReportPeriod: (period: 'monthly' | 'yearly' | 'custom') => void;
  setCustomRange: (range: { from: string; to: string } | null) => void;
  isMenuOpen: boolean;
  setMenuOpen: (v: boolean) => void;
  isSearchOpen: boolean;
  setSearchOpen: (v: boolean) => void;
  isLocked: boolean;
  setLocked: (v: boolean) => void;
  hasPin: boolean;
  setHasPin: (v: boolean) => void;
  autoLock: boolean;
  setAutoLock: (v: boolean) => void;
  isQAEditing: boolean;
  setQAEditing: (v: boolean) => void;
  isHomeEditing: boolean;
  setHomeEditing: (v: boolean) => void;
  isReportBuilderOpen: boolean;
  setReportBuilderOpen: (v: boolean) => void;

  // Loyalty & Notifications
  userPoints: number;
  loginStreak: number;
  notifCount: number;
  isNotifPanelOpen: boolean;
  activeReward: { name: string; points: number } | null;
  setUserPoints: (v: number) => void;
  setLoginStreak: (v: number) => void;
  setNotifCount: (v: number) => void;
  setNotifPanelOpen: (v: boolean) => void;
  toggleNotifPanel: () => void;
  setActiveReward: (reward: { name: string; points: number } | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
  currentPage: 'splash',
  previousPage: 'home',
  setCurrentPage: (page) => set((s) => ({ previousPage: s.currentPage, currentPage: page })),
  reportPeriod: 'monthly',
  customRange: null,

  incognito: false,
  isPreviewActive: false,
  setIncognito: (v) => set({ incognito: v }),
  setPreviewActive: (v) => set({ isPreviewActive: v }),

  selectedItems: [],
  toggleSelection: (id) => set((s) => {
    const isSelected = s.selectedItems.includes(id);
    return {
      selectedItems: isSelected 
        ? s.selectedItems.filter(item => item !== id)
        : [...s.selectedItems, id]
    };
  }),
  clearSelection: () => set({ selectedItems: [] }),
  setAllSelection: (ids) => set({ selectedItems: ids }),

  selectedType: 'expense',
  selectedCategory: '',
  setSelectedType: (type) => set({ selectedType: type }),
  setSelectedCategory: (cat) => set({ selectedCategory: cat }),

  txnQuery: '',
  txnFilter: 'ALL',
  txnPage: 0,
  setTxnQuery: (q) => set({ txnQuery: q }),
  setTxnFilter: (f) => set({ txnFilter: f }),
  setTxnPage: (p) => set({ txnPage: p }),

  isQuickAddOpen: false,
  isGlobalActionOpen: false,
  editingTransactionId: null,
  setQuickAddOpen: (v) => set({ isQuickAddOpen: v }),
  setGlobalActionOpen: (v) => set({ isGlobalActionOpen: v }),
  setEditingTransactionId: (id) => set({ editingTransactionId: id }),
  pendingAction: null,
  setPendingAction: (action) => set({ pendingAction: action }),
   setReportPeriod: (period) => set({ reportPeriod: period }),
  setCustomRange: (range) => set({ customRange: range }),
  isMenuOpen: false,
  setMenuOpen: (v) => set({ isMenuOpen: v }),
  isSearchOpen: false,
  setSearchOpen: (v) => set({ isSearchOpen: v }),
  isLocked: false,
  setLocked: (v) => set({ isLocked: v }),
  hasPin: false,
  setHasPin: (v) => set({ hasPin: v }),
  autoLock: true,
  setAutoLock: (v) => set({ autoLock: v }),
  isHomeEditing: false,
  setHomeEditing: (v) => set({ isHomeEditing: v }),
  isQAEditing: false,
  setQAEditing: (v) => set({ isQAEditing: v }),
  isReportBuilderOpen: false,
  setReportBuilderOpen: (v) => set({ isReportBuilderOpen: v }),

  userPoints: 0,
  loginStreak: 0,
  notifCount: 0,
  isNotifPanelOpen: false,
  activeReward: null,
  setUserPoints: (v) => set({ userPoints: v }),
  setLoginStreak: (v) => set({ loginStreak: v }),
  setNotifCount: (v) => set({ notifCount: v }),
  setNotifPanelOpen: (v) => set({ isNotifPanelOpen: v }),
  toggleNotifPanel: () => set((s) => ({ isNotifPanelOpen: !s.isNotifPanelOpen })),
  setActiveReward: (reward) => set({ activeReward: reward }),
}));
