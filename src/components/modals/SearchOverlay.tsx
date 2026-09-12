import React, { useState, useEffect, useRef } from 'react';
import { useAppStore } from '../../store/appStore';
import { useShallow } from 'zustand/react/shallow';
import { useIsMounted } from '../../hooks/useIsMounted';
import { useI18n } from '../../i18n/index';
import { useFormat } from '../../core/hooks/useFormat';
import { useNavigate } from 'react-router-dom';
import { db as DB } from '@/core/db/core';
import { silentFail } from '../../core/utils';

interface SearchResult {
  id: string;
  icon: string;
  color: string;
  title: string;
  sub: string;
  page: string;
  type: 'txn' | 'goal' | 'debt' | 'bill' | 'sub';
}

export function SearchOverlay() {
  const { t, isLTR } = useI18n();
  const { fmt, getCurrencySymbol } = useFormat();
  const isMounted = useIsMounted();
  const { isSearchOpen, setSearchOpen } = useAppStore(
    useShallow((s) => ({ isSearchOpen: s.isSearchOpen, setSearchOpen: s.setSearchOpen }))
  );
  const navigate = useNavigate();
  
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isSearchOpen) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 300);
      const onKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') setSearchOpen(false);
      };
      window.addEventListener('keydown', onKeyDown);
      return () => {
        clearTimeout(timer);
        window.removeEventListener('keydown', onKeyDown);
      };
    } else {
      setQuery('');
      setResults([]);
    }
  }, [isSearchOpen, setSearchOpen]);

  useEffect(() => {
    const runSearch = async () => {
      const q = query.toLowerCase().trim();
      if (q.length < 2) {
        setResults([]);
        return;
      }

      setIsSearching(true);
      try {
        const [txns, goals, debts, bills, subs] = await Promise.all([
          DB.getTransactions(),
          DB.getGoals(),
          DB.getDebts(),
          DB.getBills(),
          typeof DB.getSubscriptions === 'function' ? DB.getSubscriptions() : Promise.resolve([])
        ]);

        const res: SearchResult[] = [];

        // Transactions
        txns
          .filter(tx => (tx.description || '').toLowerCase().includes(q) || (tx.category || '').toLowerCase().includes(q))
          .slice(0, 8)
          .forEach(tx => res.push({
            id: `tx_${tx.id}`,
            icon: 'receipt',
            color: '#002b59',
            title: tx.description || t(tx.category) || tx.category,
            sub: `${tx.type === 'income' ? '+' : '-'}${fmt(tx.amount)} ${getCurrencySymbol()} • ${new Date(tx.date || tx.createdAt || Date.now()).toLocaleDateString()}`,
            page: '/transactions',
            type: 'txn'
          }));

        // Goals
        goals
          .filter(g => g.name.toLowerCase().includes(q))
          .forEach(g => res.push({ 
            id: `goal_${g.id}`, icon: 'flag', color: '#1b6d24', title: g.name, sub: `${fmt(g.target)}`, page: '/goals', type: 'goal' 
          }));

        // Debts
        debts
          .filter(d => d.name.toLowerCase().includes(q))
          .forEach(d => res.push({ 
            id: `debt_${d.id}`, icon: 'balance', color: '#5e0006', title: d.name, sub: `${fmt(d.total - (d.paid || 0))}`, page: '/debts', type: 'debt' 
          }));

        // Bills
        bills
          .filter(b => b.name.toLowerCase().includes(q))
          .forEach(b => res.push({ 
            id: `bill_${b.id}`, icon: 'receipt_long', color: '#930010', title: b.name, sub: `${fmt(b.amount)}`, page: '/bills', type: 'bill' 
          }));

        // Subs
        subs
          .filter(s => s.name.toLowerCase().includes(q))
          .forEach(s => res.push({ 
            id: `sub_${s.id}`, icon: 'subscriptions', color: '#002b59', title: s.name, sub: `${fmt(s.amount)}`, page: '/bills', type: 'sub' 
          }));

        if (isMounted.current) {
          setResults(res);
        }
      } catch (err) {
        silentFail('[Search] Error running global search')(err);
      } finally {
        if (isMounted.current) {
          setIsSearching(false);
        }
      }
    };

    const timer = setTimeout(runSearch, 300); // debounce
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  if (!isSearchOpen) return null;

  return (
    <div 
      role="dialog"
      aria-modal="true"
      aria-label={t('search.placeholder') || 'Search'}
      className="fixed inset-0 z-[99990] flex flex-col bg-[#f8f9fa] dark:bg-[#121214] transition-opacity duration-300 animate-in slide-in-from-bottom-full"
      onClick={() => setSearchOpen(false)}
    >
      <div 
        className="flex-1 w-full max-w-4xl mx-auto bg-[#f8f9fa] dark:bg-[#121214] shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Search Bar */}
        <div className="p-4 pt-[calc(1rem+env(safe-area-inset-top,0px))] bg-white dark:bg-[#1c1f23] shadow-sm sticky top-0 z-10 flex items-center gap-3">
          <button 
            onClick={() => setSearchOpen(false)}
            aria-label={t('action.close') || 'Close'}
            className="w-10 h-10 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 transition-all shrink-0"
          >
            <span className="material-symbols-outlined">{isLTR ? 'arrow_back' : 'arrow_forward'}</span>
          </button>
          <div className="flex-1 bg-slate-100 dark:bg-slate-800/50 rounded-2xl px-4 py-3 flex items-center gap-2 border border-transparent focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all">
            <span className="material-symbols-outlined text-[#002b59] dark:text-blue-400">search</span>
            <input 
              ref={inputRef}
              type="text" 
              dir="auto"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onCompositionEnd={(e) => setQuery(e.currentTarget.value)}
              className="bg-transparent border-none w-full text-base font-bold focus:outline-none dark:text-white placeholder:text-slate-400" 
              placeholder={t('search.placeholder') || 'البحث في كل شيء...'} 
            />
            {query.length > 0 && (
              <button 
                onClick={() => setQuery('')}
                aria-label={t('action.clear') || 'Clear'}
                className="w-6 h-6 rounded-full bg-slate-300 dark:bg-slate-600 flex items-center justify-center text-slate-600 dark:text-slate-300 active:scale-90"
              >
                <span className="material-symbols-outlined text-[14px]">close</span>
              </button>
            )}
          </div>
        </div>

        {/* Search Results Area */}
        <div className="flex-1 overflow-y-auto p-4 safe-bottom">
          {query.length < 2 ? (
            <div className="text-center py-20 text-slate-400">
              <span className="material-symbols-outlined text-6xl block mb-4 opacity-40 animate-pulse">manage_search</span>
              <p className="font-bold text-lg">{t('search.start') || 'ابدأ البحث الآن'}</p>
            </div>
          ) : isSearching ? (
             <div className="space-y-3">
               {Array.from({ length: 4 }).map((_, i) => (
                 <div key={i} className="skeleton h-20 w-full rounded-2xl"></div>
               ))}
             </div>
          ) : results.length > 0 ? (
            <div className="space-y-3 animate-in fade-in duration-300">
              <p className="text-xs text-slate-400 font-bold px-1">
                {t('search.resultsCount', { n: String(results.length) }) || `${results.length} نتائج`}
              </p>
              {results.map((r) => (
                <div 
                  key={r.id}
                  onClick={() => {
                    setSearchOpen(false);
                    navigate(r.page);
                  }}
                  className="bg-white dark:bg-[#1c1f23] p-4 rounded-2xl flex items-center gap-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-[#25282d] transition-all active:scale-[0.98] border border-slate-100 dark:border-slate-800 shadow-sm"
                >
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${r.color}15` }}>
                    <span className="material-symbols-outlined text-2xl" style={{ color: r.color, fontVariationSettings: "'FILL' 1" }}>{r.icon}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-base text-slate-800 dark:text-white truncate">{r.title}</p>
                    <p className="text-xs text-slate-500 font-bold mt-0.5 truncate">{r.sub}</p>
                  </div>
                  <span className={`material-symbols-outlined text-slate-300 dark:text-slate-600 ${isLTR ? '' : 'rotate-180'}`}>chevron_right</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-20 text-slate-400 animate-in zoom-in-95 duration-300">
              <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="material-symbols-outlined text-4xl">search_off</span>
              </div>
              <p className="font-bold text-lg text-slate-600 dark:text-slate-300">{t('search.noResults') || 'لا توجد نتائج'}</p>
              <p className="text-sm mt-1">"{query}"</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
