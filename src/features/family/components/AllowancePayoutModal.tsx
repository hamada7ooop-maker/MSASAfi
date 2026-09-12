import React, { useEffect } from 'react';
import { useI18n } from '../../../i18n';
import { useFormat } from '../../../core/hooks/useFormat';
import { useFocusTrap } from '../../../core/hooks/useFocusTrap';
import type { Account } from '../../../types';
import type { ChildAccount } from '../../../store/settingsStore';

interface AllowancePayoutModalProps {
  child: ChildAccount | null;
  accounts: Account[];
  allowanceAccountId: string;
  onAccountChange: (val: string) => void;
  onConfirm: () => void;
  onClose: () => void;
}

export function AllowancePayoutModal({
  child,
  accounts,
  allowanceAccountId,
  onAccountChange,
  onConfirm,
  onClose,
}: AllowancePayoutModalProps) {
  const { t } = useI18n();
  const { fmt } = useFormat();
  const containerRef = useFocusTrap<HTMLDivElement>(!!child);

  useEffect(() => {
    if (!child) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [child, onClose]);

  if (!child) return null;

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-300"
      role="dialog"
      aria-modal="true"
      aria-labelledby="allowance-payout-title"
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div 
        ref={containerRef}
        className="relative w-full sm:max-w-sm bg-white dark:bg-[#1e2124] rounded-t-[2rem] sm:rounded-[2rem] p-6 shadow-2xl animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-8"
      >
        <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto mb-4 sm:hidden" />
        
        <div className="text-center space-y-2 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center mx-auto">
            <span className="material-symbols-outlined text-2xl">payments</span>
          </div>
          <h3 id="allowance-payout-title" className="text-lg font-black text-slate-800 dark:text-white">
            {t('family.monitored.payAllowance') || 'صرف المصروف'}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-bold">
            {child.name} • {fmt(child.allowance)} ر.س
          </p>
        </div>

        <div className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
              {t('family.monitored.deductFromAccount') || 'خصم من حساب:'}
            </label>
            <select
              value={allowanceAccountId}
              onChange={e => onAccountChange(e.target.value)}
              className="w-full bg-slate-50 dark:bg-black/20 p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none text-xs font-bold dark:text-white transition-all appearance-none"
            >
              {accounts.map(acc => (
                <option key={acc.id} value={acc.id}>
                  {acc.name} ({fmt(acc.balance || 0)} ر.س)
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-3 pt-2">
            <button 
              type="button"
              onClick={onClose}
              aria-label={t('action.cancel')}
              className="flex-1 py-3.5 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-black text-xs active:scale-95 transition-all cursor-pointer"
            >
              {t('action.cancel')}
            </button>
            <button 
              type="button"
              onClick={onConfirm}
              className="flex-1 py-3.5 rounded-2xl bg-emerald-600 text-white font-black text-xs shadow-lg shadow-emerald-900/20 active:scale-95 transition-all cursor-pointer"
            >
              {t('family.monitored.confirmPayout') || 'تأكيد وصرف'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
