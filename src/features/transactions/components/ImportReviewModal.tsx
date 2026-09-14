import React, { useState, useEffect } from 'react';
import { useI18n } from '../../../i18n/index';
import { useFormat } from '../../../core/hooks/useFormat';
import { toast } from '../../../toast';
import { AccountRepository } from '../../../core/db/repositories/accounts';
import type { Account } from '@/types';
import type { ImportedTransaction } from '../../../services/statementParser';

interface ImportReviewModalProps {
  transactions: ImportedTransaction[];
  onConfirm: (final: ImportedTransaction[], accountId: string) => Promise<void>;
  onClose: () => void;
}

export function ImportReviewModal({ transactions, onConfirm, onClose }: ImportReviewModalProps) {
  const { t } = useI18n();
  const { fmt } = useFormat();
  const [items] = useState<ImportedTransaction[]>(transactions);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(transactions.map(t => t.id!)));
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');

  useEffect(() => {
    AccountRepository.getAll().then(accs => {
      setAccounts(accs);
      if (accs.length > 0) setSelectedAccountId(accs[0].id);
    });
  }, []);

  const toggleItem = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleConfirm = async () => {
    const final = items.filter(it => selectedIds.has(it.id!));
    if (final.length === 0) {
      toast(t('txn.noImported'), 'error');
      return;
    }

    if (!selectedAccountId) {
      toast(t('account.selectAccount'), 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      await onConfirm(final, selectedAccountId);
      toast(t('txn.importSuccess', { n: String(final.length) }), 'success');
      onClose();
    } catch {
      toast(t('common.error'), 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const totalAmount = items
    .filter(it => selectedIds.has(it.id!))
    .reduce((sum, it) => sum + (it.type === 'expense' ? -it.amount : it.amount), 0);

  return (
    <div className="fixed inset-0 z-[200] flex flex-col bg-slate-50 dark:bg-[#0f1113] animate-in slide-in-from-bottom duration-500">
      {/* Header */}
      <div className="p-6 flex items-center justify-between bg-white dark:bg-[#1c1f23] border-b border-black/5 dark:border-white/5 sticky top-0 z-10">
        <button aria-label={t('action.close') || 'Close'} onClick={onClose} className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 active:scale-90 transition-all">
          <span className="material-symbols-outlined" aria-hidden="true">close</span>
        </button>
        <div className="flex flex-col items-center">
          <h2 className="text-sm font-black text-[#002b59] dark:text-blue-100">
            {t('txn.reviewImport')}
          </h2>
          <p className="text-[10px] text-blue-500 font-black uppercase tracking-widest">
            {selectedIds.size} {t('txn.count')}
          </p>
        </div>
        <div className="w-10" /> {/* Spacer */}
      </div>

      {/* Summary Card */}
      <div className="px-6 space-y-4 mb-6">
        <div className="p-6 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[2.5rem] shadow-xl shadow-blue-500/20 text-white flex justify-between items-center">
          <div className="space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-widest opacity-70">{t('txn.amount')}</p>
            <h3 className="text-2xl font-black">{fmt(totalAmount)}</h3>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
            <span className="material-symbols-outlined">account_balance_wallet</span>
          </div>
        </div>

        {/* Account Selector */}
        <div className="p-4 bg-white dark:bg-[#1c1f23] rounded-3xl border border-black/5 dark:border-white/5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
            <span className="material-symbols-outlined">account_balance</span>
          </div>
          <div className="flex-1">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{t('account.bank')}</p>
            <select 
              value={selectedAccountId}
              onChange={(e) => setSelectedAccountId(e.target.value)}
              className="w-full bg-transparent border-none p-0 text-sm font-black dark:text-white focus:ring-0 outline-none"
            >
              <option value="" disabled>{t('account.selectAccount')}</option>
              {accounts.map(acc => (
                <option key={acc.id} value={acc.id}>{acc.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-6 space-y-3 pb-32">
        {items.map(it => (
          <div 
            key={it.id}
            onClick={() => toggleItem(it.id!)}
            className={`flex items-center gap-4 p-4 rounded-[2rem] border transition-all ${
              selectedIds.has(it.id!) 
              ? 'bg-white dark:bg-[#1c1f23] border-blue-500/30 shadow-sm scale-[1.02]' 
              : 'bg-slate-100 dark:bg-slate-800/50 border-transparent opacity-50'
            }`}
          >
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${selectedIds.has(it.id!) ? (it.type === 'expense' ? 'bg-rose-500/10 text-rose-500' : 'bg-emerald-500/10 text-emerald-500') : 'bg-slate-200 dark:bg-slate-700 text-slate-400'}`}>
              <span className="material-symbols-outlined text-xl">
                {it.type === 'expense' ? 'south_west' : 'north_east'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-black dark:text-white truncate mb-0.5">{it.description}</p>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-slate-400">{new Date(it.date).toLocaleDateString()}</span>
                <span className="w-1 h-1 rounded-full bg-slate-300" />
                <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest">{it.category}</span>
              </div>
            </div>
            <p className={`font-black text-sm ${selectedIds.has(it.id!) ? (it.type === 'expense' ? 'text-rose-500' : 'text-emerald-500') : 'text-slate-400'}`}>
              {it.type === 'expense' ? '-' : '+'}{fmt(it.amount)}
            </p>
          </div>
        ))}
      </div>

      {/* Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 p-6 bg-white/80 dark:bg-[#1c1f23]/80 backdrop-blur-xl border-t border-black/5 dark:border-white/5">
        <button 
          onClick={handleConfirm}
          disabled={isSubmitting || selectedIds.size === 0}
          className="w-full py-5 rounded-[2.5rem] bg-gradient-to-r from-blue-600 to-indigo-700 text-white font-black text-lg shadow-xl shadow-blue-500/30 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
        >
          {isSubmitting ? (
            <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <span className="material-symbols-outlined">check_circle</span>
              {t('txn.confirmImport', { n: String(selectedIds.size) })}
            </>
          )}
        </button>
      </div>
    </div>
  );
}
