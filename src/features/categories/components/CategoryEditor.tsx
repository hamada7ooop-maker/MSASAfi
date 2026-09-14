import React, { useState } from 'react';
import { useCategories } from '../hooks/useCategories';
import { useRules } from '../../settings/hooks/useRules';
import { useI18n } from '../../../i18n/index';
import { useSettingsStore } from '../../../store/settingsStore';
import type { Category, ClassificationRule } from '../../../types';
import { checkMilestone } from '../../../core/loyalty';
import { toast } from '../../../toast';
import { getCategoryIcon } from '../../../core/categoryUtils';
import { db } from '../../../core/db/core';


const BASIC_EMOJIS = [
  '🛒', '🛍️', '💰', '💸', '💳', '🏦', '🍽️', '🍕', '🍔', '🍟',
  '🚗', '🚕', '🚌', '🏠', '🏢', '🏗️', '💊', '🏥', '👕', '👗',
  '📚', '🎓', '🎬', '🎮', '⚽', '🏀', '👨‍👩‍👧‍👦', '👶', '🐱', '🐶',
  '📦', '📮', '🚩', '🔖', '🔗', '🔒', '🛡️', '⚙️', '🔧', '⚖️'
];

const PREMIUM_EMOJIS = [
  '💎', '📈', '📉', '🪙', '💵', '💶', '🏷️', '🚚',
  '🌭', '🥪', '🥗', '🍲', '🍜', '🍱', '🍣', '🍰', '🍦', '🍩', '☕', '🍵', '🥤', '🍎', '🍓', '🥑',
  '🏎️', '🏍️', '🚲', '🛴', '⛽', '✈️', '🚢', '🚆', '🏨', '🏝️', '🏕️', '🗺️',
  '🛋️', '💡', '🔋', '🔌', '🧹', '🧺', '🚿', '🪠', '🔑', '🛠️', '🔨',
  '🦷', '👓', '👜', '👟', '💄', '💍', '✂️', '💈', '🧼', '🏋️', '🧘', '💆',
  '✏️', '🖋️', '💼', '💻', '🖥️', '⌨️', '📠', '📁', '📊', '📅',
  '🕹️', '🎧', '🎸', '🎹', '🎨', '🎭', '🎫', '🎾', '🎳', '🎯', '🎰', '🎉', '🎁', '🎈',
  '👴', '👵', '👫', '👤', '🤝', '🫂', '🍼',
  '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🦁', '🌳', '🌴', '🌵', '🌱', '🌿', '☘️', '☀️', '🌙', '☁️', '☔', '❄️',
  '🧭'
];

const CATEGORY_COLORS = [
  '#002b59', '#FF6B35', '#FF4757', '#2196F3', '#9C27B0', 
  '#E91E63', '#FF9800', '#4CAF50', '#3F51B5', '#607D8B', 
  '#F44336', '#00BFA5', '#5C6BC0', '#EC407A', '#26A69A', 
  '#78909C', '#AB47BC', '#1b6d24', '#d97706', '#0284c7'
];

