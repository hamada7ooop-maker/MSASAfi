import React, { useState } from 'react';
import { useI18n } from '../../../i18n/index';
import { useFormat } from '../../../core/hooks/useFormat';
import type { Account } from '../../../types';

const ACCOUNT_ICONS: Record<string, string> = {
  bank: 'account_balance', cash: 'payments',
  ewallet: 'account_balance_wallet', crypto: 'currency_bitcoin',
  savings: 'account_balance_wallet', credit: 'credit_card',
};

export function AccountModal({ account, onSave, onClose }: {
  account?: Partial<Account>; onSave: (d: Partial<Account>) => void; onClose: () => void;
}) {
  const { t } = useI18n();
  const { parseNum, sanitizeNumericInput } = useFormat();
  const [type, setType] = useState<Account['type']>(account?.type || 'bank');
  const [name, setName] = useState(account?.name || '');
  const [balance, setBalance] = useState(account?.balance !== undefined ? String(account.balance) : '');
  const [initialBalance, setInitialBalance] = useState(account?.initialBalance !== undefined ? String(account.initialBalance) : '');

  const handleSave = () => {
    if (!name.trim()) return;
    const numBalance = parseNum(balance);
    const numInitial = initialBalance.trim() ? parseNum(initialBalance) : numBalance;
    onSave({
      ...account,
      name: name.trim(),
      type,
      balance: numBalance,
      initialBalance: numInitial,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div className="relative bg-white dark:bg-[#1e2124] w-full max-w-lg rounded-[2.5rem] p-6 pb-12 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="w-10 h-1 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto mb-2" />
        <h3 className="text-lg font-black dark:text-white">{account?.id ? t('account.edit') : t('account.add')}</h3>

        {/* Type selector */}
        <div className="grid grid-cols-3 gap-2">
          {(['bank','cash','ewallet','crypto', 'savings', 'credit'] as const).map(tp => (
            <button key={tp} onClick={() => setType(tp)}
              className={`flex flex-col items-center gap-1 p-3 rounded-2xl transition-all ${type === tp ? 'bg-[#002b59] text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
              <span className="material-symbols-outlined text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                {ACCOUNT_ICONS[tp]}
              </span>
              <span className="text-[9px] font-bold capitalize">{t(`account.type.${tp}`) || tp}</span>
            </button>
          ))}
        </div>

        <input 
          value={name} 
          onChange={e => setName(e.target.value)}
          onCompositionEnd={e => setName((e.target as HTMLInputElement).value)}
          onBlur={e => setName(e.target.value)}
          dir="auto"
          autoComplete="off"
          placeholder={t('account.namePlaceholder') || 'Account name'}
          className="w-full bg-slate-50 dark:bg-[#2a2d30] p-3 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-400 dark:text-white" 
        />

        <div className="flex gap-2">
          <div className="flex-1">
            <label className="text-[10px] text-slate-400 font-bold px-1">{t('account.balance') || 'Current Balance'}</label>
            <input 
              type="text" 
              inputMode="decimal"
              dir="auto"
              value={balance} 
              onChange={e => setBalance(sanitizeNumericInput(e.target.value, true, true))}
              onCompositionEnd={e => setBalance(sanitizeNumericInput(e.currentTarget.value, true, true))}
              placeholder="0.00"
              className="w-full bg-slate-50 dark:bg-[#2a2d30] p-3 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-400 dark:text-white mt-1" 
            />
          </div>
          <div className="flex-1">
            <label className="text-[10px] text-slate-400 font-bold px-1">{t('account.initialBalance') || 'Initial Balance'}</label>
            <input 
              type="text" 
              inputMode="decimal"
              dir="auto"
              value={initialBalance} 
              onChange={e => setInitialBalance(sanitizeNumericInput(e.target.value, true, true))}
              onCompositionEnd={e => setInitialBalance(sanitizeNumericInput(e.currentTarget.value, true, true))}
              placeholder="0.00"
              className="w-full bg-slate-50 dark:bg-[#2a2d30] p-3 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-400 dark:text-white mt-1" 
            />
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button onClick={onClose} className="flex-1 py-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-sm">
            {t('action.cancel')}
          </button>
          <button 
            onClick={handleSave}
            disabled={!name.trim()}
            className="flex-1 py-3 rounded-2xl bg-[#002b59] text-white font-black text-sm shadow-lg shadow-blue-900/20 disabled:opacity-50"
          >
            {t('action.save')}
          </button>
        </div>
      </div>
    </div>
  );
}

