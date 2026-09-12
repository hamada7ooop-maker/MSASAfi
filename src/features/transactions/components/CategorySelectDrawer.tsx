import React, { useEffect } from 'react';
import { useI18n } from '../../../i18n';
import type { Category } from '../../../types';
import { getCategoryIcon } from '../../../core/categoryUtils';

interface CategorySelectDrawerProps {
  isOpen: boolean;
  type: 'income' | 'expense';
  categories: Category[];
  selectedCategory: string;
  categorySearchQuery: string;
  onSearchChange: (q: string) => void;
  onSelectCategory: (categoryName: string) => void;
  onClose: () => void;
}

export function CategorySelectDrawer({
  isOpen,
  type,
  categories,
  selectedCategory,
  categorySearchQuery,
  onSearchChange,
  onSelectCategory,
  onClose,
}: CategorySelectDrawerProps) {
  const { t } = useI18n();

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filteredCategories = categories
    .filter((c) => c.type === type || c.type === 'both')
    .filter((c) => {
      const localizedName = t(c.name) || c.name;
      return (
        localizedName.toLowerCase().includes(categorySearchQuery.toLowerCase()) ||
        c.name.toLowerCase().includes(categorySearchQuery.toLowerCase())
      );
    });

  return (
    <div 
      className="fixed inset-0 z-[105] flex items-end justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
      role="dialog"
      aria-modal="true"
      aria-labelledby="category-drawer-title"
    >
      <div className="bg-white dark:bg-[#1c1f23] w-full rounded-t-[3rem] p-6 shadow-2xl animate-in slide-in-from-bottom duration-300 max-h-[85vh] flex flex-col">
        <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto mb-6 flex-shrink-0"></div>
        
        <div className="flex items-center justify-between mb-4 flex-shrink-0">
          <h3 id="category-drawer-title" className="text-lg font-black text-[#002b59] dark:text-blue-100 flex items-center gap-2">
            <span className="material-symbols-outlined">category</span>
            {t('category.showAll') || 'كل الفئات 🏷️'}
          </h3>
          <button 
            type="button" 
            onClick={onClose}
            aria-label={t('common.cancel')}
            className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>

        {/* شريط البحث الذكي */}
        <div className="relative mb-6 flex-shrink-0">
          <span className="material-symbols-outlined absolute right-4 top-3.5 text-slate-400">search</span>
          <input 
            type="text"
            dir="auto"
            autoComplete="off"
            value={categorySearchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={t('category.searchPh') || 'ابحث عن فئة...'}
            aria-label={t('category.searchPh') || 'Search category'}
            className="w-full bg-slate-50 dark:bg-slate-800/50 rounded-2xl py-3 pr-12 pl-4 text-sm font-bold border-none outline-none focus:ring-2 ring-blue-500/30 text-right rtl:text-right"
          />
        </div>

        {/* شبكة الفئات المفلترة القابلة للتمرير */}
        <div className="flex-1 overflow-y-auto pb-8 scrollbar-hide">
          <div className="grid grid-cols-4 gap-4">
            {filteredCategories.map((c) => {
              const isSelected = selectedCategory === c.name;
              return (
                <button 
                  key={c.id}
                  type="button"
                  onClick={() => onSelectCategory(c.name)}
                  className="flex flex-col items-center gap-2 group cursor-pointer"
                >
                  <div 
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 ${
                      isSelected 
                        ? 'ring-4 ring-blue-500/30 scale-105 shadow-md' 
                        : 'opacity-60 grayscale-[0.3] hover:opacity-100 hover:scale-105'
                    }`}
                    style={{ 
                      backgroundColor: c.color === 'transparent' ? 'transparent' : `${c.color}20`, 
                      color: c.color === 'transparent' ? 'var(--color-primary)' : (c.color === 'white' ? '#64748b' : c.color), 
                      border: `2px solid ${c.color === 'transparent' ? 'rgba(0,0,0,0.1)' : `${c.color}30`}` 
                    }}
                  >
                    {(() => {
                      let icon = c.icon || 'category';
                      if (icon === 'folder_open' || icon === 'payments') {
                        const smartIcon = getCategoryIcon(c.name);
                        if (smartIcon !== '🏷️') icon = smartIcon;
                      }
                      const isEmoji = /\p{Extended_Pictographic}/u.test(icon);
                      return (
                        <span className={isEmoji ? 'text-2xl' : 'material-symbols-outlined text-2xl'} style={isEmoji ? {} : { fontVariationSettings: "'FILL' 1" }}>
                          {icon}
                        </span>
                      );
                    })()}
                  </div>
                  <span className={`text-[10px] font-black truncate w-full text-center ${isSelected ? 'text-[#002b59] dark:text-blue-300' : 'text-slate-400'}`}>
                    {t(c.name)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
