import React, { useState, useCallback } from 'react';
import { useDebts } from '../hooks/useDebts';
import { useInstallments } from '../hooks/useInstallments';
import { useAppStore } from '../../../store/appStore';
import { useShallow } from 'zustand/react/shallow';
import { useI18n } from '../../../i18n/index';
import { DebtSummary } from './DebtSummary';
import { DebtItem } from './DebtItem';
import { DebtModal } from './DebtModal';
import { PayDebtAccountModal } from './PayDebtAccountModal';
import { confirmSheet, toast } from '../../../toast';
import type { Debt, Installment } from '../../../types';
import { checkMilestone } from '../../../core/loyalty';
import { DebtPayoffPlanner } from './DebtPayoffPlanner';
import { AmortizationModal } from './AmortizationModal';
import { InstallmentsCard } from './InstallmentsCard';
import { InstallmentModal } from './InstallmentModal';

export function Debts() {
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
    debts,
    owedDebts,
    lentDebts,
    accounts,
    isLoading: isDebtsLoading,
    isPaying,
    addDebt,
    updateDebt,
    deleteDebt,
    payDebt,
    bulkDeleteDebts
  } = useDebts();

  const {
    installments,
    addInstallment,
    updateInstallment,
    deleteInstallment,
    payInstallment
  } = useInstallments();

  const [activeTab, setActiveTab] = useState<'debts' | 'installments'>('debts');

  const isSelecting = selectedItems.length > 0;

  // --- Debt Modal States ---
  const [isDebtModalOpen, setIsDebtModalOpen] = useState(false);
  const [debtToEdit, setDebtToEdit] = useState<Debt | null>(null);

  // --- Installment Modal States ---
  const [isInstallmentModalOpen, setIsInstallmentModalOpen] = useState(false);
  const [installmentToEdit, setInstallmentToEdit] = useState<Installment | null>(null);

  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [pendingPayment, setPendingPayment] = useState<{ debtId: string, amount: number } | null>(null);
  const [amortizationDebt, setAmortizationDebt] = useState<Debt | null>(null);

  // --- Handlers ---

  const handleAddNew = useCallback(() => {
    if (activeTab === 'debts') {
      setDebtToEdit(null);
      setIsDebtModalOpen(true);
    } else {
      setInstallmentToEdit(null);
      setIsInstallmentModalOpen(true);
    }
  }, [activeTab]);

  React.useEffect(() => {
    if (pendingAction === 'ADD_DEBT') {
      handleAddNew();
      setPendingAction(null);
    }
  }, [pendingAction, setPendingAction, handleAddNew]);

  const handleEditDebt = (d: Debt) => {
    setDebtToEdit(d);
    setIsDebtModalOpen(true);
  };

  const handleDeleteDebt = (id: string) => {
    confirmSheet(
      t('debt.deleteConfirm') || 'Delete this debt?',
      async () => {
        await deleteDebt(id);
        toast(t('txn.deleted') || 'Deleted', 'error');
      },
      t('action.delete') || 'حذف',
      t('action.cancel') || 'إلغاء'
    );
  };

  const handleBulkDelete = () => {
    confirmSheet(
      t('debt.bulkDeleteConfirm', { n: String(selectedItems.length) }),
      async () => {
        await bulkDeleteDebts();
        toast(t('txn.deletedMany'), 'error');
      },
      t('action.delete') || 'حذف',
      t('action.cancel') || 'إلغاء'
    );
  };

  const handleSaveDebt = async (data: Partial<Debt>) => {
    if (debtToEdit) {
      await updateDebt(debtToEdit.id, data);
      toast(t('txn.updated') || 'Updated');
    } else {
      await addDebt(data);
      toast(t('debt.recorded') || 'Recorded');
      checkMilestone('FIRST_DEBT');
    }
  };

  const handleRequestAccountForPayment = (debtId: string, amount: number) => {
    if (accounts.length === 0) {
      toast(t('bill.addAccountFirst') || 'Please add a bank account first', 'error');
      return;
    }
    setPendingPayment({ debtId, amount });
    setIsPayModalOpen(true);
  };

  const handleConfirmPayAccount = async (accountId: string) => {
    if (!pendingPayment || isPaying) return;
    try {
      await payDebt(pendingPayment.debtId, pendingPayment.amount, accountId);
      toast(t('debt.paymentRecorded'), 'success');
    } finally {
      setPendingPayment(null);
    }
  };

  // --- Installment Handlers ---

  const handleEditInstallment = (inst: Installment) => {
    setInstallmentToEdit(inst);
    setIsInstallmentModalOpen(true);
  };

  const handleDeleteInstallment = async (id: string) => {
    confirmSheet(
      t('bill.deleteConfirm') || 'Delete this installment?',
      async () => {
        await deleteInstallment(id);
        toast(t('txn.deleted') || 'Deleted', 'error');
      },
      t('action.delete') || 'حذف',
      t('action.cancel') || 'إلغاء'
    );
  };

  const handleSaveInstallment = async (data: Omit<Installment, 'id'>) => {
    if (installmentToEdit) {
      await updateInstallment(installmentToEdit.id, data);
      toast(t('txn.updated') || 'Updated');
    } else {
      await addInstallment(data);
      toast(t('debt.recorded') || 'Recorded');
    }
  };

  const handlePayInstallment = async (id: string, accountId?: string) => {
    await payInstallment(id, accountId);
    toast(t('debt.paymentRecorded') || 'Installment Payment Recorded', 'success');
  };

  return (
    <div className="w-full max-w-full min-w-0 p-3.5 sm:p-5 space-y-6 pb-32 animate-in fade-in duration-700 overflow-x-hidden">
      
      {/* Header */}
      <div className="flex justify-between items-center px-1 gap-2 min-w-0">
        <div className="space-y-1 min-w-0 flex-1">
          <h2 className="text-2xl sm:text-3xl text-premium-header text-[var(--color-primary)] dark:text-blue-100 truncate leading-tight">
            {t('debt.title')}
          </h2>
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse shrink-0"></div>
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest opacity-70 truncate">
              {activeTab === 'debts' 
                ? `${debts.length} ${t('debt.activeEntries') || 'Debt Entries'}`
                : `${installments.filter(i => i.paidPayments < i.totalPayments).length} ${t('debt.tabInstallments') || 'Active Installments'}`
              }
            </p>
          </div>
        </div>

        <div className="flex gap-2 shrink-0">
          {activeTab === 'debts' && isSelecting ? (
            <div className="flex items-center gap-1 sm:gap-2 bg-surface-container-low dark:bg-slate-800 p-1 rounded-2xl border border-black/5 dark:border-white/5">
              <button 
                onClick={() => {
                  debts.forEach(d => {
                    if (!selectedItems.includes(d.id)) toggleSelection(d.id);
                  });
                }}
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center text-blue-600 dark:text-blue-400 hover:bg-white dark:hover:bg-slate-700 transition-all"
                title={t('txn.all')}
              >
                <span className="material-symbols-outlined text-lg sm:text-xl" aria-hidden="true">done_all</span>
              </button>
              <button 
                onClick={handleBulkDelete}
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center text-rose-600 dark:text-rose-400 hover:bg-white dark:hover:bg-slate-700 transition-all"
                title={t('action.delete')}
              >
                <span className="material-symbols-outlined text-lg sm:text-xl" aria-hidden="true">delete</span>
              </button>
              <button 
                onClick={clearSelection}
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center text-slate-400 hover:bg-white dark:hover:bg-slate-700 transition-all"
                title={t('action.cancel')}
              >
                <span className="material-symbols-outlined text-lg sm:text-xl" aria-hidden="true">close</span>
              </button>
            </div>
          ) : (
            <button 
              onClick={handleAddNew}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-[#002b59] text-white flex items-center justify-center shadow-lg shadow-blue-500/30 active:scale-95 transition-all"
              title={t('action.add')}
            >
              <span className="material-symbols-outlined text-xl" aria-hidden="true">add</span>
            </button>
          )}
        </div>
      </div>

      {/* Segmented Control Tab Selector */}
      <div className="w-full max-w-full min-w-0 bg-slate-100 dark:bg-slate-900 p-1.5 rounded-2xl flex gap-1 border border-black/5 dark:border-white/5">
        <button
          onClick={() => {
            setActiveTab('debts');
            clearSelection();
          }}
          className={`flex-1 py-3 sm:py-3.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 sm:gap-2 min-w-0 ${
            activeTab === 'debts'
              ? 'bg-white dark:bg-slate-800 text-slate-800 dark:text-white shadow-md'
              : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
          }`}
        >
          <span className="material-symbols-outlined text-base shrink-0">account_balance</span>
          <span className="truncate">{t('debt.tabDebts') || 'Debts & Loans 🏦'}</span>
        </button>
        <button
          onClick={() => {
            setActiveTab('installments');
            clearSelection();
          }}
          className={`flex-1 py-3 sm:py-3.5 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 sm:gap-2 min-w-0 ${
            activeTab === 'installments'
              ? 'bg-white dark:bg-slate-800 text-slate-800 dark:text-white shadow-md'
              : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
          }`}
        >
          <span className="material-symbols-outlined text-base shrink-0">schedule</span>
          <span className="truncate">{t('debt.tabInstallments') || 'Installments ⏱️'}</span>
        </button>
      </div>

      {activeTab === 'debts' ? (
        <>
          {isSelecting && (
            <div className="mx-1 px-4 py-2 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-between animate-in slide-in-from-top-2 duration-300">
              <p className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest">
                {selectedItems.length} {t('debt.bulkSelected')}
              </p>
            </div>
          )}

          {/* Summary Cards */}
          <DebtSummary owedDebts={owedDebts} lentDebts={lentDebts} />

          {/* Debt List */}
          <div className="space-y-4">
            {debts.map(d => (
              <DebtItem 
                key={d.id}
                debt={d}
                accounts={accounts}
                isSelecting={isSelecting}
                isSelected={selectedItems.includes(d.id)}
                onToggleSelect={toggleSelection}
                onEdit={handleEditDebt}
                onDelete={handleDeleteDebt}
                onPayDebt={payDebt}
                onRequestAccount={handleRequestAccountForPayment}
                onShowAmortization={(d) => setAmortizationDebt(d)}
              />
            ))}

            {!isDebtsLoading && debts.length === 0 && (
              <div className="py-16 text-center">
                <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="material-symbols-outlined text-4xl text-slate-400">account_balance</span>
                </div>
                <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300 mb-2">{t('debt.noDebts')}</h3>
                <p className="text-sm text-slate-500 max-w-xs mx-auto">{t('debt.noDebtsSub')}</p>
              </div>
            )}
          </div>

          <DebtPayoffPlanner owedDebts={owedDebts} />
        </>
      ) : (
        /* Installments Section */
        <InstallmentsCard 
          installments={installments}
          accounts={accounts}
          onPay={handlePayInstallment}
          onEdit={handleEditInstallment}
          onDelete={handleDeleteInstallment}
        />
      )}

      {/* Modals */}
      <DebtModal 
        isOpen={isDebtModalOpen}
        onClose={() => setIsDebtModalOpen(false)}
        debtToEdit={debtToEdit}
        accounts={accounts}
        onSave={handleSaveDebt}
      />

      <InstallmentModal
        isOpen={isInstallmentModalOpen}
        onClose={() => setIsInstallmentModalOpen(false)}
        installmentToEdit={installmentToEdit}
        accounts={accounts}
        onSave={handleSaveInstallment}
      />

      <PayDebtAccountModal 
        isOpen={isPayModalOpen}
        onClose={() => setIsPayModalOpen(false)}
        accounts={accounts}
        onConfirm={handleConfirmPayAccount}
      />

      <AmortizationModal 
        isOpen={!!amortizationDebt}
        onClose={() => setAmortizationDebt(null)}
        debt={amortizationDebt}
      />

    </div>
  );
}

