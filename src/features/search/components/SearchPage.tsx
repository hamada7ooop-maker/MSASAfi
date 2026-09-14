import React, { useState } from 'react';
import { onActivate } from '@/core/a11yKeyboard';
import { useSearch } from '../hooks/useSearch';
import { ErrorState } from '../../../components/common/ErrorState';
import { useI18n } from '../../../i18n/index';
import { useFormat } from '../../../core/hooks/useFormat';
import { TransactionItem } from '../../transactions/components/TransactionItem';
import { useNavigate } from 'react-router-dom';

export function SearchPage() {
  const { t, formatCategoryLabel } = useI18n();
  const { fmt } = useFormat();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const { results, isLoading, error, retry } = useSearch(query);

  const hasResults = results.transactions.length > 0 || results.accounts.length > 0 || results.categories.length > 0;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#121214] pb-32 animate-in fade-in duration-500">
      {/* Header */}
      <div className="bg-white dark:bg-[#1c1f23] p-6 pt-12 rounded-b-[2.5rem] shadow-sm sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <button aria-label={t('action.back') || 'Back'} 
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-2xl bg-slate-50 dark:bg-slate-800 text-slate-400 flex items-center justify-center active:scale-90 transition-transform"
          >
            <span className="material-symbols-outlined" aria-hidden="true">arrow_back</span>
          </button>
          <div className="flex-1 relative">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">search</span>
            <input 
              autoFocus
              type="text" 
              dir="auto"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onCompositionEnd={(e) => setQuery(e.currentTarget.value)}
              placeholder={t('action.search') || 'Search everything...'}
              className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-2xl py-3 pl-12 pr-4 font-bold text-sm text-[#002b59] dark:text-blue-100 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-400/20"
            />
            {isLoading && (
              <div className="absolute right-4 top-1/2 -translate-y-1/2">
                <div className="w-4 h-4 border-2 border-blue-400/20 border-t-blue-400 rounded-full animate-spin"></div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="p-4 space-y-8 mt-4">
        {!query.trim() ? (
          <div className="py-20 text-center space-y-4 opacity-30">
            <span className="material-symbols-outlined text-6xl">manage_search</span>
            <p className="text-sm font-black uppercase tracking-widest">{t('search.start') || 'Type to search'}</p>
          </div>
        ) : error && !isLoading ? (
          /* Directive 16: a failed search is not "no results" — the user
             would otherwise conclude the thing they know exists is gone. */
          <ErrorState onRetry={retry} />
        ) : !hasResults && !isLoading ? (
          <div className="py-20 text-center space-y-4">
            <span className="material-symbols-outlined text-6xl text-slate-200">sentiment_dissatisfied</span>
            <p className="text-slate-400 font-bold">{t('search.noResults') || 'No results found'}</p>
          </div>
        ) : (
          <>
            {/* Accounts Results */}
            {results.accounts.length > 0 && (
              <section className="space-y-3">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-2">{t('nav.accounts')}</h3>
                <div className="grid grid-cols-1 gap-2">
                  {results.accounts.map(acc => (
                    <div 
                      key={acc.id}
                      onClick={() => navigate('/accounts')} 
                      className="bg-white dark:bg-slate-800 p-4 rounded-3xl flex items-center justify-between border border-black/5 dark:border-white/5 shadow-sm active:scale-[0.98] cursor-pointer"
  role="button" tabIndex={0} onKeyDown={onActivate(() => navigate('/accounts'))}>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-900/20 text-blue-500 flex items-center justify-center">
                          <span className="material-symbols-outlined text-xl">account_balance</span>
                        </div>
                        <div>
                          <p className="font-bold text-slate-800 dark:text-white text-sm">{acc.name}</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase">{t(`account.type.${acc.type}`) || acc.type}</p>
                        </div>
                      </div>
                      <p className="font-black text-slate-800 dark:text-white">{fmt(acc.balance)}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Categories Results */}
            {results.categories.length > 0 && (
              <section className="space-y-3">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-2">{t('txn.category')}</h3>
                <div className="flex flex-wrap gap-2 px-1">
                  {results.categories.map(cat => (
                    <div 
                      key={cat.id}
                      className="px-4 py-2 rounded-2xl bg-white dark:bg-slate-800 border border-black/5 dark:border-white/5 shadow-sm text-[11px] font-bold text-slate-600 dark:text-slate-300"
                    >
                      {formatCategoryLabel(cat.name)}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Transactions Results */}
            {results.transactions.length > 0 && (
              <section className="space-y-3">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-2">{t('nav.transactions')}</h3>
                <div className="space-y-2">
                  {results.transactions.map(txn => (
                    <TransactionItem 
                      key={txn.id}
                      transaction={txn}
                      isSelecting={false}
                    />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}
