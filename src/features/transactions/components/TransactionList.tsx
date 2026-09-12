import React from 'react';
import { useTransactions } from '../hooks/useTransactions';
import { useI18n } from '../../../i18n/index';
import { useAppStore } from '../../../store/appStore';
import { useShallow } from 'zustand/react/shallow';
import { TransactionItem } from './TransactionItem';
import { TransactionFilters } from './TransactionFilters';
import { BulkActionsBar } from './BulkActionsBar';
import { getMonthName } from '../../../core/utils';
import { ListItemSkeleton } from '../../../components/ui/Skeleton';
import { StatementParser, type ImportedTransaction } from '../../../services/statementParser';
import { ImportReviewModal } from './ImportReviewModal';
import { RecycleBinModal } from './RecycleBinModal';
import { CoolingQueueModal } from './CoolingQueueModal';
import { TransactionRepository } from '../../../core/db/repositories/transactions';
import { toast } from '../../../toast';
import type { Transaction } from '../../../types';

import { useFormat } from '../../../core/hooks/useFormat';
import { getCategoryIcon, getCategoryColor } from '../../../core/categoryUtils';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../../core/db/core';

interface FlatListItem {
  key: string;
  type: 'header' | 'txn';
  date?: string;
  dayNet?: number;
  txn?: Transaction;
}


/**
 * TransactionList - Main container for the transactions page.
 */
