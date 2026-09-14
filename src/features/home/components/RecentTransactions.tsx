import React from 'react';
import { onActivate } from '@/core/a11yKeyboard';
import { useFormat } from '@core/hooks/useFormat';
import { useCategory } from '@core/hooks/useCategory';
import { useCategories } from '../../categories/hooks/useCategories';
import { useI18n } from '@/i18n/index';
import { useNavigate } from 'react-router-dom';
import type { Transaction } from '@/types';

interface RecentTransactionsProps {
  transactions: Transaction[];
}

/**
 * RecentTransactions Component - Displays a list of the 5 most recent transactions.
 */
export function RecentTransactions({ transactions }: RecentTransactionsProps) {
  const { fmt } = useFormat();
  const { getCategoryIcon, formatCategoryLabel } = useCategory();
  const { categories } = useCategories();
  const { t } = useI18n();
  const navigate = useNavigate();

  if (transactions.length === 0) {
    return (
      <div className="fin-card p-6 text-center">
        <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="material-symbols-outlined text-3xl text-slate-400">receipt_long</span>
        </div>
        <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">{t('txn.noTxns')}</h3>
        <p className="text-xs text-slate-400 mt-1">{t('txn.noTxnsSub')}</p>
      </div>
    );
  }

  return (
    <div className="fin-card p-6 mb-6 hover:shadow-2xl hover:border-blue-500/10 transition-all duration-500">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-premium-header text-sm text-[var(--color-primary)] dark:text-blue-100 uppercase tracking-tighter">
          {t('home.recentTxns')}
        </h3>
        <button 
          onClick={() => navigate('/transactions')}
          className="bg-surface-container-low dark:bg-slate-700/50 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 hover:text-blue-600 transition-colors"
        >
          {t('action.viewAll')}
        </button>
      </div>
      
      <div className="space-y-5">
        {transactions.slice(0, 5).map((tx) => (
          <div key={tx.id} className="flex items-center justify-between group cursor-pointer gap-2 min-w-0" onClick={() => navigate(`/transactions/add?edit=${tx.id}`)}
  role="button" tabIndex={0} onKeyDown={onActivate(() => navigate(`/transactions/add?edit=${tx.id}`))}>
            <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
              {(() => {
                const catInfo = categories.find(c => c.name === tx.category);
                let icon = catInfo ? catInfo.icon : getCategoryIcon(tx.category);
                if (icon === 'folder_open' || icon === 'payments') {
                  const smartIcon = getCategoryIcon(tx.category);
                  if (smartIcon !== '🏷️') icon = smartIcon;
                }
                const color = catInfo ? catInfo.color : undefined;
                const isTransparent = color === 'transparent';
                const isEmoji = /\p{Extended_Pictographic}/u.test(icon);
                
                return (
                  <div 
                    className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center transition-all group-hover:scale-110 shadow-sm border border-black/5 dark:border-white/5 shrink-0"
                    style={{ 
                      backgroundColor: isTransparent ? 'transparent' : (color || undefined),
                      border: isTransparent ? '2px dashed rgba(0,0,0,0.1)' : undefined
                    }}
                  >
                    <span className={isEmoji ? "text-xl" : "material-symbols-outlined text-2xl"} style={isEmoji ? {} : { fontVariationSettings: "'FILL' 1", color: isTransparent ? 'var(--color-primary)' : 'white' }}>
                      {icon}
                    </span>
                  </div>
                );
              })()}
              <div className="min-w-0 flex-1">
                <p className="font-black text-sm text-slate-800 dark:text-slate-100 truncate group-hover:text-blue-600 transition-colors" title={tx.description || formatCategoryLabel(tx.category)}>
                  {tx.description || formatCategoryLabel(tx.category)}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.1em]">
                    {formatCategoryLabel(tx.category)}
                  </span>
                  <div className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700"></div>
                  <span className="text-[9px] font-bold text-slate-300 dark:text-slate-600">
                    {new Date(tx.date || tx.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2 shrink-0 ml-2">
              <p className={`font-black text-base tabular-nums ${tx.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-800 dark:text-slate-100'}`}>
                {tx.type === 'income' ? '+' : '-'}{fmt(tx.amount)}
              </p>
              <span className="material-symbols-outlined text-slate-300 dark:text-slate-700 text-sm group-hover:translate-x-1 transition-transform rtl:rotate-180">chevron_right</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
