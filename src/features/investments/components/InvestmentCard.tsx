import React from 'react';
import { onActivate } from '@/core/a11yKeyboard';
import { useI18n } from '../../../i18n/index';
import { useFormat } from '../../../core/hooks/useFormat';
import type { Investment } from '../../../types';
import { INV_ICONS, INV_COLORS, investmentMetrics } from '../utils/investmentMeta';

/**
 * Directive 19 — deferred decomposition: the investment card.
 *
 * Lifted verbatim from Investments.tsx — icon tile, type chip, value and
 * the trend line, plus the hover-revealed desktop actions. A closed-bounds
 * card, so it carries cv-item + contain-card (§5.1 rule 3): off-screen
 * cards cost nothing to scroll past.
 */

interface InvestmentCardProps {
  inv: Investment;
  isSelectionMode: boolean;
  isSelected: boolean;
  onOpen: (inv: Investment) => void;
  onDelete: (id: string) => void;
}

export function InvestmentCard({ inv, isSelectionMode, isSelected, onOpen, onDelete }: InvestmentCardProps) {
  const { t } = useI18n();
  const { fmt } = useFormat();
  const { profit, profitPct } = investmentMetrics(inv);
  const color = INV_COLORS[inv.type || 'other'] || '#002b59';

  return (
    <div
      onClick={() => onOpen(inv)}
      className={`cv-item contain-card group relative overflow-hidden bg-white dark:bg-[#1e2124] rounded-[2rem] p-5 border transition-all duration-300 cursor-pointer active:scale-[0.98] ${isSelected ? 'border-blue-500 ring-2 ring-blue-500/20 shadow-lg' : 'border-slate-100 dark:border-white/5 hover:shadow-md hover:border-blue-100 dark:hover:border-blue-900/30'}`}
      role="button" tabIndex={0} onKeyDown={onActivate(() => onOpen(inv))}>
      <div className="flex items-center gap-4">
        {/* Selection Overlay */}
        {isSelectionMode && (
          <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${isSelected ? 'bg-blue-500 border-blue-500' : 'border-slate-300 dark:border-slate-600'}`}>
             {isSelected && <span className="material-symbols-outlined text-white text-sm font-black">check</span>}
          </div>
        )}

        <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-inner" style={{ background: `${color}15`, color }}>
          {(() => {
            const icon = inv.icon || INV_ICONS[inv.type || 'other'];
            const isEmoji = /\p{Extended_Pictographic}/u.test(icon) || icon === '₿';
            return (
              <span className={isEmoji ? "text-2xl" : "material-symbols-outlined text-2xl"} style={isEmoji ? {} : { fontVariationSettings: "'FILL' 1" }}>
                {icon}
              </span>
            );
          })()}
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-black text-slate-800 dark:text-slate-100 truncate text-base">{inv.name}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 dark:bg-slate-800 px-1.5 py-0.5 rounded-md border border-slate-100 dark:border-white/5">
              {t(`investment.${inv.type}`) || inv.type}
            </span>
            {inv.accountId && (
              <span className="material-symbols-outlined text-[10px] text-slate-300">link</span>
            )}
          </div>
        </div>

        <div className="text-right">
          <p className="font-black text-base dark:text-white tabular-nums">{fmt(inv.value)}</p>
          <div className={`flex items-center justify-end gap-0.5 mt-0.5 font-black text-[10px] ${profit >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
            <span className="material-symbols-outlined text-[12px]">{profit >= 0 ? 'trending_up' : 'trending_down'}</span>
            <span>{profitPct.toFixed(2)}%</span>
          </div>
        </div>
      </div>

      {/* Desktop/Tablet Hover Actions */}
      {!isSelectionMode && (
        <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity hidden md:flex items-center gap-2 bg-white/80 dark:bg-[#1e2124]/80 backdrop-blur-sm p-2 rounded-xl">
          <button aria-label={t('action.edit') || 'Edit'} onClick={(e) => { e.stopPropagation(); onOpen(inv); }} className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-500 flex items-center justify-center hover:scale-110 transition-transform">
            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">edit</span>
          </button>
          <button aria-label={t('action.delete') || 'Delete'} onClick={(e) => { e.stopPropagation(); onDelete(inv.id); }} className="w-8 h-8 rounded-lg bg-rose-50 dark:bg-rose-900/20 text-rose-500 flex items-center justify-center hover:scale-110 transition-transform">
            <span className="material-symbols-outlined text-[18px]" aria-hidden="true">delete</span>
          </button>
        </div>
      )}
    </div>
  );
}
