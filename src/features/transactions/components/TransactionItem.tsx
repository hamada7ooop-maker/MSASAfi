import React from 'react';
import { useI18n } from '../../../i18n/index';
import { useCategories } from '../../categories/hooks/useCategories';
import { useNavigate } from 'react-router-dom';
import { useFormat } from '../../../core/hooks/useFormat';
import { useAppStore } from '../../../store/appStore';
import { getCategoryColor, getCategoryIcon } from '../../../core/categoryUtils';
import type { Transaction } from '../../../types';

interface TransactionItemProps {
  transaction: Transaction;
  isSelecting: boolean;
  onDuplicate?: () => void;
  onRepeat?: () => void;
}

export const TransactionItem = React.memo(function TransactionItem({ transaction, isSelecting, onDuplicate: _onDuplicate, onRepeat }: TransactionItemProps) {
  const { t, formatCategoryLabel, relDate } = useI18n();
  const { fmt } = useFormat();
  const navigate = useNavigate();
  const isSelected = useAppStore((s) => s.selectedItems.includes(transaction.id));
  const toggleSelection = useAppStore((s) => s.toggleSelection);
  const { categories } = useCategories();
  
  // Find category info from the categories list
  const catInfo = categories.find(c => c.name === transaction.category);
  const catColor = catInfo ? catInfo.color : (getCategoryColor(transaction.category) || '#3b82f6');
  
  const isTransparent = catColor === 'transparent';
  const iconStyle = {
    color: isTransparent ? 'var(--color-primary)' : (catColor === 'white' ? '#64748b' : catColor),
    backgroundColor: isTransparent ? 'transparent' : (catColor === 'white' ? '#f1f5f9' : `${catColor}15`),
    border: isTransparent ? '2px dashed rgba(0,0,0,0.1)' : undefined
  };

  return (
    <div className="flex items-center gap-2 group animate-in slide-in-from-right-4 duration-300">
      {/* Selection Circle */}
      <div 
        onClick={() => toggleSelection(transaction.id)}
        className={`flex items-center justify-center cursor-pointer shrink-0 transition-all duration-300 ${
          isSelecting || isSelected ? 'w-10 opacity-100' : 'w-0 opacity-0 overflow-hidden'
        }`}
      >
        <span className={`material-symbols-outlined text-2xl ${
          isSelected ? 'text-blue-600 font-bold' : 'text-slate-300 dark:text-slate-700'
        }`}>
          {isSelected ? 'check_circle' : 'radio_button_unchecked'}
        </span>
      </div>

      {/* Main Content */}
      <div 
        role="button"
        tabIndex={0}
        aria-label={`${transaction.type === 'income' ? (t('home.income') || 'Income') : (t('txn.expense') || 'Expense')}: ${transaction.description || formatCategoryLabel(transaction.category)}, ${fmt(transaction.amount || 0)}`}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            if (isSelecting) {
              toggleSelection(transaction.id);
            } else {
              navigate(`/transactions/add?edit=${transaction.id}`);
            }
          }
        }}
        onClick={() => {
          if (isSelecting) {
            toggleSelection(transaction.id);
          } else {
            navigate(`/transactions/add?edit=${transaction.id}`);
          }
        }}
        className={`flex-1 fin-card p-4 flex items-center justify-between transition-all active:scale-[0.98] cursor-pointer group overflow-hidden ${
          isSelected 
          ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/20 shadow-lg shadow-blue-500/10' 
          : 'hover:border-blue-500/20 hover:bg-slate-50 dark:hover:bg-slate-700/30'
        }`}
      >
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <div 
            className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm border border-black/5 dark:border-white/5 transition-transform group-hover:scale-110"
            style={iconStyle}
          >
            {(() => {
              let icon = catInfo ? catInfo.icon : getCategoryIcon(transaction.category);
              if (icon === 'folder_open' || icon === 'payments') {
                const smartIcon = getCategoryIcon(transaction.category);
                if (smartIcon !== '🏷️') icon = smartIcon;
              }
              const isEmoji = /\p{Extended_Pictographic}/u.test(icon);
              return (
                <span className={isEmoji ? "text-xl" : "material-symbols-outlined text-2xl"} style={isEmoji ? {} : { fontVariationSettings: "'FILL' 1" }}>
                  {icon}
                </span>
              );
            })()}
          </div>
          
          <div className="flex-1 min-w-0">
            <p className="font-black text-slate-800 dark:text-slate-100 truncate text-sm transition-colors group-hover:text-blue-600 flex items-center gap-1.5">
              {transaction.description || formatCategoryLabel(transaction.category)}
              {transaction.mood && (
                <span className="text-xs shrink-0" title={`${t('txn.mood.label')}: ${t(`txn.mood.${transaction.mood}`)}`}>
                  {transaction.mood === 'happy' ? '😃' : transaction.mood === 'sad' ? '😔' : transaction.mood === 'stressed' ? '🤯' : transaction.mood === 'tired' ? '😴' : '😐'}
                </span>
              )}
            </p>
            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
              <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                {formatCategoryLabel(transaction.category)}
              </p>
              <span className="w-1 h-1 bg-slate-200 dark:bg-slate-700 rounded-full"></span>
              <p className="text-[10px] font-bold text-slate-400 dark:text-slate-600">
                {relDate(transaction.date || transaction.createdAt || Date.now())}
              </p>
              {transaction.type === 'expense' && transaction.necessity && (
                <>
                  <span className="w-1 h-1 bg-slate-200/50 dark:bg-slate-700/50 rounded-full"></span>
                  <span className={`px-2 py-0.5 rounded-full text-[8px] font-black tracking-tight ${
                    transaction.necessity === 'need'
                      ? 'bg-[#002b59]/10 dark:bg-blue-500/20 text-[#002b59] dark:text-blue-300'
                      : 'bg-amber-500/15 dark:bg-amber-500/25 text-amber-600 dark:text-amber-300'
                  }`}>
                    {t(`txn.necessity.${transaction.necessity}`)}
                  </span>
                </>
              )}
              {transaction.coolingExpireDate && (
                <>
                  <span className="w-1 h-1 bg-slate-200/50 dark:bg-slate-700/50 rounded-full"></span>
                  <span className={`px-2 py-0.5 rounded-full text-[8px] font-black tracking-tight flex items-center gap-0.5 ${
                    new Date(transaction.coolingExpireDate) > new Date()
                      ? 'bg-cyan-500/10 dark:bg-cyan-500/20 text-cyan-600 dark:text-cyan-400'
                      : 'bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                  }`}>
                    <span className="material-symbols-outlined text-[8px] font-bold">ac_unit</span>
                    {new Date(transaction.coolingExpireDate) > new Date() ? t('cooling.activeMsg') : t('cooling.doneMsg')}
                  </span>
                </>
              )}
              {transaction.isDraft && (
                <>
                  <span className="w-1 h-1 bg-slate-200/50 dark:bg-slate-700/50 rounded-full"></span>
                  <span className="px-2 py-0.5 rounded-full text-[8px] font-black tracking-tight bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400">
                    {t('txn.draft') || 'Draft'}
                  </span>
                </>
              )}
              {transaction.isFavorite && (
                <>
                  <span className="w-1 h-1 bg-slate-200/50 dark:bg-slate-700/50 rounded-full"></span>
                  <span className="px-2 py-0.5 rounded-full text-[8px] font-black tracking-tight bg-rose-500/10 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center gap-0.5">
                    <span className="material-symbols-outlined text-[8px] font-bold" style={{ fontVariationSettings: "'FILL' 1" }}>favorite</span>
                    {t('txn.favorite') || 'Favorite'}
                  </span>
                </>
              )}
              {transaction.splits && transaction.splits.length > 0 && (
                <>
                  <span className="w-1 h-1 bg-slate-200/50 dark:bg-slate-700/50 rounded-full"></span>
                  <span className="px-2 py-0.5 rounded-full text-[8px] font-black tracking-tight bg-purple-500/10 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center gap-0.5">
                    <span className="material-symbols-outlined text-[8px] font-bold">content_cut</span>
                    {t('travel.splitTransaction') || 'Split'}
                  </span>
                </>
              )}
            </div>

            {transaction.splits && transaction.splits.length > 0 && (
              <div className="mt-2.5 p-2 rounded-xl bg-slate-50/50 dark:bg-slate-800/40 border border-slate-100/50 dark:border-slate-700/30 text-[10px] space-y-1">
                {transaction.splits.map((split, i) => (
                  <div key={i} className="flex justify-between items-center text-slate-500 dark:text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <span className="text-[11px] shrink-0">{getCategoryIcon(split.category)}</span>
                      <span className="font-semibold">{formatCategoryLabel(split.category)}</span>
                      {split.description && <span className="opacity-70 truncate max-w-[120px]">({split.description})</span>}
                    </span>
                    <span className="font-black tabular-nums">{fmt(split.amount)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="text-right shrink-0 flex items-center gap-4">
          <div className="flex flex-col items-end">
            <p className={`font-black text-base tabular-nums ${
              transaction.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
            }`}>
              {transaction.type === 'income' ? '+' : '-'}{fmt(transaction.amount || 0)}
            </p>
            {transaction.attachment && (
              <span className="material-symbols-outlined text-[14px] text-blue-400 mt-0.5" style={{ fontVariationSettings: "'FILL' 1" }}>image</span>
            )}
          </div>
          
          {onRepeat && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRepeat();
              }}
              aria-label={t('txn.quickRepeat') || 'Quick Repeat'}
              className="w-9 h-9 rounded-2xl bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/40 text-blue-600 flex items-center justify-center active:scale-95 transition-all shadow-sm cursor-pointer"
              title={t('txn.quickRepeat') || 'Quick Repeat'}
            >
              <span className="material-symbols-outlined text-base" aria-hidden="true">replay</span>
            </button>
          )}
          {!isSelecting && (
            <span className="material-symbols-outlined text-slate-300 dark:text-slate-700 text-lg transition-transform group-hover:translate-x-1 rlt:rotate-180">chevron_right</span>
          )}
        </div>
      </div>
    </div>
  );
});
