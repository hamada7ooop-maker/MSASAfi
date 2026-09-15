import React from 'react';

/**
 * Directive 19 — deferred decomposition: the category filter pills.
 *
 * Lifted verbatim from Assets.tsx. The five categories are the Asset type's
 * own union plus the synthetic 'all' — nothing more, nothing less.
 */

const CATEGORIES: { id: string; label: string }[] = [
  { id: 'all', label: 'الكل 📁' },
  { id: 'real_estate', label: 'عقارات 🏠' },
  { id: 'vehicle', label: 'مركبات 🚗' },
  { id: 'electronics', label: 'إلكترونيات 💻' },
  { id: 'other', label: 'أخرى 💎' }
];

interface AssetCategoryFilterProps {
  selectedCategory: string;
  onSelect: (category: string) => void;
}

export function AssetCategoryFilter({ selectedCategory, onSelect }: AssetCategoryFilterProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide" dir="rtl">
      {CATEGORIES.map(btn => (
        <button
          key={btn.id}
          onClick={() => onSelect(btn.id)}
          className={`px-5 py-3 rounded-2xl text-xs font-black transition-all whitespace-nowrap ${
            selectedCategory === btn.id
              ? 'bg-blue-600 text-white shadow-md'
              : 'bg-white dark:bg-[#1e2124] text-slate-600 dark:text-slate-300 border border-black/5 dark:border-white/5 hover:scale-105'
          }`}
        >
          {btn.label}
        </button>
      ))}
    </div>
  );
}
