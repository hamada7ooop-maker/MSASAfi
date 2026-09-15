import React from 'react';
import { onActivate } from '@/core/a11yKeyboard';
import { useI18n } from '../../../i18n/index';
import { useFormat } from '../../../core/hooks/useFormat';
import type { Asset } from '../../../types';
import type { AssetMetrics } from '../../../core/utils/assetsEngine';

/**
 * Directive 19 — deferred decomposition: the asset card.
 *
 * Lifted verbatim from Assets.tsx — the depreciation bar, the warranty
 * chip, the category emoji and the edit/delete corner buttons. A closed
 *bounds card with no outer decoration, so it carries contain-card (§5.1
 * rule 3) — cheap layout+paint isolation for every card in the grid.
 */

const CATEGORY_EMOJI: Record<Asset['category'], string> = {
  real_estate: '🏠',
  vehicle: '🚗',
  electronics: '💻',
  other: '💎',
};

interface AssetCardProps {
  asset: Asset;
  metrics: AssetMetrics;
  onView: (asset: Asset) => void;
  onEdit: (asset: Asset) => void;
  onDelete: (e: React.MouseEvent, id: string) => void;
}

export function AssetCard({ asset, metrics, onView, onEdit, onDelete }: AssetCardProps) {
  const { t } = useI18n();
  const { fmt, getCurrencySymbol } = useFormat();
  const usedPercent = Math.min(100, Math.round((metrics.elapsedYears / asset.lifespanYears) * 100));

  return (
    <div
      onClick={() => onView(asset)}
      className="cv-item contain-card bg-white dark:bg-[#1e2124] p-5 rounded-[2.5rem] shadow-sm border border-black/5 dark:border-white/5 hover:-translate-y-1 active:scale-98 transition-all duration-300 cursor-pointer group relative overflow-hidden flex flex-col justify-between space-y-4"
      role="button" tabIndex={0} onKeyDown={onActivate(() => onView(asset))}>
      {/* رأس كارت الأصل */}
      <div className="flex items-start justify-between">
        {/* زر التعديل والحذف */}
        <div className="flex gap-2">
          <button aria-label={t('action.edit') || 'Edit'}
            onClick={(e) => { e.stopPropagation(); onEdit(asset); }}
            className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center transition-colors"
          >
            <span className="material-symbols-outlined text-base" aria-hidden="true">edit</span>
          </button>
          <button aria-label={t('action.delete') || 'Delete'}
            onClick={(e) => onDelete(e, asset.id)}
            className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-950/20 text-rose-500 hover:bg-rose-100 dark:hover:bg-rose-900/30 flex items-center justify-center transition-colors"
          >
            <span className="material-symbols-outlined text-base" aria-hidden="true">delete</span>
          </button>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <h4 className="text-base font-black text-slate-800 dark:text-slate-100 group-hover:text-blue-600 transition-colors">
              {asset.name}
            </h4>
            <span className="text-[10px] font-black text-slate-400">
              تاريخ الشراء: {asset.purchaseDate}
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-2xl">
            {CATEGORY_EMOJI[asset.category]}
          </div>
        </div>
      </div>

      {/* مقاييس القيمة الحالية وشريط الاستهلاك */}
      <div className="space-y-3">
        <div className="flex justify-between text-xs font-bold items-end">
          <div className="text-right">
            <span className="text-slate-400 block text-[9px]">القيمة الدفترية الحالية</span>
            <span className="text-sm font-black text-blue-600 dark:text-blue-400">
              {fmt(metrics.currentBookValue)} {getCurrencySymbol()}
            </span>
          </div>
          <div className="text-left">
            <span className="text-slate-400 block text-[9px]">سعر الشراء الكلي</span>
            <span className="text-slate-500 dark:text-slate-400">
              {fmt(asset.purchasePrice)} {getCurrencySymbol()}
            </span>
          </div>
        </div>

        {/* شريط الإهلاك البصري */}
        <div className="space-y-1">
          <div className="flex justify-between text-[9px] font-black text-slate-400">
            <span>متبقي {(100 - usedPercent)}% من العمر الخدمي</span>
            <span>مستهلك {usedPercent}%</span>
          </div>
          <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${usedPercent > 80 ? 'bg-rose-500' : usedPercent > 50 ? 'bg-amber-500' : 'bg-blue-500'}`}
              style={{ width: `${usedPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* مؤشر الضمان الصغير */}
      {asset.warrantyExpiry && (
        <div className="flex items-center gap-1.5 justify-end text-[9px] font-black">
          {metrics.isWarrantyExpired ? (
            <span className="text-rose-500 flex items-center gap-0.5 bg-rose-50 dark:bg-rose-950/20 px-2 py-1 rounded-full">
              الضمان منتهي
              <span className="material-symbols-outlined text-[10px]">gpp_bad</span>
            </span>
          ) : (
            <span className="text-emerald-500 flex items-center gap-0.5 bg-emerald-50 dark:bg-emerald-950/20 px-2 py-1 rounded-full animate-pulse">
              الضمان نشط (تبقّى {fmt(metrics.warrantyDaysLeft)} يوم)
              <span className="material-symbols-outlined text-[10px]">gpp_good</span>
            </span>
          )}
        </div>
      )}
    </div>
  );
}
