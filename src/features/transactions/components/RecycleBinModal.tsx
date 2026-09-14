import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useI18n } from '../../../i18n/index';
import { useFormat } from '../../../core/hooks/useFormat';
import { TransactionRepository } from '../../../core/db/repositories/transactions';
import { toast } from '../../../toast';
import type { Transaction } from '../../../types';
import { useSettingsStore } from '../../../store/settingsStore';

interface RecycleBinModalProps {
  onClose: () => void;
  onRefreshList: () => void;
}

export function RecycleBinModal({ onClose, onRefreshList }: RecycleBinModalProps) {
  const { t } = useI18n();
  const { fmt, getCurrencySymbol } = useFormat();
  const [confirmEmpty, setConfirmEmpty] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Live query soft-deleted transactions
  const deletedTransactions = useLiveQuery(
    async () => {
      return await TransactionRepository.getDeleted();
    },
    [],
    [] as Transaction[]
  );

  const handleRestore = async (id: string) => {
    try {
      const tx = await TransactionRepository.getById(id);
      if (tx) {
        const txYear = new Date(tx.date || tx.createdAt || Date.now()).getFullYear();
        const { lockedYears = [] } = useSettingsStore.getState();
        if (lockedYears.includes(txYear)) {
          toast(t('settings.yearLockedError', { year: String(txYear) }) || `السنة المالية ${txYear} مغلقة ومؤرشفة! لا يمكن تعديل أو استعادة المعاملات بها.`, 'error');
          return;
        }
      }
      await TransactionRepository.restore(id);
      toast(t('trash.restored') || 'Transaction restored successfully ✓', 'success');
      onRefreshList();
      
      // Integrate with Loyalty 2.0: FIRST_TRASH_RESTORE milestone
      const { checkMilestone } = await import('../../../core/loyalty');
      await checkMilestone('ECO_GUARDIAN'); // Eco Guardian achievement
    } catch {
      toast(t('common.error') || 'Error restoring transaction', 'error');
    }
  };

  const handleHardDelete = async (id: string) => {
    try {
      await TransactionRepository.hardDelete(id);
      toast(t('trash.hardDeleted') || 'Transaction deleted permanently', 'success');
      setDeletingId(null);
      onRefreshList();
    } catch {
      toast(t('common.error') || 'Error deleting transaction', 'error');
    }
  };

  const handleEmptyTrash = async () => {
    try {
      await TransactionRepository.emptyTrash();
      toast(t('trash.emptied') || 'Recycle bin cleared', 'success');
      setConfirmEmpty(false);
      onRefreshList();
    } catch {
      toast(t('common.error') || 'Error clearing recycle bin', 'error');
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-white/90 dark:bg-[#1a1d21]/90 border border-slate-200/50 dark:border-white/10 w-full max-w-lg rounded-[2.5rem] p-6 shadow-2xl animate-in zoom-in-95 duration-300 max-h-[85vh] flex flex-col backdrop-blur-xl">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center">
              <span className="material-symbols-outlined">delete_sweep</span>
            </div>
            <div>
              <h3 className="text-lg font-black text-[#002b59] dark:text-blue-100">
                {t('trash.title') || 'سلة المحذوفات'}
              </h3>
              <p className="text-[10px] text-slate-400 font-bold">
                {t('trash.subtitle') || 'الاحتفاظ بالمعاملات المحذوفة مؤقتاً للاستعادة'}
              </p>
            </div>
          </div>
          <button aria-label={t('action.close') || 'Close'} 
            onClick={onClose} 
            className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
          >
            <span className="material-symbols-outlined" aria-hidden="true">close</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto py-4 space-y-3 min-h-[30vh]">
          {confirmEmpty ? (
            <div className="fin-card p-6 border-red-500/20 bg-red-50/20 dark:bg-red-900/10 text-center space-y-4 animate-in zoom-in-95 duration-200">
              <span className="material-symbols-outlined text-4xl text-red-500">warning</span>
              <p className="text-sm font-black text-slate-700 dark:text-slate-200">
                {t('trash.emptyConfirm') || 'هل أنت متأكد من رغبتك في إفراغ سلة المحذوفات نهائياً؟'}
              </p>
              <p className="text-xs text-slate-400 font-bold">
                {t('trash.emptyWarning') || 'هذا الإجراء لا يمكن التراجع عنه وسيتم مسح كافة البيانات بشكل دائم.'}
              </p>
              <div className="flex gap-3 justify-center max-w-xs mx-auto">
                <button
                  onClick={() => setConfirmEmpty(false)}
                  className="flex-1 py-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-500 font-black text-xs active:scale-95 transition-all"
                >
                  {t('common.cancel')}
                </button>
                <button
                  onClick={handleEmptyTrash}
                  className="flex-1 py-3 rounded-2xl bg-red-600 text-white font-black text-xs shadow-lg shadow-red-600/20 active:scale-95 transition-all"
                >
                  {t('trash.emptyBtn') || 'إفراغ الآن'}
                </button>
              </div>
            </div>
          ) : deletedTransactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center space-y-3">
              <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800/50 flex items-center justify-center text-slate-300">
                <span className="material-symbols-outlined text-4xl">delete_outline</span>
              </div>
              <p className="text-sm font-black text-slate-400">{t('trash.empty') || 'سلة المحذوفات فارغة'}</p>
              <p className="text-xs text-slate-400/70 font-bold max-w-xs">
                {t('trash.emptyHint') || 'المعاملات التي ستقوم بحذفها ستظهر هنا لمدة 30 يوماً قبل الحذف التلقائي.'}
              </p>
            </div>
          ) : (
            deletedTransactions.map(tx => (
              <div 
                key={tx.id} 
                className="p-4 rounded-3xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-white/5 flex items-center justify-between gap-3 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-all duration-300"
              >
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs font-black ${tx.type === 'income' ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {tx.type === 'income' ? '+' : '-'}{fmt(tx.amount)} {getCurrencySymbol()}
                    </span>
                    <span className="text-[10px] bg-slate-200 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded-full font-black">
                      {t(tx.category) || tx.category}
                    </span>
                  </div>
                  <p className="text-xs font-bold text-[#002b59] dark:text-blue-100 truncate">
                    {tx.description}
                  </p>
                  <p className="text-[9px] text-slate-400 font-bold mt-1">
                    {t('trash.deletedOn') || 'حُذفت في'}: {new Date(tx.deletedAt || '').toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1">
                  {deletingId === tx.id ? (
                    <div className="flex items-center gap-1 animate-in slide-in-from-right-2 duration-200">
                      <button
                        onClick={() => setDeletingId(null)}
                        className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-500 flex items-center justify-center active:scale-95 transition-all"
                        title={t('common.cancel')}
                      >
                        <span className="material-symbols-outlined text-sm" aria-hidden="true">close</span>
                      </button>
                      <button
                        onClick={() => handleHardDelete(tx.id)}
                        className="w-8 h-8 rounded-full bg-red-600 text-white flex items-center justify-center active:scale-95 transition-all"
                        title={t('trash.confirmHardDelete') || 'تأكيد الحذف النهائي'}
                      >
                        <span className="material-symbols-outlined text-sm" aria-hidden="true">check</span>
                      </button>
                    </div>
                  ) : (
                    <>
                      <button
                        onClick={() => handleRestore(tx.id)}
                        className="w-9 h-9 rounded-2xl bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white flex items-center justify-center active:scale-90 transition-all"
                        title={t('trash.restore') || 'استعادة المعاملة'}
                      >
                        <span className="material-symbols-outlined text-lg" aria-hidden="true">restore</span>
                      </button>
                      <button
                        onClick={() => setDeletingId(tx.id)}
                        className="w-9 h-9 rounded-2xl bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white flex items-center justify-center active:scale-90 transition-all"
                        title={t('trash.deletePermanently') || 'حذف نهائي'}
                      >
                        <span className="material-symbols-outlined text-lg" aria-hidden="true">delete_forever</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {deletedTransactions.length > 0 && !confirmEmpty && (
          <div className="pt-4 border-t border-slate-100 dark:border-white/5 flex gap-3">
            <button
              onClick={() => setConfirmEmpty(true)}
              className="flex-1 py-4 rounded-[2rem] bg-rose-50 dark:bg-rose-900/10 text-rose-600 dark:text-rose-400 font-black text-xs active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-sm">delete_sweep</span>
              {t('trash.emptyBtn') || 'إفراغ السلة'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
