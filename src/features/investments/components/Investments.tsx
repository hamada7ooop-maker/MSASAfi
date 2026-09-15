import React, { useState } from 'react';
import { useInvestments } from '../hooks/useInvestments';
import { ErrorState } from '../../../components/common/ErrorState';
import { useI18n } from '../../../i18n/index';
import { useFormat } from '../../../core/hooks/useFormat';
import { useAppStore } from '../../../store/appStore';
import { useShallow } from 'zustand/react/shallow';
import type { Investment } from '../../../types';
import { checkMilestone } from '../../../core/loyalty';
import { PortfolioBreakdown } from './PortfolioBreakdown';
import { InvestmentModal } from './InvestmentModal';
import { InvestmentCard } from './InvestmentCard';
import { bridge } from '../../../core/AppBridge';

/**
 * صفحة الاستثمارات — the orchestrator.
 *
 * Directive 19 — deferred decomposition: this file was 505 lines carrying
 * the modal (232 lines) and the card inline. Both now live in their own
 * modules pinned by tests/unit/investmentsPage.test.tsx, which was written
 * green on the monolith before the split. What remains here is the
 * portfolio state: selection mode, bulk delete, save routing and the
 * summary header.
 */
export function Investments() {
  const { t } = useI18n();
  const { fmt } = useFormat();
  const { investments, totalCost, totalValue, totalProfit, totalProfitPercent, isLoading, error, retry, addInvestment, updateInvestment, deleteInvestment, deleteInvestments } = useInvestments();

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Investment | undefined>();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);

  const { pendingAction, setPendingAction } = useAppStore(
    useShallow((s) => ({
      pendingAction: s.pendingAction,
      setPendingAction: s.setPendingAction
    }))
  );

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const openEdit = (inv: Investment) => {
    if (isSelectionMode) { toggleSelection(inv.id); return; }
    setEditing(inv);
    setShowModal(true);
  };

  const openAdd  = () => { setEditing(undefined); setShowModal(true); };

  React.useEffect(() => {
    if (pendingAction === 'ADD_INVESTMENT') {
      openAdd();
      setPendingAction(null);
    }
  }, [pendingAction, setPendingAction]);

  if (isLoading) return (
    <div className="flex items-center justify-center p-20 animate-pulse text-slate-400 font-black uppercase tracking-widest">
      {t('misc.loading') || 'Loading Intelligence...'}
    </div>
  );

  // Directive 16: a failed load is not an empty portfolio — say so, and offer a way back.
  if (error) return <ErrorState onRetry={retry} />;

  const handleSave = async (data: Partial<Investment>) => {
    if (editing?.id) await updateInvestment(editing.id, data);
    else {
      await addInvestment(data);
      checkMilestone('FIRST_INVESTMENT');
    }
  };

  const handleBulkDelete = () => {
    bridge.confirmSheet(
      t('investment.deleteManyConfirm', { n: String(selectedIds.length) }),
      async () => {
        await deleteInvestments(selectedIds);
        setSelectedIds([]);
        setIsSelectionMode(false);
      },
      t('action.delete') || 'حذف',
      t('action.cancel') || 'إلغاء'
    );
  };

  return (
    <div className="p-5 space-y-6 pb-40 animate-in fade-in duration-700 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between px-1">
        <div>
          <h2 className="text-3xl font-black text-[#002b59] dark:text-blue-50 tracking-tighter">
            {t('page.investments')}
          </h2>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">
            {investments.length} {t('investment.assets')}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {investments.length > 0 && (
            <button
              aria-label={t('action.close') || 'Close'}
              onClick={() => { setIsSelectionMode(!isSelectionMode); setSelectedIds([]); }}
              className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all ${isSelectionMode ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}
            >
              <span className="material-symbols-outlined" aria-hidden="true">{isSelectionMode ? 'close' : 'checklist'}</span>
            </button>
          )}
          <button aria-label={t('action.add') || 'Add'} onClick={openAdd}
            className="w-12 h-12 rounded-[1.25rem] bg-[#002b59] text-white flex items-center justify-center shadow-xl shadow-blue-900/20 active:scale-90 transition-transform">
            <span className="material-symbols-outlined text-2xl" aria-hidden="true">add</span>
          </button>
        </div>
      </div>

      {/* Portfolio Summary Card */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#002b59] via-[#003d7e] to-[#1a4175] rounded-[2.5rem] p-8 text-white shadow-2xl shadow-blue-900/30 group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-20 -mt-20 blur-3xl transition-transform duration-1000 group-hover:scale-110" />

        <div className="relative z-10">
          <p className="text-blue-200/80 text-[10px] font-black uppercase tracking-[0.3em] mb-3">
            {t('investment.totalValue')}
          </p>
          <p className="text-5xl font-black tracking-tighter tabular-nums drop-shadow-sm">{fmt(totalValue)}</p>

          <div className="grid grid-cols-2 gap-4 mt-8 pt-6 border-t border-white/10">
            <div>
              <p className="text-blue-200/60 text-[9px] font-black uppercase tracking-widest mb-1">{t('investment.totalCost')}</p>
              <p className="text-lg font-black tracking-tight">{fmt(totalCost)}</p>
            </div>
            <div className="text-right">
              <p className="text-blue-200/60 text-[9px] font-black uppercase tracking-widest mb-1">{t('investment.profit')}</p>
              <div className={`flex items-center justify-end gap-1.5 font-black ${totalProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                <span className="material-symbols-outlined text-lg">{totalProfit >= 0 ? 'trending_up' : 'trending_down'}</span>
                <span className="text-lg">{totalProfit >= 0 ? '+' : ''}{fmt(totalProfit)}</span>
              </div>
              <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${totalProfit >= 0 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'}`}>
                {totalProfitPercent.toFixed(2)}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Portfolio Breakdown Chart */}
      <PortfolioBreakdown investments={investments} />

      {/* Assets List */}
      {investments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4 text-slate-300">
          <div className="w-24 h-24 rounded-full bg-slate-50 dark:bg-slate-800/50 flex items-center justify-center border-4 border-dashed border-slate-100 dark:border-slate-800">
            <span className="material-symbols-outlined text-5xl">monitoring</span>
          </div>
          <div className="text-center">
            <p className="text-sm font-black text-slate-400 uppercase tracking-widest">{t('investment.empty')}</p>
            <button onClick={openAdd} className="mt-2 px-6 py-2 rounded-xl bg-blue-50 dark:bg-blue-900/20 text-blue-500 text-xs font-black uppercase tracking-widest hover:bg-blue-100 transition-colors">
              {t('investment.addFirst')}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {investments.map(inv => (
            <InvestmentCard
              key={inv.id}
              inv={inv}
              isSelectionMode={isSelectionMode}
              isSelected={selectedIds.includes(inv.id)}
              onOpen={openEdit}
              onDelete={deleteInvestment}
            />
          ))}
        </div>
      )}

      {/* Bulk Action Bar */}
      {isSelectionMode && selectedIds.length > 0 && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 w-[90%] max-w-lg bg-[#1e2124] dark:bg-white text-white dark:text-[#1e2124] p-4 rounded-[2rem] shadow-2xl flex items-center justify-between animate-in slide-in-from-bottom-5 duration-300 z-40">
          <div className="flex items-center gap-3 ml-2">
            <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center font-black text-xs">
              {selectedIds.length}
            </div>
            <p className="text-xs font-black uppercase tracking-widest">{t('investment.bulkSelected')}</p>
          </div>
          <div className="flex items-center gap-2">
             <button onClick={() => setSelectedIds([])} className="px-4 py-2 text-xs font-bold uppercase hover:opacity-70 transition-opacity">{t('action.cancel')}</button>
             <button aria-label={t('action.delete') || 'Delete'}
               onClick={handleBulkDelete}
               className="bg-rose-500 text-white px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 hover:bg-rose-600 transition-colors shadow-lg shadow-rose-500/20"
             >
               <span className="material-symbols-outlined text-sm" aria-hidden="true">delete</span>
               {t('action.delete')}
             </button>
          </div>
        </div>
      )}

      {showModal && (
        <InvestmentModal
          investment={editing}
          onSave={handleSave}
          onDelete={deleteInvestment}
          onClose={() => { setShowModal(false); setEditing(undefined); }}
        />
      )}
    </div>
  );
}
