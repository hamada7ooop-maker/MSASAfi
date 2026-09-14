import React, { useState } from 'react';
import { useGoals } from '../hooks/useGoals';
import { ErrorState } from '../../../components/common/ErrorState';
import { useAppStore } from '../../../store/appStore';
import { useShallow } from 'zustand/react/shallow';
import { useI18n } from '../../../i18n/index';
import { AutopilotCard } from './AutopilotCard';
import { GoalItem } from './GoalItem';
import { GoalModal } from './GoalModal';
import { DepositAccountModal } from './DepositAccountModal';
import { confirmSheet, toast } from '../../../toast';
import type { Goal } from '../../../types';
import confetti from 'canvas-confetti';
import { celebrate } from '../../../core/a11y';
import { checkMilestone } from '../../../core/loyalty';
import { InflationCalculator } from './InflationCalculator';
import { isAtLeastMoney } from '../../../core/money';

export function Goals() {
  const { t } = useI18n();
  const { selectedItems, toggleSelection, clearSelection, pendingAction, setPendingAction } = useAppStore(
    useShallow((s) => ({
      selectedItems: s.selectedItems,
      toggleSelection: s.toggleSelection,
      clearSelection: s.clearSelection,
      pendingAction: s.pendingAction,
      setPendingAction: s.setPendingAction
    }))
  );
  const {
    goals,
    activeGoals,
    accounts,
    suggestedAuto,
    isLoading,
    error,
    retry,
    addGoal,
    updateGoal,
    deleteGoal,
    addToGoal,
    runAutopilot,
    bulkDeleteGoals,
    getGoalForecast
  } = useGoals();

  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [goalToEdit, setGoalToEdit] = useState<Goal | null>(null);

  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [pendingDeposit, setPendingDeposit] = useState<{ goalId: string, amount: number } | null>(null);

  const [isInflationModalOpen, setIsInflationModalOpen] = useState(false);

  const handleAddNew = () => {
    setGoalToEdit(null);
    setIsGoalModalOpen(true);
  };

  React.useEffect(() => {
    if (pendingAction === 'ADD_GOAL') {
      handleAddNew();
      setPendingAction(null);
    }
  }, [pendingAction, setPendingAction]);

  const isSelecting = selectedItems.length > 0;

  // --- Handlers ---
  
  const handleEdit = (g: Goal) => {
    setGoalToEdit(g);
    setIsGoalModalOpen(true);
  };

  const handleDelete = (id: string) => {
    confirmSheet(
      t('goal.deleteOne') || 'Delete this goal?',
      async () => {
        await deleteGoal(id);
        toast(t('goal.deleted') || 'Goal deleted', 'error');
      },
      t('action.delete') || 'حذف',
      t('action.cancel') || 'إلغاء'
    );
  };

  const handleBulkDelete = () => {
    confirmSheet(
      t('goal.deleteMany', { n: String(selectedItems.length) }),
      async () => {
        await bulkDeleteGoals();
        toast(t('goal.deletedMany'), 'error');
      },
      t('action.delete') || 'حذف',
      t('action.cancel') || 'إلغاء'
    );
  };

  const handleSaveGoal = async (data: Partial<Goal>) => {
    if (goalToEdit) {
      await updateGoal(goalToEdit.id, data);
      toast(t('goal.updated') || 'Goal updated');
    } else {
      await addGoal(data);
      toast(t('goal.created') || 'Goal created');
      checkMilestone('FIRST_GOAL');
    }
  };

  const handleRequestAccountForDeposit = (goalId: string, amount: number) => {
    if (accounts.length === 0) {
      toast(t('bill.addAccountFirst') || 'Please add a bank account first', 'error');
      return;
    }
    setPendingDeposit({ goalId, amount });
    setIsDepositModalOpen(true);
  };

  const handleConfirmDepositAccount = async (accountId: string) => {
    if (!pendingDeposit) return;
    try {
      const g_orig = goals.find(g => g.id === pendingDeposit.goalId);
      if (!g_orig) return;

      const updatedGoal = await addToGoal(pendingDeposit.goalId, pendingDeposit.amount, accountId);
      
      // Drift-tolerant comparison — see core/money.ts.
      if (
        updatedGoal &&
        isAtLeastMoney(updatedGoal.saved, updatedGoal.target) &&
        !isAtLeastMoney(g_orig.saved || 0, g_orig.target)
      ) {
        celebrate(() => confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } }));
        toast('🎉 ' + t('goal.completed'), 'success');
      } else {
        toast(t('goal.amountAdded'), 'success');
      }
    } finally {
      setPendingDeposit(null);
    }
  };

  // Directive 16: a failed load is not "no goals yet" — say so, and offer a way back.
  if (error) return <ErrorState onRetry={retry} />;

  return (
    <div className="p-5 space-y-6 pb-32 animate-in fade-in duration-700">
      
      {/* Header */}
      <div className="flex justify-between items-center px-1">
        <div className="space-y-1">
          <h2 className="text-3xl text-premium-header text-[var(--color-primary)] dark:text-blue-100">
            {t('goal.title')}
          </h2>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></div>
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest opacity-70">
              {goals.length} {t('goal.trackingActive') || 'Savings Goals Active'}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          {isSelecting ? (
            <div className="flex items-center gap-2 bg-surface-container-low dark:bg-slate-800 p-1 rounded-2xl border border-black/5 dark:border-white/5">
              <button 
                onClick={() => {
                  goals.forEach(g => {
                    if (!selectedItems.includes(g.id)) toggleSelection(g.id);
                  });
                }}
                className="w-9 h-9 rounded-xl flex items-center justify-center text-blue-600 dark:text-blue-400 hover:bg-white dark:hover:bg-slate-700 transition-all"
                title={t('txn.all')}
              >
                <span className="material-symbols-outlined text-xl" aria-hidden="true">done_all</span>
              </button>
              <button 
                onClick={handleBulkDelete}
                className="w-9 h-9 rounded-xl flex items-center justify-center text-rose-600 dark:text-rose-400 hover:bg-white dark:hover:bg-slate-700 transition-all"
                title={t('action.delete')}
              >
                <span className="material-symbols-outlined text-xl" aria-hidden="true">delete</span>
              </button>
              <button 
                onClick={clearSelection}
                className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:bg-white dark:hover:bg-slate-700 transition-all"
                title={t('action.cancel')}
              >
                <span className="material-symbols-outlined text-xl" aria-hidden="true">close</span>
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <button 
                onClick={() => setIsInflationModalOpen(true)}
                className="w-10 h-10 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-200 dark:border-indigo-900/40 active:scale-95 transition-all"
                title={t('goal.inflationCalculator') || 'حاسبة التضخم'}
              >
                <span className="material-symbols-outlined text-xl" aria-hidden="true">analytics</span>
              </button>
              <button 
                onClick={handleAddNew}
                className="w-10 h-10 rounded-2xl bg-[#002b59] text-white flex items-center justify-center shadow-lg shadow-blue-500/30 active:scale-95 transition-all"
                title={t('goal.newGoal')}
              >
                <span className="material-symbols-outlined text-xl" aria-hidden="true">add</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {isSelecting && (
        <div className="mx-1 px-4 py-2 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-between animate-in slide-in-from-top-2 duration-300">
          <p className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest">
            {selectedItems.length} {t('goal.bulkSelected')}
          </p>
        </div>
      )}

      {/* Autopilot Suggestion */}
      {!isSelecting && activeGoals.length > 0 && suggestedAuto > 0 && (
        <AutopilotCard 
          suggestedAuto={suggestedAuto} 
          onRunAutopilot={runAutopilot} 
        />
      )}

      {/* Goal List */}
      <div className="space-y-4">
        {goals.map(g => (
          <GoalItem 
            key={g.id}
            goal={g}
            accounts={accounts}
            isSelecting={isSelecting}
            isSelected={selectedItems.includes(g.id)}
            onToggleSelect={toggleSelection}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onAddDeposit={addToGoal}
            onRequestAccount={handleRequestAccountForDeposit}
            getGoalForecast={getGoalForecast}
          />
        ))}

        {!isLoading && goals.length === 0 && (
          <div className="py-16 text-center">
            <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="material-symbols-outlined text-4xl text-slate-400">flag</span>
            </div>
            <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300 mb-2">{t('goal.noGoals')}</h3>
            <p className="text-sm text-slate-500 max-w-xs mx-auto">{t('goal.noGoalsSub')}</p>
          </div>
        )}
      </div>

      {/* Modals */}
      <GoalModal 
        isOpen={isGoalModalOpen}
        onClose={() => setIsGoalModalOpen(false)}
        goalToEdit={goalToEdit}
        accounts={accounts}
        onSave={handleSaveGoal}
      />

      <DepositAccountModal 
        isOpen={isDepositModalOpen}
        onClose={() => setIsDepositModalOpen(false)}
        accounts={accounts}
        onConfirm={handleConfirmDepositAccount}
      />

      <InflationCalculator 
        isOpen={isInflationModalOpen}
        onClose={() => setIsInflationModalOpen(false)}
      />

    </div>
  );
}
