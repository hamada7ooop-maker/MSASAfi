import React from 'react';
import { useI18n } from '../../../i18n/index';
import { useFormat } from '../../../core/hooks/useFormat';
import { calculateAmortization } from '../utils/amortization';
import type { Debt } from '../../../types';

interface AmortizationModalProps {
  isOpen: boolean;
  onClose: () => void;
  debt: Debt | null;
}

export function AmortizationModal({ isOpen, onClose, debt }: AmortizationModalProps) {
  const { t, isLTR } = useI18n();
  const { fmt } = useFormat();

  if (!isOpen || !debt) return null;

  const principal = debt.total;
  const annualRate = debt.interestRate || 0;
  const termMonths = debt.termMonths || 0;
  const interestType = debt.interestType || 'declining';

  const summary = calculateAmortization(principal, annualRate, termMonths, interestType);

  return (
    <div 
      className="fixed inset-0 z-[99990] flex items-center justify-center bg-black/40 backdrop-blur-[4px] p-4 transition-opacity duration-300 animate-in fade-in"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-[600px] bg-gradient-to-b from-white/90 to-slate-50/90 dark:from-[#1c1f23]/95 dark:to-[#141618]/95 border border-white/20 dark:border-white/5 rounded-[32px] p-6 shadow-2xl animate-in zoom-in-95 duration-300 flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
              <span className="material-symbols-outlined">table_chart</span>
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-800 dark:text-white leading-tight">
                {t('debt.amortizationSchedule') || 'Amortization Schedule 📊'}
              </h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                {debt.name} ({t(`debt.${interestType}`) || (interestType === 'flat' ? 'Flat' : 'Declining')})
              </p>
            </div>
          </div>
          <button aria-label={t('action.close') || 'Close'} 
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex items-center justify-center transition-all"
          >
            <span className="material-symbols-outlined text-lg" aria-hidden="true">close</span>
          </button>
        </div>

        {/* Overview Stats Grid */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-slate-100/50 dark:bg-slate-800/40 border border-black/5 dark:border-white/5 p-4 rounded-2xl flex flex-col justify-between">
            <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">
              {t('debt.monthlyPayment') || 'Monthly EMI'}
            </span>
            <span className="text-base font-black text-blue-600 dark:text-blue-400 mt-1 tabular-nums">
              {fmt(summary.monthlyPayment)}
            </span>
          </div>

          <div className="bg-slate-100/50 dark:bg-slate-800/40 border border-black/5 dark:border-white/5 p-4 rounded-2xl flex flex-col justify-between">
            <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">
              {t('debt.totalInterest') || 'Total Interest'}
            </span>
            <span className="text-base font-black text-amber-500 mt-1 tabular-nums">
              {fmt(summary.totalInterest)}
            </span>
          </div>

          <div className="bg-slate-100/50 dark:bg-slate-800/40 border border-black/5 dark:border-white/5 p-4 rounded-2xl flex flex-col justify-between">
            <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">
              {t('debt.totalPayment') || 'Total Payment'}
            </span>
            <span className="text-base font-black text-emerald-600 dark:text-emerald-400 mt-1 tabular-nums">
              {fmt(summary.totalPayment)}
            </span>
          </div>
        </div>

        {/* Schedule Table Container */}
        <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar bg-slate-100/20 dark:bg-slate-900/30 rounded-2xl border border-black/5 dark:border-white/5">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-slate-100 dark:bg-slate-800/80 backdrop-blur-md z-10">
              <tr>
                <th className={`p-3 text-[10px] font-black uppercase text-slate-400 tracking-wider ${isLTR ? 'text-left' : 'text-right'}`}>
                  {t('debt.month') || 'Month'}
                </th>
                <th className={`p-3 text-[10px] font-black uppercase text-slate-400 tracking-wider ${isLTR ? 'text-left' : 'text-right'}`}>
                  {t('debt.principal') || 'Principal'}
                </th>
                <th className={`p-3 text-[10px] font-black uppercase text-slate-400 tracking-wider ${isLTR ? 'text-left' : 'text-right'}`}>
                  {t('debt.interest') || 'Interest'}
                </th>
                <th className={`p-3 text-[10px] font-black uppercase text-slate-400 tracking-wider ${isLTR ? 'text-left' : 'text-right'}`}>
                  {t('debt.remaining') || 'Remaining'}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {summary.schedule.map((row) => (
                <tr key={row.month} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                  <td className={`p-3 text-xs font-black text-slate-500 dark:text-slate-400 tabular-nums ${isLTR ? 'text-left' : 'text-right'}`}>
                    #{row.month}
                  </td>
                  <td className={`p-3 text-xs font-bold text-slate-800 dark:text-slate-200 tabular-nums ${isLTR ? 'text-left' : 'text-right'}`}>
                    {fmt(row.principal)}
                  </td>
                  <td className={`p-3 text-xs font-semibold text-amber-500 tabular-nums ${isLTR ? 'text-left' : 'text-right'}`}>
                    {fmt(row.interest)}
                  </td>
                  <td className={`p-3 text-xs font-bold text-slate-700 dark:text-slate-300 tabular-nums ${isLTR ? 'text-left' : 'text-right'}`}>
                    {fmt(row.remainingBalance)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer info/Disclaimer */}
        <div className="mt-6 flex items-center justify-between text-[9px] text-slate-400 font-bold uppercase tracking-wider">
          <span>{t('debt.termMonths')}: {termMonths} {t('time.months') || 'Months'}</span>
          <span>{t('debt.interestRate')}: {annualRate}%</span>
        </div>
      </div>
    </div>
  );
}
