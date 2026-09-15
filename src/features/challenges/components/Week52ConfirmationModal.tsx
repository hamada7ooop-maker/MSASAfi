import React from 'react';
import { useI18n } from '../../../i18n/index';

interface Week52ConfirmationModalProps {
  week: number;
  amount: string;
  currency?: string;
  onCancel: () => void;
  onConfirm: () => void;
}

export function Week52ConfirmationModal({ week, amount, currency, onCancel, onConfirm }: Week52ConfirmationModalProps) {
  const { t } = useI18n();
  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-6 animate-in fade-in duration-300">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={onCancel} aria-hidden="true" />
      <div className="relative bg-white dark:bg-[#1e2124] w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl space-y-6 animate-in zoom-in-95 duration-300">
        <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center mx-auto">
          <span className="material-symbols-outlined text-4xl">account_balance_wallet</span>
        </div>
        <div className="text-center space-y-2">
          <h3 className="text-xl font-black dark:text-white">{t('challenge.week52.confirmTitle', { n: String(week) })}</h3>
          <p className="text-xs text-slate-400 font-bold leading-relaxed">
            {t('challenge.week52.confirmDesc', { n: String(week), amount, curr: currency || '' })}
          </p>
        </div>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 py-4 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-500 font-black text-xs active:scale-95 transition-all">{t('action.cancel')}</button>
          <button onClick={onConfirm} className="flex-[2] py-4 rounded-2xl bg-indigo-600 text-white font-black text-xs shadow-lg shadow-indigo-600/20 active:scale-95 transition-all">{t('challenge.week52.saveNow')}</button>
        </div>
      </div>
    </div>
  );
}
