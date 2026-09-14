import React, { useState, useEffect } from 'react';
import { useI18n } from '../../../i18n/index';
import { useFormat } from '../../../core/hooks/useFormat';
import type { Account } from '../../../types';
import { toast } from '../../../toast';

interface DepositAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  accounts: Account[];
  onConfirm: (accountId: string) => void;
}

export function DepositAccountModal({ isOpen, onClose, accounts, onConfirm }: DepositAccountModalProps) {
  const { t, isLTR } = useI18n();
  const { fmt } = useFormat();
  const [accountId, setAccountId] = useState('');

  useEffect(() => {
    if (isOpen && accounts.length > 0) {
      setAccountId(accounts[0].id);
    }
  }, [isOpen, accounts]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (!accountId) {
      toast(t('common.selectAccount') || 'Please select an account', 'error');
      return;
    }
    onConfirm(accountId);
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 z-[99999] flex items-end justify-center bg-black/50 backdrop-blur-sm transition-opacity animate-in fade-in"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-[440px] bg-white dark:bg-[#1a1d21] rounded-t-[32px] p-6 shadow-2xl animate-in slide-in-from-bottom-full duration-300"
        onClick={(e) => e.stopPropagation()}>
        <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto mb-6"></div>

        <h3 className="text-lg font-black mb-4 text-slate-800 dark:text-white">
          {t('bill.selectAccountPay') || 'Select Account to Pay From'}
        </h3>

        <div className="relative mb-6">
          <select 
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            className="w-full bg-slate-100 dark:bg-slate-800 p-4 rounded-2xl border-none font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500/30 appearance-none"
          >
            {accounts.map(a => (
              <option key={a.id} value={a.id}>{a.name} ({fmt(a.balance)})</option>
            ))}
          </select>
          <div className={`absolute inset-y-0 ${isLTR ? 'right-4' : 'left-4'} flex items-center pointer-events-none`}>
            <span className="material-symbols-outlined text-slate-400">expand_more</span>
          </div>
        </div>

        <div className="flex gap-3">
          <button 
            onClick={onClose}
            className="flex-1 py-4 rounded-2xl bg-slate-100 dark:bg-slate-800 font-bold text-slate-500 active:scale-95 transition-all"
          >
            {t('action.cancel')}
          </button>
          <button 
            onClick={handleConfirm}
            className="flex-1 py-4 rounded-2xl bg-emerald-600 text-white font-bold active:scale-95 transition-all shadow-lg shadow-emerald-500/30"
          >
            {t('action.add')}
          </button>
        </div>
      </div>
    </div>
  );
}