export function TransactionList() {
  const { fmt } = useFormat();
  const { 
    transactions, 
    isLoading, 
    hasMore, 
    loadMore, 
    refresh,
    duplicateTransaction,
    getAllFilteredIds,
    totalCount
  } = useTransactions();

  const { t, language } = useI18n();
  const { selectedItems, clearSelection, setAllSelection } = useAppStore(
    useShallow((s) => ({
      selectedItems: s.selectedItems,
      clearSelection: s.clearSelection,
      setAllSelection: s.setAllSelection
    }))
  );

  const isSelecting = selectedItems.length > 0;
  const [selectionMode, setSelectionMode] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<'all' | 'drafts' | 'favorites'>('all');
  const [showTrash, setShowTrash] = React.useState(false);
  const [showCooling, setShowCooling] = React.useState(false);

  const sentinelRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    if (!hasMore || isLoading) return;

    // 1. IntersectionObserver as primary detection targeting the real scroll container
    const mainEl = document.getElementById('main-content');
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMore();
        }
      },
      {
        root: mainEl || null,
        rootMargin: '350px',
        threshold: 0.01,
      }
    );

    const currentSentinel = sentinelRef.current;
    if (currentSentinel) {
      observer.observe(currentSentinel);
    }

    // 2. Multi-target scroll listener as secondary detection for mobile and desktop WebViews
    const handleScroll = () => {
      if (!hasMore || isLoading) return;
      
      const el = document.getElementById('main-content');
      let scrollTop = 0;
      let scrollHeight = 0;
      let clientHeight = 0;
      
      if (el && el.scrollHeight > el.clientHeight) {
        scrollTop = el.scrollTop;
        scrollHeight = el.scrollHeight;
        clientHeight = el.clientHeight;
      } else {
        scrollTop = window.scrollY || document.documentElement.scrollTop;
        scrollHeight = document.documentElement.scrollHeight;
        clientHeight = window.innerHeight;
      }
      
      // If the scroll is within 350px of the bottom, load more
      if (scrollHeight - scrollTop - clientHeight < 350) {
        loadMore();
      }
    };

    if (mainEl) {
      mainEl.addEventListener('scroll', handleScroll, { passive: true });
    }
    window.addEventListener('scroll', handleScroll, { passive: true });
    document.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      if (currentSentinel) {
        observer.unobserve(currentSentinel);
      }
      if (mainEl) {
        mainEl.removeEventListener('scroll', handleScroll);
      }
      window.removeEventListener('scroll', handleScroll);
      document.removeEventListener('scroll', handleScroll);
    };
  }, [hasMore, isLoading, loadMore]);

  const coolingCount = useLiveQuery(
    async () => {
      const all = await db.transactions.toArray();
      return all.filter(t => t.isDraft && t.coolingExpireDate && !t.isDeleted).length;
    },
    [],
    0
  );

  const drafts = useLiveQuery(
    async () => {
      const all = await db.transactions.toArray();
      return all.filter(t => t.isDraft)
                .sort((a, b) => new Date(b.date || b.createdAt || Date.now()).getTime() - new Date(a.date || a.createdAt || Date.now()).getTime());
    },
    [],
    [] as Transaction[]
  );

  const favorites = useLiveQuery(
    async () => {
      const all = await db.transactions.toArray();
      return all.filter(t => t.isFavorite)
                .sort((a, b) => new Date(b.date || b.createdAt || Date.now()).getTime() - new Date(a.date || a.createdAt || Date.now()).getTime());
    },
    [],
    [] as Transaction[]
  );

  const handleQuickRepeat = async (fav: Transaction) => {
    try {
      const newTx = {
        ...fav,
        id: `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        date: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        isDraft: false
      };
      await TransactionRepository.add(newTx);
      toast(t('txn.repeatedSuccessfully') || 'Transaction repeated successfully ✓', 'success');
      refresh();
    } catch {
      toast(t('common.error') || 'Error repeating transaction', 'error');
    }
  };

  const toggleSelectionMode = () => {
    if (selectionMode) {
      clearSelection();
    }
    setSelectionMode(!selectionMode);
  };

  const [importingData, setImportingData] = React.useState<ImportedTransaction[] | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const parsed = await StatementParser.parseCSV(file);
      if (parsed.length === 0) {
        toast(t('txn.noImported'), 'error');
        return;
      }
      setImportingData(parsed);
    } catch {
      toast(t('txn.importError'), 'error');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleConfirmImport = async (final: ImportedTransaction[], defaultAccountId: string) => {
    const { AccountRepository } = await import('../../../core/db/repositories/accounts');
    const { CategoryRepository } = await import('../../../core/db/repositories/categories');
    
    // Cache existing categories and accounts for faster lookup
    const existingCats = await CategoryRepository.getAll();
    const existingAccs = await AccountRepository.getAll();
    
    const accMap = new Map(existingAccs.map(a => [a.name.toLowerCase().trim(), a.id]));

    for (const item of final) {
      let targetAccountId = defaultAccountId;
      let targetCategory = item.category || 'أخرى';

      // 1. Handle Account/Wallet Auto-Creation
      if (item.accountName) {
        const cleanAccName = item.accountName.trim();
        const accKey = cleanAccName.toLowerCase();
        
        if (accMap.has(accKey)) {
          targetAccountId = accMap.get(accKey)!;
        } else {
          // Create new wallet
          const newAcc = await AccountRepository.add({
            name: cleanAccName,
            balance: 0,
            initialBalance: 0,
            type: 'cash',
            color: '#3b82f6',
            icon: 'account_balance_wallet'
          });
          accMap.set(accKey, newAcc.id);
          targetAccountId = newAcc.id;
        }
      }

      // 2. Handle Category Auto-Creation with Type Awareness
      const cleanCatName = targetCategory.trim();
      const catKey = cleanCatName.toLowerCase();
      
      // Check if category exists with the SAME TYPE (or type 'both')
      const existing = existingCats.find(c => 
        c.name.toLowerCase().trim() === catKey && 
        (c.type === item.type || c.type === 'both')
      );

      if (existing) {
        targetCategory = existing.name;
      } else {
        const newCat = await CategoryRepository.add({
          name: cleanCatName,
          icon: getCategoryIcon(cleanCatName),
          color: getCategoryColor(cleanCatName),
          type: item.type, // Explicitly set the type (income or expense)
          order: existingCats.length + (final?.length || 0)
        });
        
        // Refresh local cache for subsequent items in the same import
        existingCats.push(newCat);
        targetCategory = cleanCatName;
      }

      // 3. Add Transaction
      await TransactionRepository.add({
        date: item.date,
        description: item.description,
        amount: item.amount,
        type: item.type,
        category: targetCategory,
        accountId: targetAccountId,
        account: targetAccountId
      });
    }
    
    setImportingData(null);
    refresh();

    // Award Loyalty 2.0 Milestone
    const { checkMilestone } = await import('../../../core/loyalty');
    await checkMilestone('FIRST_IMPORT');
  };

  // Group by date
  const grouped = React.useMemo(() => {
    const res: Record<string, Transaction[]> = {};
    const currentLang = language;

    transactions.forEach(txn => {
      const d = new Date(txn.date || txn.createdAt!);
      
      // Create localized date string: "Day, Date Month Year"
      let dStr = "";
      if (currentLang === 'ar') {
        const days = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
        dStr = `${days[d.getDay()]}، ${d.getDate()} ${getMonthName(d.getMonth())} ${d.getFullYear()}`;
      } else {
        dStr = d.toLocaleDateString(currentLang === 'en' ? 'en-US' : undefined, { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        });
      }

      if (!res[dStr]) res[dStr] = [];
      res[dStr].push(txn);
    });

    return res;
  }, [transactions, language]);

  const flatItems = React.useMemo<FlatListItem[]>(() => {
    const items: FlatListItem[] = [];
    Object.entries(grouped).forEach(([date, txns]) => {
      const dayIncome = txns.filter(t => t.type === 'income').reduce((s, t) => s + (Number(t.amount) || 0), 0);
      const dayExpense = txns.filter(t => t.type === 'expense').reduce((s, t) => s + (Number(t.amount) || 0), 0);
      const dayNet = dayIncome - dayExpense;
      items.push({ key: `hdr-${date}`, type: 'header', date, dayNet });
      txns.forEach(tx => {
        items.push({ key: tx.id, type: 'txn', txn: tx });
      });
    });
    return items;
  }, [grouped]);



  return (
    <div className="p-5 space-y-6 pb-32 animate-in fade-in duration-700">
      <div className="flex justify-between items-center px-1">
        <div className="space-y-1">
          <h2 className="text-3xl text-premium-header text-[var(--color-primary)] dark:text-blue-100">
            {t('txn.title')}
          </h2>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></div>
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest opacity-70">
              {transactions.length} {t('txn.count') || 'Transactions'}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileSelect} 
            accept=".csv,text/csv,text/comma-separated-values,application/csv" 
            className="hidden" 
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 flex items-center justify-center transition-all active:scale-95 shadow-sm"
            title={t('txn.importCsv')}
          >
            <span className="material-symbols-outlined text-xl">upload_file</span>
          </button>
          <button 
            onClick={() => setShowTrash(true)}
            className="w-10 h-10 rounded-2xl bg-rose-50 dark:bg-rose-900/20 text-rose-600 flex items-center justify-center transition-all active:scale-95 shadow-sm"
            title={t('trash.title') || 'سلة المحذوفات'}
          >
            <span className="material-symbols-outlined text-xl">delete_sweep</span>
          </button>
          <button 
            onClick={() => setShowCooling(true)}
            className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all active:scale-95 shadow-sm relative ${
              coolingCount > 0
                ? 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
            }`}
            title="طابور التبريد 🧊"
          >
            <span className={`material-symbols-outlined text-xl ${coolingCount > 0 ? 'animate-pulse' : ''}`}>ac_unit</span>
            {coolingCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-cyan-500 text-white text-[8px] font-black w-4 h-4 rounded-full flex items-center justify-center border border-white dark:border-[#121214]">
                {coolingCount}
              </span>
            )}
          </button>
          {transactions.length > 0 && (
            <button 
              onClick={toggleSelectionMode}
              className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all active:scale-95 ${
                selectionMode || isSelecting 
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' 
                : 'bg-surface-container-low text-slate-500 hover:bg-surface-container-high'
              }`}
              title={selectionMode || isSelecting ? t('action.cancel') : t('action.select')}
            >
              <span className="material-symbols-outlined text-xl">
                {selectionMode || isSelecting ? 'close' : 'checklist'}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Premium Glassmorphic Tab Bar */}
      <div className="relative p-1 bg-slate-100/80 dark:bg-slate-800/50 backdrop-blur-md rounded-[1.8rem] flex border border-black/5 dark:border-white/5 shadow-inner">
        <button
          onClick={() => setActiveTab('all')}
          className={`flex-1 py-3 text-xs font-black rounded-[1.5rem] transition-all relative z-10 ${
            activeTab === 'all' 
              ? 'text-white bg-gradient-to-r from-blue-600 to-indigo-700 shadow-md shadow-blue-500/20 active:scale-95' 
              : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          {t('txn.title') || 'Transactions'}
        </button>
        <button
          onClick={() => setActiveTab('drafts')}
          className={`flex-1 py-3 text-xs font-black rounded-[1.5rem] transition-all relative z-10 flex items-center justify-center gap-1.5 ${
            activeTab === 'drafts' 
              ? 'text-white bg-gradient-to-r from-blue-600 to-indigo-700 shadow-md shadow-blue-500/20 active:scale-95' 
              : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          {t('txn.drafts') || 'Drafts'}
          {drafts && drafts.length > 0 && (
            <span className="bg-amber-500 text-slate-900 text-[9px] font-black px-2 py-0.5 rounded-full flex items-center justify-center animate-pulse shrink-0">
              {drafts.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('favorites')}
          className={`flex-1 py-3 text-xs font-black rounded-[1.5rem] transition-all relative z-10 flex items-center justify-center gap-1.5 ${
            activeTab === 'favorites' 
              ? 'text-white bg-gradient-to-r from-blue-600 to-indigo-700 shadow-md shadow-blue-500/20 active:scale-95' 
              : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          {t('txn.favorites') || 'Favorites'}
          {favorites && favorites.length > 0 && (
            <span className="bg-rose-500 text-white text-[9px] font-black px-2 py-0.5 rounded-full flex items-center justify-center shrink-0">
              {favorites.length}
            </span>
          )}
        </button>
      </div>

      {activeTab === 'all' && (
        <>
          <TransactionFilters />

          {/* Premium Glassmorphic Bulk Selection Tool */}
          {(selectionMode || isSelecting) && transactions.length > 0 && (
            <div className="p-4 bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl border border-white/20 dark:border-white/5 rounded-[1.8rem] flex justify-between items-center shadow-lg animate-in slide-in-from-top-4 duration-300">
              <div className="flex gap-2">
                <button
                  onClick={async () => {
                    const allIds = await getAllFilteredIds();
                    setAllSelection(allIds);
                  }}
                  className="px-4 py-2 text-xs font-black rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 flex items-center gap-1.5 transition-all active:scale-95 hover:bg-blue-500/20 shadow-sm"
                >
                  <span className="material-symbols-outlined text-base">select_all</span>
                  {t('action.selectAll')}
                </button>
                <button
                  onClick={() => {
                    clearSelection();
                  }}
                  className="px-4 py-2 text-xs font-black rounded-xl bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20 flex items-center gap-1.5 transition-all active:scale-95 hover:bg-slate-500/20 shadow-sm"
                >
                  <span className="material-symbols-outlined text-base">deselect</span>
                  {t('action.deselectAll')}
                </button>
              </div>
              <div className="text-[10px] font-black text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/80 px-3 py-1.5 rounded-full border border-black/5 dark:border-white/5 shadow-inner">
                {selectedItems.length} / {totalCount}
              </div>
            </div>
          )}

          {/* Summary Card for current view */}
          {transactions.length > 0 && (
            <div className="grid grid-cols-2 gap-3 animate-in zoom-in duration-500">
              <div className="fin-card p-4 border-emerald-500/20 bg-emerald-50/30 dark:bg-emerald-900/10 text-center">
                <p className="text-[10px] font-black text-emerald-600/60 uppercase tracking-widest mb-1">{t('dashboard.income')}</p>
                <p className="text-xl font-black text-emerald-600 tabular-nums">
                  +{fmt(transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + (Number(t.amount) || 0), 0))}
                </p>
              </div>
              <div className="fin-card p-4 border-red-500/20 bg-red-50/30 dark:bg-red-900/10 text-center">
                <p className="text-[10px] font-black text-red-600/60 uppercase tracking-widest mb-1">{t('dashboard.expense')}</p>
                <p className="text-xl font-black text-red-600 tabular-nums">
                  -{fmt(transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + (Number(t.amount) || 0), 0))}
                </p>
              </div>
            </div>
          )}

          <div className="space-y-6">
            <div className="space-y-2">
              {flatItems.map((item) => {
                if (item.type === 'header') {
                  return (
                    <div key={item.key} className="flex justify-between items-center px-2 pt-4 pb-1">
                      <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{item.date}</h3>
                      <span className={`text-[10px] font-black tabular-nums ${(item.dayNet || 0) >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                        {(item.dayNet || 0) >= 0 ? '+' : ''}{fmt(item.dayNet || 0)}
                      </span>
                    </div>
                  );
                }
                if (item.type === 'txn' && item.txn) {
                  return (
                    <TransactionItem 
                      key={item.txn.id} 
                      transaction={item.txn} 
                      isSelecting={selectionMode || isSelecting}
                      onDuplicate={() => duplicateTransaction(item.txn!.id)}
                    />
                  );
                }
                return null;
              })}
            </div>

            {isLoading && transactions.length === 0 && (
              <div className="space-y-3">
                <ListItemSkeleton />
                <ListItemSkeleton />
                <ListItemSkeleton />
                <ListItemSkeleton />
              </div>
            )}

            {transactions.length === 0 && !isLoading && (
              <div className="py-20 text-center space-y-4">
                <span className="material-symbols-outlined text-6xl text-slate-200">receipt_long</span>
                <p className="text-slate-400 font-bold">{t('txn.noTxns')}</p>
              </div>
            )}

            {/* Infinite scroll sentinel and loader */}
            {(hasMore || isLoading) && (
              <div 
                ref={sentinelRef} 
                className="w-full py-6 flex justify-center items-center text-blue-600/50"
              >
                {isLoading && (
                  <div className="w-6 h-6 border-2 border-blue-600/20 border-t-blue-600 rounded-full animate-spin"></div>
                )}
              </div>
            )}
          </div>
        </>
      )}

      {activeTab === 'drafts' && (
        <div className="space-y-3 animate-in fade-in duration-300">
          {drafts && drafts.length > 0 ? (
            drafts.map(tx => (
              <TransactionItem 
                key={tx.id} 
                transaction={tx} 
                isSelecting={false}
              />
            ))
          ) : (
            <div className="py-20 text-center space-y-4">
              <span className="material-symbols-outlined text-6xl text-slate-200" style={{ fontVariationSettings: "'FILL' 1" }}>edit_note</span>
              <p className="text-slate-400 font-bold">{t('txn.noDrafts') || 'No drafts found'}</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'favorites' && (
        <div className="space-y-3 animate-in fade-in duration-300">
          {favorites && favorites.length > 0 ? (
            favorites.map(tx => (
              <TransactionItem 
                key={tx.id} 
                transaction={tx} 
                isSelecting={false}
                onRepeat={() => handleQuickRepeat(tx)}
              />
            ))
          ) : (
            <div className="py-20 text-center space-y-4">
              <span className="material-symbols-outlined text-6xl text-slate-200" style={{ fontVariationSettings: "'FILL' 1" }}>grade</span>
              <p className="text-slate-400 font-bold">{t('txn.noFavorites') || 'No favorite transactions found'}</p>
            </div>
          )}
        </div>
      )}

      {isSelecting && <BulkActionsBar onActionComplete={refresh} />}

      {importingData && (
        <ImportReviewModal 
          transactions={importingData}
          onConfirm={handleConfirmImport}
          onClose={() => setImportingData(null)}
        />
      )}

      {showTrash && (
        <RecycleBinModal 
          onClose={() => setShowTrash(false)}
          onRefreshList={refresh}
        />
      )}

      {showCooling && (
        <CoolingQueueModal 
          onClose={() => setShowCooling(false)}
          onRefreshList={refresh}
        />
      )}
    </div>
  );
}
