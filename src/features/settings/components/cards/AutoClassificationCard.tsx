import React, { useState } from 'react';
import { useRules } from '../../hooks/useRules';
import { useI18n } from '../../../../i18n';
import { toast } from '../../../../toast';
import { CategoryRepository } from '../../../../core/db/repositories/categories';
import type { ClassificationRule, Category } from '@/types';

export function AutoClassificationCard() {
  const { t } = useI18n();
  const { rules, isLoading, addRule, deleteRule, updateRule } = useRules();
  const [showManager, setShowManager] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingRule, setEditingRule] = useState<ClassificationRule | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);

  // Form state
  const [pattern, setPattern] = useState('');
  const [category, setCategory] = useState('');
  const [isRegex, setIsRegex] = useState(false);
  const [priority, setPriority] = useState(1);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [ruleToDelete, setRuleToDelete] = useState<ClassificationRule | null>(null);

  const [showExplanation, setShowExplanation] = useState<string | null>(null);

  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    CategoryRepository.getAll().then(setCategories);
  }, []);

  // Fix: Handle focus after modal animation finishes to prevent shuddering
  React.useEffect(() => {
    if (showAddModal) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 350);
      return () => clearTimeout(timer);
    }
  }, [showAddModal]);

  const handleSave = async () => {
    if (!pattern || !category) {
      toast(t('common.fillAll'), 'error');
      return;
    }

    try {
      if (editingRule) {
        await updateRule(editingRule.id, { pattern, category, isRegex, priority });
        toast(t('common.success'), 'success');
      } else {
        await addRule({ pattern, category, isRegex, priority, isActive: true });
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
    setCategory('');
    setIsRegex(false);
    setPriority(1);
    setShowExplanation(null);
  };

  const openEdit = (rule: ClassificationRule) => {
    setEditingRule(rule);
    setPattern(rule.pattern);
    setCategory(rule.category);
    setIsRegex(rule.isRegex);
    setPriority(rule.priority);
    setShowAddModal(true);
  };

  const openDelete = (rule: ClassificationRule) => {
    setRuleToDelete(rule);
    setShowDeleteModal(true);
  };

  if (isLoading) return null;

  const filteredRules = rules.filter(r => 
    r.pattern.toLowerCase().includes(searchQuery.toLowerCase()) || 
    r.category.toLowerCase().includes(searchQuery.toLowerCase())
  ).sort((a,b) => (b.priority || 0) - (a.priority || 0));

  return (
    <>
      {/* Summary Card - Clickable and Professional */}
      <div 
        onClick={() => setShowManager(true)}
        className="bg-white/40 dark:bg-white/[0.02] backdrop-blur-md rounded-[1.75rem] p-6 flex items-center gap-4 cursor-pointer active:scale-[0.99] border border-white/20 dark:border-white/[0.05] shadow-[0_8px_32px_0_rgba(31,38,135,0.03)] hover:bg-black/[0.01] dark:hover:bg-white/[0.01] transition-all duration-150 group"
      >
        <div className="w-14 h-14 rounded-[1.5rem] bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/20">
          <span className="material-symbols-outlined text-2xl">neurology</span>
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-black text-on-surface dark:text-white mb-0.5">
            {t('settings.rulesCardTitle')}
          </h3>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none">
            {t('settings.rulesCount').replace('{n}', rules.length.toString())}
          </p>
        </div>
        <div className="w-10 h-10 rounded-full flex items-center justify-center text-slate-300 group-hover:text-blue-500 transition-colors">
          <span className="material-symbols-outlined">chevron_right</span>
        </div>
      </div>

      {/* Full-Screen Rules Manager Overlay */}
      {showManager && (
        <div className="fixed inset-0 z-[10000] bg-slate-50 dark:bg-[#0f1113] flex flex-col animate-slideUp">
          {/* Header */}
          <div className="p-6 flex items-center justify-between border-b border-black/5 dark:border-white/5 bg-white/80 dark:bg-[#1a1d21]/80 backdrop-blur-md">
            <button aria-label={t('action.close') || 'Close'} onClick={() => setShowManager(false)} className="w-10 h-10 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/[0.03] dark:border-white/[0.03] flex items-center justify-center text-slate-500 active:scale-90 transition-all">
              <span className="material-symbols-outlined" aria-hidden="true">close</span>
            </button>
            <h2 className="text-lg font-black text-[#002b59] dark:text-blue-100">
              {t('settings.manageRules')}
            </h2>
            <button aria-label={t('action.add') || 'Add'} onClick={() => setShowAddModal(true)} className="w-10 h-10 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex items-center justify-center active:scale-90 transition-all shadow-lg shadow-blue-500/20">
              <span className="material-symbols-outlined" aria-hidden="true">add</span>
            </button>
          </div>

          {/* Search & Stats */}
          <div className="p-6 pb-2 space-y-4">
            <div className="relative">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">search</span>
              <input 
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('settings.searchRules')}
                className="w-full bg-white dark:bg-[#1a1d21]/60 rounded-2xl p-4 pl-12 text-sm font-bold border border-black/5 dark:border-white/5 outline-none focus:ring-2 ring-blue-500/20 dark:text-white backdrop-blur-sm"
              />
            </div>
            
            <div className="p-4 bg-blue-500/5 rounded-[1.75rem] border border-blue-500/10 backdrop-blur-sm">
              <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 mb-1">
                <span className="material-symbols-outlined text-sm">auto_awesome</span>
                <h4 className="text-[10px] font-black uppercase tracking-widest">{t('settings.rulesGuideTitle')}</h4>
              </div>
              <p className="text-[9px] text-slate-500 dark:text-slate-400 font-bold leading-relaxed">
                {t('settings.rulesGuideDesc')}
              </p>
            </div>
          </div>

          {/* Rules List */}
          <div className="flex-1 overflow-y-auto p-6 space-y-3 custom-scrollbar">
            {filteredRules.length === 0 ? (
              <div className="py-20 text-center animate-in fade-in duration-300">
                <div className="w-20 h-20 bg-black/[0.02] dark:bg-white/[0.02] border border-black/[0.03] dark:border-white/[0.03] rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="material-symbols-outlined text-4xl text-slate-300">rule</span>
                </div>
                <p className="text-sm font-bold text-slate-400">{t('settings.noRules')}</p>
              </div>
            ) : (
              filteredRules.map(rule => (
                <div key={rule.id} className="flex items-center gap-4 p-5 bg-white/60 dark:bg-white/[0.02] backdrop-blur-sm rounded-[2rem] border border-white/20 dark:border-white/[0.05] shadow-[0_8px_32px_0_rgba(31,38,135,0.02)] group hover:bg-black/[0.01] dark:hover:bg-white/[0.01] active:scale-[0.99] transition-all">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${rule.isRegex ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 shadow-sm' : 'bg-blue-500/10 text-blue-600 dark:text-blue-400 shadow-sm'}`}>
                    <span className="material-symbols-outlined text-2xl">
                      {rule.isRegex ? 'data_object' : 'match_case'}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                       <p className="font-black text-sm text-on-surface dark:text-white truncate">{rule.pattern}</p>
                       <span className="px-2 py-0.5 rounded-lg bg-black/[0.03] dark:bg-white/[0.05] text-[9px] font-black uppercase text-slate-400 leading-none">P{rule.priority}</span>
                    </div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none">
                      → {t(rule.category)}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    <button aria-label={t('action.edit') || 'Edit'} onClick={(e) => { e.stopPropagation(); openEdit(rule); }} className="w-10 h-10 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/[0.03] dark:border-white/[0.03] flex items-center justify-center text-slate-400 hover:text-blue-500 active:scale-90 transition-all">
                      <span className="material-symbols-outlined text-sm" aria-hidden="true">edit</span>
                    </button>
                    <button aria-label={t('action.delete') || 'Delete'} onClick={(e) => { e.stopPropagation(); openDelete(rule); }} className="w-10 h-10 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/[0.03] dark:border-white/[0.03] flex items-center justify-center text-slate-400 hover:text-red-500 active:scale-90 transition-all">
                      <span className="material-symbols-outlined text-sm" aria-hidden="true">delete</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-[20000] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white/90 dark:bg-[#1c1f23]/90 backdrop-blur-xl w-full max-w-sm rounded-[2.5rem] p-8 border border-white/20 dark:border-white/[0.05] shadow-2xl animate-modalScale max-h-[90vh] overflow-y-auto card-stable">
            <h3 className="text-xl font-black text-[#002b59] dark:text-blue-100 mb-6 flex items-center gap-3">
               <span className="material-symbols-outlined text-2xl text-blue-500">rule_settings</span>
               {editingRule ? t('action.edit') : t('settings.addRule')}
            </h3>
            
            <div className="space-y-6">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 px-1">{t('settings.rulePattern')}</label>
                <input 
                  ref={inputRef}
                  type="text"
                  value={pattern}
                  onChange={(e) => setPattern(e.target.value)}
                  placeholder={t('settings.rulePh')}
                  className="w-full bg-black/[0.02] dark:bg-white/[0.02] border border-black/[0.03] dark:border-white/[0.03] rounded-2xl p-4 text-sm font-bold outline-none focus:ring-2 ring-blue-500/20 dark:text-white"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2 px-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('settings.ruleType')}</label>
                  <button aria-label={t('action.info') || 'More information'} onClick={() => setShowExplanation(showExplanation === 'type' ? null : 'type')} className="text-blue-500">
                    <span className="material-symbols-outlined text-sm" aria-hidden="true">info</span>
                  </button>
                </div>
                {showExplanation === 'type' && (
                  <div className="p-3 bg-blue-500/10 rounded-xl text-[9px] font-bold text-blue-700 dark:text-blue-300 mb-3 animate-fadeIn">
                    {t('settings.matchTypeInfo')}
                  </div>
                )}
                <div className="flex p-1 bg-black/[0.02] dark:bg-white/[0.02] border border-black/[0.03] dark:border-white/[0.03] rounded-2xl">
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
                {isRegex && (
                  <div className="mt-2 p-3 bg-amber-500/10 rounded-xl text-[9px] font-bold text-amber-700 dark:text-amber-300 flex items-start gap-2 animate-fadeIn">
                    <span className="material-symbols-outlined text-xs mt-0.5">warning</span>
                    {t('settings.regexInfo')}
                  </div>
                )}
              </div>

              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2 px-1">{t('settings.ruleCategory')}</label>
                <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto p-1 scrollbar-hide bg-black/[0.02] dark:bg-white/[0.02] border border-black/[0.03] dark:border-white/[0.03] rounded-2xl">
                  {categories.map(c => {
                    const icon = c.icon || 'category';
                    const isEmoji = /\p{Extended_Pictographic}/u.test(icon);
                    return (
                      <button 
                        key={c.id}
                        type="button"
                        onClick={() => setCategory(c.name)}
                        className={`flex flex-col items-center gap-1.5 p-2 rounded-2xl transition-all ${category === c.name ? 'bg-blue-500/15 ring-2 ring-blue-500/50 scale-95 opacity-100 font-black' : 'hover:bg-white dark:hover:bg-slate-800 opacity-60'}`}
                      >
                         <span className={isEmoji ? "text-xl" : "material-symbols-outlined text-xl"}>{icon}</span>
                         <span className="text-[8px] font-black truncate w-full text-center dark:text-blue-100">{t(c.name)}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2 px-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('settings.rulePriority')}</label>
                  <button aria-label={t('action.info') || 'More information'} onClick={() => setShowExplanation(showExplanation === 'priority' ? null : 'priority')} className="text-blue-500">
                    <span className="material-symbols-outlined text-sm" aria-hidden="true">info</span>
                  </button>
                </div>
                {showExplanation === 'priority' && (
                  <div className="p-3 bg-blue-500/10 rounded-xl text-[9px] font-bold text-blue-700 dark:text-blue-300 mb-3 animate-fadeIn">
                    {t('settings.priorityInfo')}
                  </div>
                )}
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
              <button 
                onClick={closeModal}
                className="flex-1 py-4 rounded-2xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/[0.03] dark:border-white/[0.03] text-slate-500 dark:text-slate-400 font-black text-xs active:scale-95 transition-all"
              >
                {t('action.cancel')}
              </button>
              <button 
                onClick={handleSave}
                className="flex-[2] py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-black text-xs shadow-lg shadow-blue-600/20 active:scale-95 transition-all"
              >
                {t('action.save')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && ruleToDelete && (
        <div className="fixed inset-0 z-[30000] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white/90 dark:bg-[#1c1f23]/90 backdrop-blur-xl w-full max-w-sm rounded-[2.5rem] p-8 border border-white/20 dark:border-white/[0.05] shadow-2xl animate-modalScale text-center">
            <div className="w-20 h-20 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center mx-auto mb-6">
              <span className="material-symbols-outlined text-4xl">delete_forever</span>
            </div>
            <h3 className="text-xl font-black text-[#002b59] dark:text-blue-100 mb-2">
              {t('common.confirmDelete')}
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-bold mb-8 px-4">
              {t('settings.deleteRuleMsg')} <br/>
              <span className="text-blue-500">"{ruleToDelete.pattern}"</span>
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => { setShowDeleteModal(false); setRuleToDelete(null); }}
                className="flex-1 py-4 rounded-2xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/[0.03] dark:border-white/[0.03] text-slate-500 dark:text-slate-400 font-black text-xs active:scale-95 transition-all"
              >
                {t('action.cancel')}
              </button>
              <button 
                onClick={async () => {
                  await deleteRule(ruleToDelete.id);
                  toast(t('settings.ruleDeleted'), 'success');
                  setShowDeleteModal(false);
                  setRuleToDelete(null);
                }}
                className="flex-1 py-4 rounded-2xl bg-red-50 text-white font-black text-xs shadow-lg shadow-red-500/20 active:scale-95 transition-all"
              >
                {t('action.delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
