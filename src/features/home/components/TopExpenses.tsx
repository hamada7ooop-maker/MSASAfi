import React from 'react';
import { useI18n } from '../../../i18n/index';
import { useFormat } from '../../../core/hooks/useFormat';
import { useCategory } from '../../../core/hooks/useCategory';
import { useCategories } from '../../categories/hooks/useCategories';
import { getMonthName } from '@core/utils';

interface TopExpensesProps {
  categoryBreakdown: Record<string, number>;
}

export const TopExpenses = React.memo(function TopExpenses({ categoryBreakdown }: TopExpensesProps) {
  const { t } = useI18n();
  const { fmt } = useFormat();
  const { formatCategoryLabel, getCategoryIcon } = useCategory();
  const { categories } = useCategories();

  const topItems = Object.entries(categoryBreakdown || {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  if (topItems.length === 0) return null;

  return (
    <div className="bg-white dark:bg-slate-800 rounded-[32px] p-7 shadow-xl border border-black/5 dark:border-white/5">
      <div className="flex justify-between items-center mb-6">
        <h3 className="font-black text-sm uppercase tracking-tighter flex items-center gap-2">
          <span className="material-symbols-outlined text-rose-500">pie_chart</span>
          {t('home.topExpenses')}
        </h3>
        <span className="bg-slate-100 dark:bg-slate-700 px-3 py-1 rounded-xl text-[9px] font-black uppercase tracking-widest text-slate-500">
          {getMonthName(new Date().getMonth())}
        </span>
      </div>
      <div className="space-y-4">
        {topItems.map(([cat, amount], i) => (
          <div key={i} className="flex items-center gap-4">
            {(() => {
              const catInfo = categories.find(c => c.name === cat);
              let icon = catInfo ? catInfo.icon : getCategoryIcon(cat);
              if (icon === 'folder_open' || icon === 'payments') {
                const smartIcon = getCategoryIcon(cat);
                if (smartIcon !== '🏷️') icon = smartIcon;
              }
              const color = catInfo ? catInfo.color : undefined;
              const isTransparent = color === 'transparent';
              const isEmoji = /\p{Extended_Pictographic}/u.test(icon);
              
              return (
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                  !isTransparent && i === 0 ? 'bg-rose-500 text-white' : 
                  !isTransparent && i === 1 ? 'bg-orange-500 text-white' : 
                  'bg-slate-100 dark:bg-slate-700 text-slate-500'
                }`}
                style={{ 
                  backgroundColor: isTransparent ? 'transparent' : (color || undefined),
                  border: isTransparent ? '2px dashed rgba(0,0,0,0.1)' : undefined
                }}>
                  <span className={isEmoji ? "text-xl" : "material-symbols-outlined text-xl"} style={isEmoji ? {} : { color: isTransparent ? 'var(--color-primary)' : undefined }}>
                    {icon}
                  </span>
                </div>
              );
            })()}
            <div className="flex-1 min-w-0">
              <p className="font-black text-sm text-slate-700 dark:text-slate-200 truncate">
                {formatCategoryLabel(cat)}
              </p>
              <div className="w-full bg-slate-100 dark:bg-slate-700 h-1.5 rounded-full mt-1.5 overflow-hidden">
                <div 
                  className={`h-full rounded-full ${i === 0 ? 'bg-rose-500' : 'bg-slate-300 dark:bg-slate-500'}`}
                  style={{ width: `${(amount / topItems[0][1]) * 100}%` }}
                ></div>
              </div>
            </div>
            <p className="font-black text-sm tabular-nums text-slate-700 dark:text-slate-200">
              {fmt(amount)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
});
