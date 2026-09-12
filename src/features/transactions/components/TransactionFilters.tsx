import React, { useEffect, useState } from 'react';
import { useAppStore } from '../../../store/appStore';
import { useShallow } from 'zustand/react/shallow';
import { useIsMounted } from '../../../hooks/useIsMounted';
import { useI18n } from '../../../i18n/index';
import { db as DB } from '@/core/db/core';
import type { Category } from '@/types';

export function TransactionFilters() {
  const { t, formatCategoryLabel } = useI18n();
  const isMounted = useIsMounted();
  const { txnQuery, setTxnQuery, txnFilter, setTxnFilter, setTxnPage } = useAppStore(
    useShallow((s) => ({
      txnQuery: s.txnQuery,
      setTxnQuery: s.setTxnQuery,
      txnFilter: s.txnFilter,
      setTxnFilter: s.setTxnFilter,
      setTxnPage: s.setTxnPage
    }))
  );
  const [categories, setCategories] = useState<Category[]>([]);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    const loadCats = async () => {
      const cats = await DB.getCategories();
      if (!isMounted.current) return;
      const expenseCats = cats.filter(c => c.type === 'expense' || c.type === 'both');
      setCategories(showAll ? expenseCats : expenseCats.slice(0, 4));
    };
    loadCats();
  }, [showAll, isMounted]);

  const chips = [
    { key: 'ALL', label: t('txn.all') },
    { key: 'INCOME', label: t('txn.income') },
    { key: 'EXPENSE', label: t('txn.expense') },
    ...categories.map(c => ({ key: c.name, label: formatCategoryLabel(c.name) }))
  ];

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="relative group">
        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
          <span className="material-symbols-outlined text-slate-400 group-focus-within:text-blue-600 transition-colors">search</span>
        </div>
        <input 
          type="text"
          dir="auto"
          value={txnQuery}
          onChange={(e) => {
            setTxnQuery(e.target.value);
            setTxnPage(0);
          }}
          onCompositionEnd={(e) => {
            setTxnQuery(e.currentTarget.value);
            setTxnPage(0);
          }}
          placeholder={`${t('action.search')}...`}
          className="w-full bg-white dark:bg-slate-800 p-4 pl-12 rounded-[2rem] border border-black/5 dark:border-white/5 shadow-sm text-sm focus:ring-2 ring-blue-500/20 outline-none dark:text-white transition-all hover:border-blue-500/20"
        />
      </div>

      {/* Filter Chips */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide scroll-smooth px-1">
        {chips.map((chip) => (
          <button
            key={chip.key}
            onClick={() => {
              setTxnFilter(chip.key);
              setTxnPage(0);
            }}
            className={`px-5 py-2.5 rounded-2xl text-[11px] font-black whitespace-nowrap transition-all active:scale-95 ${
              txnFilter === chip.key
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-black/5 dark:border-white/5 hover:border-blue-500/10'
            }`}
          >
            {chip.label}
          </button>
        ))}
        {!showAll && (
          <button 
            className="px-5 py-2.5 rounded-2xl text-[11px] font-black whitespace-nowrap bg-surface-container-low dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-black/5 dark:border-white/5 active:scale-95"
            onClick={() => setShowAll(true)}
          >
            {t('action.more') || 'المزيد'}
          </button>
        )}
      </div>
    </div>
  );
}
