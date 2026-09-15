import React, { useState } from 'react';
import { useI18n } from '../../../i18n/index';
import { useFormat } from '../../../core/hooks/useFormat';
import type { Account } from '../../../types';

export function TransferModal({ accounts, onTransfer, onClose }: {
  accounts: Account[]; onTransfer: (from: string, to: string, amt: number) => void; onClose: () => void;
}) {
  const { t } = useI18n();
  const { parseNum, getCurrencySymbol, sanitizeNumericInput } = useFormat();
  const [fromId, setFromId] = useState(accounts[0]?.id || '');
  const [toId, setToId]     = useState(() => accounts.find(a => a.id !== accounts[0]?.id)?.id || '');
  const [amount, setAmount] = useState('');

  const handleFromChange = (newFromId: string) => {
    setFromId(newFromId);
    if (newFromId === toId) {
      const other = accounts.find(a => a.id !== newFromId);
      if (other) setToId(other.id);
    }
  };

  const fromAcc = accounts.find(a => a.id === fromId);
  const toAcc = accounts.find(a => a.id === toId);

  const handleTransferSubmit = () => {
    const numAmount = parseNum(amount);
    if (!fromAcc) return;
    if (!toAcc || fromId === toId) {
      alert(t('account.errSameAccount') || 'لا يمكن التحويل لنفس الحساب');
      return;
    }
    if (numAmount <= 0) {
      alert(t('txn.errAmount') || 'المبلغ غير صالح');
      return;
    }
    if (numAmount > (fromAcc.balance || 0)) {
      alert(t('account.errInsufficientBalance') || 'رصيد الحساب المصدر غير كافٍ');
      return;
    }
    onTransfer(fromId, toId, numAmount);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div className="relative bg-white dark:bg-[#1e2124] w-full max-w-lg rounded-[2.5rem] p-6 pb-12 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="w-10 h-1 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto mb-2" />
        <h3 className="text-lg font-black dark:text-white">{t('account.transfer') || 'Transfer'}</h3>

        {/* Source Account */}
        <div className="space-y-1">
          <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-1">
            {t('account.fromSource') || 'من حساب (المصدر)'}
          </label>
          <select 
            value={fromId} 
            onChange={e => handleFromChange(e.target.value)}
            className="w-full bg-slate-50 dark:bg-[#2a2d30] p-3 rounded-2xl text-sm font-bold focus:outline-none dark:text-white"
          >
            {accounts.map(a => (
              <option key={a.id} value={a.id}>{a.name} ({a.balance || 0})</option>
            ))}
          </select>
        </div>

        <div className="flex items-center justify-center py-1">
          <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
            <span className="material-symbols-outlined text-lg">arrow_downward</span>
          </div>
        </div>

        {/* Destination Account */}
        <div className="space-y-1">
          <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-1">
            {t('account.toDestination') || 'إلى حساب (الوجهة)'}
          </label>
          <select 
            value={toId} 
            onChange={e => setToId(e.target.value)}
            className="w-full bg-slate-50 dark:bg-[#2a2d30] p-3 rounded-2xl text-sm font-bold focus:outline-none dark:text-white"
          >
            {accounts.filter(a => a.id !== fromId).map(a => (
              <option key={a.id} value={a.id}>{a.name} ({a.balance || 0})</option>
            ))}
          </select>
        </div>

        {/* Amount */}
        <div className="space-y-1">
          <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-1">
            {t('txn.amount') || 'Amount'}
          </label>
          <div className="relative">
            <input 
              type="text" 
              inputMode="decimal"
              dir="auto"
              value={amount} 
              onChange={e => setAmount(sanitizeNumericInput(e.target.value))}
              onCompositionEnd={e => setAmount(sanitizeNumericInput(e.currentTarget.value))}
              placeholder="0.00"
              className="w-full bg-slate-50 dark:bg-[#2a2d30] p-3 rounded-2xl text-sm font-bold focus:outline-none dark:text-white" 
            />
            <div className="absolute inset-y-0 right-3 rtl:right-auto rtl:left-3 flex items-center pointer-events-none text-xs font-bold text-slate-400">
              {getCurrencySymbol()}
            </div>
          </div>
        </div>

        <div className="flex gap-3 pt-4">
          <button onClick={onClose} className="flex-1 py-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-600 font-bold text-sm active:scale-95 transition-all">
            {t('action.cancel')}
          </button>
          <button 
            onClick={handleTransferSubmit}
            disabled={!fromId || !toId || fromId === toId || parseNum(amount) <= 0}
            className="flex-1 py-3 rounded-2xl bg-[#002b59] text-white font-black text-sm active:scale-95 transition-all disabled:opacity-50 disabled:pointer-events-none"
          >
            {t('account.transfer') || 'Transfer'}
          </button>
        </div>
      </div>
    </div>
  );
}

