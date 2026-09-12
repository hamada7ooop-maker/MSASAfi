import React, { useState } from 'react';
import { useBudgets } from '../hooks/useBudgets';
import { useI18n } from '../../../i18n/index';
import { useAppStore } from '../../../store/appStore';
import { useShallow } from 'zustand/react/shallow';
import { BudgetSummaryCard } from './BudgetSummaryCard';
import { BudgetItem } from './BudgetItem';
import { BudgetModal } from './BudgetModal';
import { db as DB } from '@/core/db/core';
import { toast, confirmSheet } from '../../../toast';
import type { Budget } from '../../../types';
import { checkMilestone } from '../../../core/loyalty';
import { useSettingsStore, type DigitalEnvelope } from '../../../store/settingsStore';
import { parseNum, sanitizeNumericInput } from '../../../core/utils';

export function Budgets() {
  const { t } = useI18n();
  
  // Wave 4: Digital Envelopes states
  const { envelopes = [], addEnvelope, deleteEnvelope } = useSettingsStore(
    useShallow((s) => ({
      envelopes: s.envelopes,
      addEnvelope: s.addEnvelope,
      deleteEnvelope: s.deleteEnvelope
    }))
  );
  const [showAddEnv, setShowAddEnv] = useState(false);
  const [envName, setEnvName] = useState('');
  const [envLimit, setEnvLimit] = useState('');
  const [envIcon, setEnvIcon] = useState('✉️');
  const [envColor] = useState('indigo');

  const savedLang = localStorage.getItem('masarifi_language') || 'ar';

  const fmt = (val: number) => {
    return val.toLocaleString(savedLang === 'ar' ? 'ar-SA' : 'en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const handleCreateEnvelope = () => {
    if (!envName.trim()) {
      toast(t('budget.envelope.errName'), 'warning');
      return;
    }
    const limitNum = parseNum(envLimit) || 0;
    if (limitNum <= 0) {
      toast(t('budget.envelope.errLimit'), 'warning');
      return;
    }

    addEnvelope(envName, limitNum, envColor, envIcon);
    toast(t('budget.envelope.successCreated'), 'success');
    
    setEnvName('');
    setEnvLimit('');
    setEnvIcon('✉️');
    setShowAddEnv(false);
  };

  const { 
    budgets, 
    categories, 
    totalBudget, 
    totalSpent, 
    isLoading, 
    getSpentForBudget,
    getRolloverForBudget,
    getEffectiveLimit,
    addBudget,
    updateBudget,
    deleteBudget,
    categoryBreakdown,
    refresh
  } = useBudgets();

  const getEnvelopeSpent = (name: string) => {
    const normalized = name.toLowerCase().trim();
    const matchedCats = categories.filter(c => {
      const label = t(c.id).toLowerCase();
      const rawName = c.id.toLowerCase();
      return label.includes(normalized) || normalized.includes(label) || rawName.includes(normalized) || normalized.includes(rawName);
    });

    if (matchedCats.length > 0) {
      return matchedCats.reduce((sum, c) => sum + (categoryBreakdown[c.id] || 0), 0);
    }
    return 0;
  };

  const { pendingAction, setPendingAction } = useAppStore(
    useShallow((s) => ({
      pendingAction: s.pendingAction,
      setPendingAction: s.setPendingAction
    }))
  );

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [budgetToEdit, setBudgetToEdit] = useState<Budget | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleAddNew = () => {
    setBudgetToEdit(null);
    setIsModalOpen(true);
  };

  React.useEffect(() => {
    if (pendingAction === 'ADD_BUDGET') {
      handleAddNew();
      setPendingAction(null);
    }
  }, [pendingAction, setPendingAction]);

  const handleEdit = (b: Budget) => {
    setBudgetToEdit(b);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    confirmSheet(
      t('budget.deleteConfirm'),
      async () => {
        await deleteBudget(id);
        toast(t('txn.deleted') || 'تم الحذف', 'error');
      },
      t('action.delete') || 'حذف',
      t('action.cancel') || 'إلغاء'
    );
  };

  const handleSave = async (data: Partial<Budget>) => {
    if (budgetToEdit) {
      await updateBudget(budgetToEdit.id, data);
      toast(t('txn.updated') || 'تم التحديث');
    } else {
      await addBudget(data);
      toast(t('budget.added'));
      checkMilestone('FIRST_BUDGET');
    }
  };

  const generateSmartBudget = async () => {
    if (isGenerating) return;
    setIsGenerating(true);
    try {
      const now = new Date();
      const stats = await DB.getMonthlyStats(now.getFullYear(), now.getMonth());
      if (!stats.income || stats.income <= 0) {
        toast(t('budget.msgNoIncome'), 'warning');
        return;
      }

      const existing = await DB.getBudgets();
      const rules = [
        { name: t('budget.rules.needs'), pct: 0.5, cats: ['groceries', 'housing', 'transport', 'bills'] },
        { name: t('budget.rules.wants'), pct: 0.3, cats: ['dining', 'shopping', 'entertainment'] },
        { name: t('budget.rules.savings'), pct: 0.2, cats: ['invest', 'other'] }
      ];

      let count = 0;
      for (const r of rules) {
        if (!existing.some(e => e.name === r.name)) {
          await addBudget({
            name: r.name,
            limit: stats.income * r.pct,
            categories: r.cats,
            category: r.cats[0],
            period: 'monthly'
          });
          count++;
        }
      }

      if (count > 0) {
        toast(t('budget.msgSmartGenerated'));
        checkMilestone('FIRST_BUDGET');
        refresh();
      } else {
        toast(t('budget.msgAlreadyExist'));
      }
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="p-5 space-y-6 pb-32 animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex justify-between items-center px-1">
        <div className="space-y-1">
          <h2 className="text-3xl text-premium-header text-[var(--color-primary)] dark:text-blue-100">
            {t('budget.title')}
          </h2>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></div>
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest opacity-70">
              {t('budget.trackingActive') || 'Budget Tracking Active'}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <button 
            onClick={generateSmartBudget}
            disabled={isGenerating}
            className="w-10 h-10 rounded-2xl flex items-center justify-center bg-surface-container-low dark:bg-slate-800 text-blue-600 dark:text-blue-400 transition-all active:scale-95"
            title={t('budget.smartButton')}
          >
            <span className={`material-symbols-outlined text-xl ${isGenerating ? 'animate-spin' : ''}`}>
              {isGenerating ? 'refresh' : 'auto_awesome'}
            </span>
          </button>
          <button 
            onClick={handleAddNew}
            className="w-10 h-10 rounded-2xl flex items-center justify-center bg-blue-600 text-white shadow-lg shadow-blue-500/30 transition-all active:scale-95"
            title={t('action.add')}
          >
            <span className="material-symbols-outlined text-xl">add</span>
          </button>
        </div>
      </div>

      {/* Summary Card */}
      <BudgetSummaryCard totalBudget={totalBudget} totalSpent={totalSpent} />

      {/* Smart Budget Tools & Templates */}
      <div className="fin-card p-6 bg-slate-50/50 dark:bg-slate-800/20 border border-slate-100 dark:border-white/5 space-y-4">
        <div className="flex justify-between items-center">
          <div className="space-y-0.5">
            <h3 className="text-sm font-black text-[#002b59] dark:text-blue-100 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-amber-500 text-sm">rocket_launch</span>
              {t('budget.template.smartToolsTitle')}
            </h3>
            <p className="text-[10px] text-slate-400 font-bold">
              {t('budget.template.smartToolsDesc')}
            </p>
          </div>
        </div>

        {/* Action Buttons Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Section A: Copy & Save */}
          <div className="p-4 bg-white dark:bg-slate-800/50 rounded-2xl border border-black/5 dark:border-white/5 space-y-3">
            <h4 className="text-xs font-black text-slate-700 dark:text-slate-200 flex items-center gap-1">
              <span className="material-symbols-outlined text-blue-500 text-base">difference</span>
              {t('budget.template.customTitle')}
            </h4>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={async () => {
                  if (budgets.length === 0) {
                    toast(t('budget.template.noBudgetsToSave'), 'warning');
                    return;
                  }
                  localStorage.setItem('masarifi_custom_budget_template', JSON.stringify(budgets));
                  toast(t('budget.template.successSaved'));
                  refresh();
                }}
                className="py-2.5 px-3 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[10px] font-black hover:bg-blue-500/20 transition-all flex items-center justify-center gap-1"
              >
                <span className="material-symbols-outlined text-sm">save</span>
                {t('budget.template.saveCustom')}
              </button>

              <button
                onClick={async () => {
                  const raw = localStorage.getItem('masarifi_custom_budget_template');
                  if (!raw) {
                    toast(t('budget.template.noSavedTemplate'), 'warning');
                    return;
                  }
                  const saved = JSON.parse(raw);
                  confirmSheet(
                    t('budget.applyCustomConfirm'),
                    async () => {
                      // Delete current budgets
                      for (const b of budgets) {
                        await DB.deleteBudget(b.id);
                      }
                      // Add saved budgets
                      for (const tb of saved) {
                        await DB.addBudget({
                          name: tb.name,
                          limit: tb.limit,
                          categories: tb.categories || [tb.category],
                          category: tb.category,
                          period: tb.period || 'monthly',
                          rollover: tb.rollover || false
                        });
                      }
                      toast(t('budget.template.successApplied'));
                      refresh();
                    },
                    t('action.apply') || 'تطبيق',
                    t('action.cancel') || 'إلغاء'
                  );
                }}
                disabled={!localStorage.getItem('masarifi_custom_budget_template')}
                className="py-2.5 px-3 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-black hover:bg-emerald-500/20 disabled:opacity-40 transition-all flex items-center justify-center gap-1"
              >
                <span className="material-symbols-outlined text-sm">restore</span>
                {t('budget.template.restoreCustom')}
              </button>
            </div>
          </div>

          {/* Section B: Global Templates */}
          <div className="p-4 bg-white dark:bg-slate-800/50 rounded-2xl border border-black/5 dark:border-white/5 space-y-3">
            <h4 className="text-xs font-black text-slate-700 dark:text-slate-200 flex items-center gap-1">
              <span className="material-symbols-outlined text-purple-500 text-base">auto_stories</span>
              {t('budget.template.readyTitle')}
            </h4>
            <div className="grid grid-cols-3 gap-2">
              {[
                {
                  label: t('budget.template.golden'),
                  desc: t('budget.template.goldenDesc'),
                  rules: [
                    { name: t('budget.rules.needsPct', { pct: '50' }), pct: 0.5, cats: ['groceries', 'housing', 'transport', 'bills', 'health'] },
                    { name: t('budget.rules.wantsPct', { pct: '30' }), pct: 0.3, cats: ['dining', 'shopping', 'entertainment', 'subscriptions', 'beauty'] },
                    { name: t('budget.rules.savingsPct', { pct: '20' }), pct: 0.2, cats: ['invest', 'other'] }
                  ]
                },
                {
                  label: t('budget.template.emergency'),
                  desc: t('budget.template.emergencyDesc'),
                  rules: [
                    { name: t('budget.rules.needsPct', { pct: '70' }), pct: 0.7, cats: ['groceries', 'housing', 'transport', 'bills', 'health'] },
                    { name: t('budget.rules.wantsPct', { pct: '10' }), pct: 0.1, cats: ['dining', 'shopping', 'entertainment'] },
                    { name: t('budget.rules.savingsPct', { pct: '20' }), pct: 0.2, cats: ['invest', 'other'] }
                  ]
                },
                {
                  label: t('budget.template.investment'),
                  desc: t('budget.template.investmentDesc'),
                  rules: [
                    { name: t('budget.rules.needsPct', { pct: '40' }), pct: 0.4, cats: ['groceries', 'housing', 'transport', 'bills', 'health'] },
                    { name: t('budget.rules.wantsPct', { pct: '20' }), pct: 0.2, cats: ['dining', 'shopping', 'entertainment', 'subscriptions'] },
                    { name: t('budget.rules.savingsPct', { pct: '40' }), pct: 0.4, cats: ['invest', 'other'] }
                  ]
                }
              ].map((template, idx) => (
                <button
                  key={idx}
                  onClick={async () => {
                    const now = new Date();
                    const stats = await DB.getMonthlyStats(now.getFullYear(), now.getMonth());
                    const income = (stats.income && stats.income > 0) ? stats.income : 10000;
                    
                    confirmSheet(
                      t('budget.template.applyConfirm', { label: template.label, income: income.toString() }),
                      async () => {
                        // Delete current budgets
                        for (const b of budgets) {
                          await DB.deleteBudget(b.id);
                        }
                        // Add template budgets
                        for (const r of template.rules) {
                          await DB.addBudget({
                            name: r.name,
                            limit: income * r.pct,
                            categories: r.cats,
                            category: r.cats[0],
                            period: 'monthly'
                          });
                        }
                        toast(t('budget.template.successApplied'));
                        refresh();
                      },
                      t('action.apply') || 'تطبيق',
                      t('action.cancel') || 'إلغاء'
                    );
                  }}
                  className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 hover:bg-purple-500/20 transition-all flex flex-col items-center text-center justify-center gap-0.5"
                >
                  <span className="text-[9px] font-black leading-tight block">{template.label}</span>
                  <span className="text-[7px] text-slate-400 font-bold block">{template.desc}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 3D Glassmorphism Digital Envelopes Pocket Section */}
      <div className="relative group overflow-hidden p-6 rounded-[2.5rem] bg-gradient-to-br from-indigo-500/10 to-purple-600/10 dark:from-indigo-950/20 dark:to-purple-950/20 border border-indigo-500/20 dark:border-indigo-500/10 shadow-2xl backdrop-blur-md space-y-6">
        <div className="absolute -right-8 -top-8 w-32 h-32 bg-indigo-500/15 rounded-full blur-2xl group-hover:scale-125 transition-transform duration-700"></div>
        <div className="absolute -left-8 -bottom-8 w-32 h-32 bg-purple-500/15 rounded-full blur-2xl group-hover:scale-125 transition-transform duration-700"></div>

        <div className="flex justify-between items-center relative z-10">
          <div className="space-y-0.5">
            <h3 className="text-sm font-black text-[#002b59] dark:text-blue-100 flex items-center gap-1.5 font-premium">
              <span className="material-symbols-outlined text-indigo-500 text-lg animate-bounce">mail</span>
              {t('budget.envelope.title')}
            </h3>
            <p className="text-[10px] text-slate-400 font-bold">
              {t('budget.envelope.desc')}
            </p>
          </div>
          
          <button 
            onClick={() => setShowAddEnv(!showAddEnv)}
            className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest shadow-md shadow-indigo-600/20 active:scale-95 transition-all"
          >
            {showAddEnv ? t('budget.envelope.btnClose') : t('budget.envelope.btnNew')}
          </button>
        </div>

        {/* Envelope list */}
        {envelopes.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 relative z-10">
            {envelopes.map((env: DigitalEnvelope) => {
              const spent = getEnvelopeSpent(env.name) || env.spent || 0;
              const limit = env.limit || 1;
              const ratio = Math.min((spent / limit) * 100, 100);
              const isOver = spent > limit;

              return (
                <div key={env.id} className="p-4 rounded-3xl bg-white/60 dark:bg-slate-900/40 border border-white/20 dark:border-white/5 shadow-md flex flex-col justify-between space-y-4 hover:scale-[1.02] hover:shadow-lg transition-all duration-300 relative overflow-hidden group/env">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 rounded-full blur-xl group-hover/env:scale-125 transition-transform"></div>
                  
                  <div className="flex justify-between items-start relative z-10">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-slate-800 text-2xl flex items-center justify-center shadow-inner">
                        {env.icon || '✉️'}
                      </div>
                      <div>
                        <h4 className="font-black text-xs text-slate-800 dark:text-slate-100">{env.name}</h4>
                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                          {isOver ? t('budget.envelope.overLimit') : t('budget.envelope.healthySpend')}
                        </p>
                      </div>
                    </div>

                    <button 
                      onClick={() => {
                        confirmSheet(
                          t('budget.envelope.deleteConfirm'),
                          () => {
                            deleteEnvelope(env.id);
                            toast(t('budget.envelope.deleted'), 'error');
                          },
                          t('action.delete') || 'حذف',
                          t('action.cancel') || 'إلغاء'
                        );
                      }}
                      className="w-8 h-8 rounded-full bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 flex items-center justify-center transition-all opacity-0 group-hover/env:opacity-100 active:scale-90"
                    >
                      <span className="material-symbols-outlined text-sm">delete</span>
                    </button>
                  </div>

                  {/* Progress and Numbers */}
                  <div className="space-y-2 relative z-10">
                    <div className="flex justify-between items-baseline text-[10px] font-black">
                      <span className={isOver ? 'text-rose-500 animate-pulse' : 'text-indigo-600 dark:text-indigo-400'}>
                        {fmt(spent)} {t('currency.sar')}
                      </span>
                      <span className="text-slate-400">
                        {t('budget.envelope.of')} {fmt(limit)} {t('currency.sar')}
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden p-0.5">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${isOver ? 'bg-gradient-to-r from-rose-500 to-red-600 animate-pulse' : 'bg-gradient-to-r from-indigo-500 to-purple-600'}`}
                        style={{ width: `${ratio}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-8 text-center bg-white/40 dark:bg-slate-900/20 rounded-3xl border border-dashed border-slate-200 dark:border-white/5 relative z-10">
            <span className="material-symbols-outlined text-3xl text-slate-400 mb-2 block">folder_open</span>
            <p className="text-xs font-bold text-slate-500">{t('budget.envelope.noActive')}</p>
          </div>
        )}

        {/* Add Envelope Form Inline Accordion */}
        {showAddEnv && (
          <div className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-white/5 space-y-4 animate-in slide-in-from-top-4 duration-300 relative z-10 shadow-lg">
            <h4 className="text-xs font-black text-slate-700 dark:text-slate-200 flex items-center gap-1">
              <span className="material-symbols-outlined text-indigo-500 text-sm">post_add</span>
              {t('budget.envelope.setupNew')}
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">{t('budget.envelope.name')}</label>
                <input 
                  type="text" 
                  dir="auto"
                  autoComplete="off"
                  value={envName}
                  onChange={e => setEnvName(e.target.value)}
                  onCompositionEnd={e => setEnvName((e.target as HTMLInputElement).value)}
                  onBlur={e => setEnvName(e.target.value)}
                  placeholder={t('budget.envelope.namePlaceholder')}
                  className="w-full bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 text-xs font-bold border-none outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">{t('budget.envelope.limit')}</label>
                <input 
                  type="text" 
                  inputMode="decimal"
                  dir="ltr"
                  autoComplete="off"
                  value={envLimit}
                  onChange={e => setEnvLimit(sanitizeNumericInput(e.target.value))}
                  onCompositionEnd={e => setEnvLimit(sanitizeNumericInput((e.target as HTMLInputElement).value))}
                  onBlur={e => setEnvLimit(sanitizeNumericInput(e.target.value))}
                  placeholder="500"
                  className="w-full bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 text-xs font-bold border-none outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Emoji Selection Grid */}
            <div className="space-y-2">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">{t('budget.envelope.icon')}</label>
              <div className="flex flex-wrap gap-2">
                {['🍔', '🛒', '🚗', '💡', '💊', '🎬', '✈️', '🎁', '🏫', '☕', '👗', '🏠'].map(emoji => (
                  <button 
                    key={emoji}
                    type="button"
                    onClick={() => setEnvIcon(emoji)}
                    className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg active:scale-90 transition-all ${envIcon === emoji ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30' : 'bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'}`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            <button 
              type="button"
              onClick={handleCreateEnvelope}
              className="w-full py-3.5 rounded-xl bg-indigo-600 text-white font-black text-xs shadow-md shadow-indigo-600/20 active:scale-95 transition-all"
            >
              {t('budget.envelope.save')}
            </button>
          </div>
        )}
      </div>

      {/* Budget List */}
      <div className="space-y-4">
        {budgets.map(b => (
          <BudgetItem 
            key={b.id} 
            budget={b} 
            spent={getSpentForBudget(b)} 
            rollover={getRolloverForBudget(b)}
            limit={getEffectiveLimit(b)}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        ))}

        {!isLoading && budgets.length === 0 && (
          <div className="py-16 text-center">
            <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="material-symbols-outlined text-4xl text-slate-400">account_balance_wallet</span>
            </div>
            <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300 mb-2">{t('budget.noBudgets')}</h3>
            <p className="text-sm text-slate-500 max-w-xs mx-auto">{t('budget.noBudgetsSub')}</p>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      <BudgetModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        budgetToEdit={budgetToEdit}
        categories={categories}
        onSave={handleSave}
      />
    </div>
  );
}