function CategoryModal({
  category, onSave, onClose, isPremiumUnlocked
}: {
  category?: Partial<Category>;
  onSave: (cat: Partial<Category>) => void;
  onClose: () => void;
  isPremiumUnlocked: boolean;
}) {
  const { t } = useI18n();
  const [form, setForm] = useState<Partial<Category>>(category ?? {
    name: '', type: 'expense', icon: '🏷️', color: '#002b59'
  });

  const set = <K extends keyof Category>(k: K, v: Category[K]) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div className="relative bg-white dark:bg-[#1e2124] w-full max-w-lg rounded-[2.5rem] p-6 pb-12 shadow-2xl space-y-4 animate-in slide-in-from-bottom-8 duration-300 max-h-[90vh] overflow-y-auto">
        <div className="w-10 h-1 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto mb-2" />
        <h3 className="text-lg font-black dark:text-white flex items-center justify-between">
          {category?.id ? t('action.edit') || 'Edit Category' : t('action.add') || 'Add Category'}
        </h3>

        {/* Name and Type */}
        <div className="flex gap-2">
          <select 
            value={form.type || 'expense'} 
            onChange={(e) => set('type', e.target.value as Category['type'])}
            className="w-1/3 bg-slate-50 dark:bg-[#2a2d30] p-3 rounded-2xl text-sm font-bold focus:outline-none dark:text-white"
          >
            <option value="expense">{t('transaction.expense') || 'Expense'}</option>
            <option value="income">{t('transaction.income') || 'Income'}</option>
            <option value="both">{t('category.typeBoth') || 'Both'}</option>
          </select>
          <input 
            dir="auto"
            value={form.name || ''} 
            onChange={e => set('name', e.target.value)}
            onCompositionEnd={e => set('name', e.currentTarget.value)}
            placeholder={t('category.name') || 'Category Name'}
            className="flex-1 bg-slate-50 dark:bg-[#2a2d30] p-3 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-400 dark:text-white" 
          />
        </div>

        {/* Color Picker */}
        <div>
          <label className="text-[10px] uppercase font-bold text-slate-400 mb-2 block tracking-widest">{t('category.color') || 'Color'}</label>
          <div className="flex gap-2 flex-wrap max-h-24 overflow-y-auto p-1 scrollbar-hide">
            <button onClick={() => set('color', 'transparent')}
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-all border-2 border-dashed border-slate-300 dark:border-slate-600 ${form.color === 'transparent' ? 'ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-[#1e2124] scale-110' : ''}`}
              title="Transparent">
              <span className="material-symbols-outlined text-[14px] text-slate-400" aria-hidden="true">do_not_disturb_on</span>
            </button>
            {CATEGORY_COLORS.map(c => (
              <button aria-label={t('action.confirm') || 'Confirm'} key={c} onClick={() => set('color', c)}
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${form.color === c ? 'ring-2 ring-offset-2 dark:ring-offset-[#1e2124] scale-110' : ''}`}
                style={{ backgroundColor: c }}>
                {form.color === c && <span className="material-symbols-outlined text-white text-[16px] font-bold" aria-hidden="true">check</span>}
              </button>
            ))}
          </div>
        </div>

        {/* Icon Picker */}
        <div>
          <label className="text-[10px] uppercase font-bold text-slate-400 mb-2 block tracking-widest">{t('category.icon') || 'Icon'}</label>
          <div className="flex gap-2 flex-wrap max-h-32 overflow-y-auto p-1 scrollbar-hide">
            {BASIC_EMOJIS.map(ic => (
              <button key={ic} onClick={() => set('icon', ic)}
                className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl transition-all ${form.icon === ic ? 'ring-2 ring-blue-500 ring-offset-1 dark:ring-offset-[#1e2124] scale-110' : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
                style={{ backgroundColor: (form.icon === ic && form.color !== 'transparent') ? (form.color || '#002b59') : undefined }}>
                {ic}
              </button>
            ))}
            
            {PREMIUM_EMOJIS.map(ic => (
              <button aria-label={t('action.lock') || 'Lock'} key={ic} 
                onClick={() => isPremiumUnlocked ? set('icon', ic) : (window as Window & { showShop?: () => void }).showShop?.()}
                className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl transition-all relative ${form.icon === ic ? 'ring-2 ring-blue-500 ring-offset-1 dark:ring-offset-[#1e2124] scale-110' : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700'} ${!isPremiumUnlocked ? 'opacity-60 grayscale' : ''}`}
                style={{ backgroundColor: (form.icon === ic && form.color !== 'transparent') ? (form.color || '#002b59') : undefined }}>
                {ic}
                {!isPremiumUnlocked && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 rounded-full flex items-center justify-center shadow-sm">
                    <span className="material-symbols-outlined text-[10px] text-white font-black" aria-hidden="true">lock</span>
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <button onClick={onClose} className="flex-1 py-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-sm">
            {t('action.cancel')}
          </button>
          <button onClick={() => { if (form.name) { onSave(form); onClose(); } }}
            className="flex-1 py-3 rounded-2xl text-white font-black text-sm shadow-lg"
            style={{ 
              backgroundColor: form.color === 'transparent' ? '#002b59' : (form.color || '#002b59'), 
              boxShadow: `0 4px 14px 0 ${(form.color === 'transparent' ? '#002b59' : (form.color || '#002b59'))}40` 
            }}>
            {t('action.save')}
          </button>
        </div>
      </div>
    </div>
  );
}

export function CategoryEditor() {
  const { t, formatCategoryLabel } = useI18n();
  const { categories, isLoading, addCategory, updateCategory, deleteCategory, reorderCategories } = useCategories();
  const { rules, addRule, deleteRule, updateRule } = useRules();
  const unlockedItems = useSettingsStore(s => s.unlockedItems);
  const isPremiumUnlocked = unlockedItems.includes('perk:icon-pack');

  const [showModal, setShowModal] = useState(false);
  const [editingCat, setEditingCat] = useState<Partial<Category> | undefined>();
  const [rulesManagerCat, setRulesManagerCat] = useState<Category | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'expense' | 'income'>('all');

  React.useEffect(() => {
    const init = async () => {
      if (!isLoading) {
        if (categories.length === 0) {
          await db.initDefaultCategories();
        } else {
          await db.repairCategories();
          if (categories.length < 15) {
            await db.appendMissingDefaultCategories();
          }
        }
      }
    };
    init();
  }, [isLoading, categories.length]);

  if (isLoading) return (
    <div className="flex items-center justify-center p-20 animate-pulse text-slate-400">
      {t('misc.loading')}
    </div>
  );

  const moveUp = (index: number) => {
    if (index === 0) return;
    const filteredIds = filteredCategories.map(c => c.id);
    const globalIndex1 = categories.findIndex(c => c.id === filteredIds[index]);
    const globalIndex2 = categories.findIndex(c => c.id === filteredIds[index - 1]);
    
    const newOrder = [...categories.map(c => c.id)];
    [newOrder[globalIndex1], newOrder[globalIndex2]] = [newOrder[globalIndex2], newOrder[globalIndex1]];
    reorderCategories(newOrder);
  };

  const moveDown = (index: number) => {
    if (index === filteredCategories.length - 1) return;
    const filteredIds = filteredCategories.map(c => c.id);
    const globalIndex1 = categories.findIndex(c => c.id === filteredIds[index]);
    const globalIndex2 = categories.findIndex(c => c.id === filteredIds[index + 1]);
    
    const newOrder = [...categories.map(c => c.id)];
    [newOrder[globalIndex1], newOrder[globalIndex2]] = [newOrder[globalIndex2], newOrder[globalIndex1]];
    reorderCategories(newOrder);
  };

  const handleSave = async (data: Partial<Category>) => {
    if (editingCat?.id) {
      await updateCategory(editingCat.id, data);
    } else {
      await addCategory(data);
      checkMilestone('FIRST_CATEGORY');
    }
  };

  const filteredCategories = categories.filter(c => {
    if (filterType === 'all') return true;
    if (c.type === 'both') return true;
    return c.type === filterType;
  });

  return (
    <div className="p-5 space-y-6 pb-32 animate-in fade-in duration-700">
      <div className="flex items-center justify-between px-1">
        <div className="space-y-1">
          <h2 className="text-3xl text-premium-header text-[var(--color-primary)] dark:text-blue-100 flex items-center gap-2">
            {t('page.categories') || 'Categories'}
          </h2>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></div>
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest opacity-70">
              {filteredCategories.length} {t('category.activeCount') || 'Categorization Rules Active'}
            </p>
          </div>
        </div>
        
        <button aria-label={t('action.add') || 'Add'} onClick={() => { setEditingCat(undefined); setShowModal(true); }}
          className="w-10 h-10 rounded-2xl bg-[#002b59] text-white flex items-center justify-center shadow-lg shadow-blue-500/30 active:scale-90 transition-transform">
          <span className="material-symbols-outlined text-xl" aria-hidden="true">add</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex bg-surface-container-low dark:bg-slate-800/50 p-1.5 rounded-[1.5rem] mx-1 border border-black/5 dark:border-white/5">
        {(['all', 'expense', 'income'] as const).map(tp => (
          <button key={tp} onClick={() => setFilterType(tp)}
            className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${filterType === tp ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-300 shadow-md' : 'text-slate-500'}`}>
            {tp === 'all' ? (t('txn.all') || 'All') : tp === 'expense' ? (t('transaction.expense') || 'Expense') : (t('transaction.income') || 'Income')}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="space-y-3">
        {filteredCategories.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-4">
          <span className="material-symbols-outlined text-6xl">category</span>
          <p className="font-bold text-sm">{t('category.none') || 'No categories found'}</p>
          <button 
            onClick={async () => {
              await db.initDefaultCategories(true);
            }}
            className="px-6 py-2 rounded-xl bg-blue-600 text-white text-xs font-black shadow-lg shadow-blue-500/20 active:scale-95 transition-all"
          >
            {t('category.loadDefaults') || 'Load Default Categories'}
          </button>
        </div>
        ) : filteredCategories.map((cat, index) => (
          <div key={cat.id} className="fin-card p-4 flex items-center gap-4 transition-all hover:shadow-lg group">
            
            {/* Reorder handles */}
            <div className="flex flex-col gap-1 shrink-0">
              <button aria-label={t('action.collapse') || 'Collapse'} onClick={() => moveUp(index)} disabled={index === 0} className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-300 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 disabled:opacity-30 transition-all">
                <span className="material-symbols-outlined text-base font-bold" aria-hidden="true">expand_less</span>
              </button>
              <button aria-label={t('action.expand') || 'Expand'} onClick={() => moveDown(index)} disabled={index === filteredCategories.length - 1} className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-300 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 disabled:opacity-30 transition-all">
                <span className="material-symbols-outlined text-base font-bold" aria-hidden="true">expand_more</span>
              </button>
            </div>
            
            {/* Icon */}
            <div 
              className="w-14 h-14 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-lg border border-white/20 transition-transform group-hover:scale-110" 
              style={{ 
                backgroundColor: cat.color === 'transparent' ? 'transparent' : (cat.color || '#002b59'),
                border: cat.color === 'transparent' ? '2px dashed rgba(0,0,0,0.1)' : undefined
              }}
            >
              {(() => {
                let icon = cat.icon || 'category';
                if (icon === 'folder_open' || icon === 'payments') {
                  const smartIcon = getCategoryIcon(cat.name);
                  if (smartIcon !== '🏷️') icon = smartIcon;
                }
                const isEmoji = /\p{Extended_Pictographic}/u.test(icon);
                return (
                  <span className={isEmoji ? "text-3xl" : "material-symbols-outlined text-3xl"} style={isEmoji ? {} : { fontVariationSettings: "'FILL' 1", color: cat.color === 'transparent' ? 'var(--color-primary)' : 'white' }}>
                    {icon}
                  </span>
                );
              })()}
            </div>
            
            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="font-black text-base text-slate-800 dark:text-slate-100 truncate group-hover:text-blue-600 transition-colors">
                {formatCategoryLabel(cat.name)}
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                <p className={`text-[9px] font-black uppercase tracking-widest ${cat.type === 'income' ? 'text-emerald-500' : cat.type === 'both' ? 'text-blue-500' : 'text-rose-500'}`}>
                  {cat.type === 'income' ? (t('transaction.income') || 'Income') : cat.type === 'both' ? (t('category.typeBoth') || 'Both') : (t('transaction.expense') || 'Expense')}
                </p>
                
                {/* Rule Count Badge */}
                {(() => {
                  const count = rules.filter(r => r.category === cat.name).length;
                  if (count === 0) return null;
                  return (
                    <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-lg bg-blue-500/10 text-blue-600 text-[8px] font-black uppercase tracking-tighter">
                      <span className="material-symbols-outlined text-[10px]" style={{ fontVariationSettings: "'FILL' 1" }}>neurology</span>
                      {count}
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button 
                onClick={() => setRulesManagerCat(cat)}
                className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-400 flex items-center justify-center active:scale-90 hover:bg-indigo-500/10 hover:text-indigo-500 transition-all"
                title={t('settings.manageRules')}
              >
                <span className="material-symbols-outlined text-xl" aria-hidden="true">neurology</span>
              </button>
              <button aria-label={t('action.edit') || 'Edit'} onClick={() => { setEditingCat(cat); setShowModal(true); }} className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-800 text-blue-500 flex items-center justify-center active:scale-90 hover:bg-blue-500/10 transition-all">
                <span className="material-symbols-outlined text-xl" aria-hidden="true">edit</span>
              </button>
              {filteredCategories.length > 1 && (
                <>
                  {confirmDeleteId === cat.id ? (
                    <div className="flex gap-1 animate-in fade-in slide-in-from-right-2 duration-300">
                      <button aria-label={t('action.confirm') || 'Confirm'} onClick={async () => {
                        await deleteCategory(cat.id);
                        setConfirmDeleteId(null);
                      }} className="w-10 h-10 rounded-xl bg-rose-500 text-white flex items-center justify-center shadow-lg active:scale-90 transition-all">
                        <span className="material-symbols-outlined text-xl" aria-hidden="true">check</span>
                      </button>
                      <button aria-label={t('action.close') || 'Close'} onClick={() => setConfirmDeleteId(null)} className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 flex items-center justify-center active:scale-90 transition-all">
                        <span className="material-symbols-outlined text-xl" aria-hidden="true">close</span>
                      </button>
                    </div>
                  ) : (
                    <button aria-label={t('action.delete') || 'Delete'} onClick={() => setConfirmDeleteId(cat.id)} className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center active:scale-90 hover:bg-rose-500/20 transition-all">
                      <span className="material-symbols-outlined text-xl" aria-hidden="true">delete</span>
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <CategoryModal
          category={editingCat}
          onSave={handleSave}
          onClose={() => { setShowModal(false); setEditingCat(undefined); }}
          isPremiumUnlocked={isPremiumUnlocked}
        />
      )}

      {rulesManagerCat && (
        <CategoryRulesOverlay 
          category={rulesManagerCat}
          allRules={rules}
          onClose={() => setRulesManagerCat(null)}
          onAdd={async (rule) => {
            const { id: _id, ...cleanRule } = rule;
            await addRule(cleanRule);
          }}
          onDelete={deleteRule}
          onUpdate={updateRule}
        />
      )}
    </div>
  );
}

function CategoryRulesOverlay({ 
  category, allRules, onClose, onAdd, onDelete, onUpdate 
}: { 
  category: Category; 
  allRules: ClassificationRule[]; 
  onClose: () => void;
  onAdd: (rule: Omit<ClassificationRule, 'id'> & { id?: string }) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onUpdate: (id: string, updates: Partial<ClassificationRule>) => Promise<void>;
}) {
  const { t, formatCategoryLabel } = useI18n();
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingRule, setEditingRule] = useState<ClassificationRule | null>(null);
  
  // Form State
  const [pattern, setPattern] = useState('');
  const [isRegex, setIsRegex] = useState(false);
  const [priority, setPriority] = useState(1);

  const catRules = allRules.filter(r => r.category === category.name);

  const handleSave = async () => {
    if (!pattern) {
      toast(t('common.fillAll'), 'error');
      return;
    }
    try {
      if (editingRule) {
        await onUpdate(editingRule.id, { pattern, isRegex, priority });
        toast(t('common.success'), 'success');
      } else {
        await onAdd({ pattern, category: category.name, isRegex, priority, isActive: true });
        toast(t('settings.ruleAdded'), 'success');
      }
      closeModal();
    } catch {
      toast(t('common.error'), 'error');
    }
  };

  const closeModal = () => {
    setShowAddModal(false);
    setEditingRule(null);
    setPattern('');
    setIsRegex(false);
    setPriority(1);
  };

  const openEdit = (rule: ClassificationRule) => {
    setEditingRule(rule);
    setPattern(rule.pattern);
    setIsRegex(rule.isRegex);
    setPriority(rule.priority || 1);
    setShowAddModal(true);
  };

  return (
    <div className="fixed inset-0 z-[1000] bg-slate-50 dark:bg-[#0f1113] flex flex-col animate-in slide-in-from-bottom duration-500">
      {/* Header */}
      <div className="p-6 flex items-center justify-between border-b border-black/5 dark:border-white/5 bg-white dark:bg-[#1c1f23]">
        <button aria-label={t('action.close') || 'Close'} onClick={onClose} className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 active:scale-90 transition-all">
          <span className="material-symbols-outlined" aria-hidden="true">close</span>
        </button>
        <div className="flex flex-col items-center">
          <h2 className="text-sm font-black text-[#002b59] dark:text-blue-100">
            {t('settings.manageRules')}
          </h2>
          <p className="text-[10px] text-blue-500 font-black uppercase tracking-widest">{formatCategoryLabel(category.name)}</p>
        </div>
        <button aria-label={t('action.add') || 'Add'} onClick={() => setShowAddModal(true)} className="w-10 h-10 rounded-xl bg-blue-500 text-white flex items-center justify-center active:scale-90 transition-all shadow-lg shadow-blue-500/20">
          <span className="material-symbols-outlined" aria-hidden="true">add</span>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {catRules.length === 0 ? (
          <div className="py-20 text-center">
            <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="material-symbols-outlined text-4xl text-slate-300">rule</span>
            </div>
            <p className="text-sm font-bold text-slate-400">{t('settings.noRules')}</p>
            <button 
              onClick={() => setShowAddModal(true)}
              className="mt-4 px-6 py-2 rounded-xl bg-blue-600/10 text-blue-600 text-[10px] font-black uppercase tracking-widest"
            >
              {t('settings.addRule')}
            </button>
          </div>
        ) : (
          catRules.map(rule => (
            <div key={rule.id} className="flex items-center gap-4 p-5 bg-white dark:bg-[#1c1f23] rounded-[2rem] border border-black/5 dark:border-white/5 shadow-sm">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${rule.isRegex ? 'bg-amber-500/10 text-amber-500' : 'bg-blue-500/10 text-blue-500'}`}>
                <span className="material-symbols-outlined text-2xl">
                  {rule.isRegex ? 'data_object' : 'match_case'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                   <p className="font-black text-sm text-on-surface truncate">{rule.pattern}</p>
                   <span className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-[9px] font-black uppercase text-slate-400">P{rule.priority}</span>
                </div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                  {rule.isRegex ? t('settings.ruleTypeRegex') : t('settings.ruleTypeExact')}
                </p>
              </div>
              <div className="flex gap-1">
                <button aria-label={t('action.edit') || 'Edit'} onClick={() => openEdit(rule)} className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-blue-500 active:scale-90 transition-all">
                  <span className="material-symbols-outlined text-sm" aria-hidden="true">edit</span>
                </button>
                <button aria-label={t('action.delete') || 'Delete'} onClick={() => onDelete(rule.id)} className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-red-500 active:scale-90 transition-all">
                  <span className="material-symbols-outlined text-sm" aria-hidden="true">delete</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add/Edit Sub-Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-6 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white dark:bg-[#1c1f23] w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl animate-in zoom-in-95 duration-300">
            <h3 className="text-xl font-black text-[#002b59] dark:text-blue-100 mb-6">
              {editingRule ? t('action.edit') : t('settings.addRule')}
            </h3>
            
            <div className="space-y-6">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 px-1">{t('settings.rulePattern')}</label>
                <input 
                  autoFocus
                  type="text"
                  dir="auto"
                  value={pattern}
                  onChange={(e) => setPattern(e.target.value)}
                  onCompositionEnd={(e) => setPattern(e.currentTarget.value)}
                  placeholder={t('settings.rulePh')}
                  className="w-full bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-4 text-sm font-bold border-none outline-none focus:ring-2 ring-blue-500/30 dark:text-white"
                />
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 px-1">{t('settings.ruleType')}</label>
                <div className="flex p-1 bg-slate-100 dark:bg-slate-800/50 rounded-2xl">
                  <button 
                    onClick={() => setIsRegex(false)}
                    className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${!isRegex ? 'bg-white dark:bg-[#2a2d31] shadow-md text-blue-600' : 'text-slate-500'}`}
                  >
                    {t('settings.ruleTypeExact')}
                  </button>
                  <button 
                    onClick={() => setIsRegex(true)}
                    className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${isRegex ? 'bg-white dark:bg-[#2a2d31] shadow-md text-blue-600' : 'text-slate-500'}`}
                  >
                    {t('settings.ruleTypeRegex')}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 px-1">{t('settings.rulePriority')} (1-100)</label>
                <div className="flex items-center gap-4">
                  <input 
                    type="range"
                    min="1"
                    max="100"
                    value={priority}
                    onChange={(e) => setPriority(parseInt(e.target.value))}
                    className="flex-1 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                  <span className="text-xs font-black text-blue-600 dark:text-blue-400 w-8 text-center">{priority}</span>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button onClick={closeModal} className="flex-1 py-4 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-500 font-black text-xs active:scale-95 transition-all">
                {t('action.cancel')}
              </button>
              <button onClick={handleSave} className="flex-[2] py-4 rounded-2xl bg-blue-600 text-white font-black text-xs shadow-lg active:scale-95 transition-all">
                {t('action.save')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
