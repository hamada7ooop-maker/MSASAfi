import React from 'react';
import { useAppStore } from '../../../store/appStore';
import { useShallow } from 'zustand/react/shallow';
import { useI18n } from '../../../i18n/index';
import { TransactionRepository } from '../../../core/db/repositories/transactions';
import { useSettingsStore } from '../../../store/settingsStore';
import { toast } from '../../../toast';
import { bridge } from '../../../core/AppBridge';

interface BulkActionsBarProps {
  onActionComplete: () => void;
}

export function BulkActionsBar({ onActionComplete }: BulkActionsBarProps) {
  const { t } = useI18n();
  const { selectedItems, clearSelection } = useAppStore(
    useShallow((s) => ({
      selectedItems: s.selectedItems,
      clearSelection: s.clearSelection
    }))
  );

  const count = selectedItems.length;

  const handleDelete = () => {
    bridge.confirmSheet(t('txn.deleteMany', { n: String(count) }), async () => {
      const { lockedYears = [] } = useSettingsStore.getState();
      
      // Fetch all selected transactions in parallel for lightning-fast lock checking
      const txns = await Promise.all(selectedItems.map(id => TransactionRepository.getById(id)));
      const toDeleteIds: string[] = [];
      let skippedAny = false;

      for (const tx of txns) {
        if (tx) {
          const txYear = new Date(tx.date || tx.createdAt || Date.now()).getFullYear();
          if (lockedYears.includes(txYear)) {
            skippedAny = true;
            continue;
          }
          toDeleteIds.push(tx.id);
        }
      }

      if (toDeleteIds.length > 0) {
        await TransactionRepository.deleteMany(toDeleteIds);
      }

      clearSelection();
      onActionComplete();
      
      if (skippedAny) {
        toast(t('settings.someYearLockedError') || 'تم تخطي بعض المعاملات لأنها تنتمي لسنوات مالية مغلقة!', 'warning');
      } else {
        toast(t('txn.deletedMany') || 'Deleted successfully');
      }
    },
    t('action.delete') || 'حذف',
    t('action.cancel') || 'إلغاء'
  );
  };

  return (
    <div className="fixed bottom-24 left-4 right-4 z-[60] animate-in slide-in-from-bottom-10 duration-500">
      <div className="bg-slate-900/90 dark:bg-slate-800/90 backdrop-blur-xl text-white p-4 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.3)] flex items-center justify-between border border-white/10 overflow-hidden relative group">
        {/* Shine effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
        
        <div className="flex items-center gap-4 px-2 relative z-10">
          <div className="bg-gradient-to-br from-blue-500 to-blue-700 text-white w-10 h-10 rounded-2xl flex items-center justify-center text-xs font-black shadow-xl shadow-blue-500/20 rotate-3 group-hover:rotate-0 transition-transform">
            {count}
          </div>
          <div className="space-y-0.5">
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-blue-300">
              {t('txn.bulkSelected')}
            </p>
            <p className="text-xs font-black tracking-tight">
              {t('action.manageItems')}
            </p>
          </div>
        </div>

        <div className="flex gap-2 relative z-10">
          <button 
            onClick={clearSelection}
            className="px-5 py-2.5 rounded-[1.25rem] bg-white/5 hover:bg-white/10 text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 border border-white/5"
          >
            {t('action.cancel')}
          </button>
          
          <button aria-label={t('action.delete') || 'Delete'} 
            onClick={handleDelete}
            className="px-5 py-2.5 rounded-[1.25rem] bg-rose-500 hover:bg-rose-600 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all active:scale-95 shadow-xl shadow-rose-500/20 border border-rose-400/20"
          >
            <span className="material-symbols-outlined text-sm" aria-hidden="true">delete</span>
            {t('action.delete')}
          </button>
        </div>
      </div>
    </div>
  );
}
