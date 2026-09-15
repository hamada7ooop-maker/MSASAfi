import React, { useState, useEffect } from 'react';
import { useI18n } from '../../../i18n/index';
import { useFormat } from '../../../core/hooks/useFormat';
import type { Installment, Account } from '../../../types';
import { db as DB } from '@/core/db/core';
import { useSettingsStore } from '../../../store/settingsStore';
import { useShallow } from 'zustand/react/shallow';
import { useIsMounted } from '../../../hooks/useIsMounted';
import { silentFail } from '../../../core/utils';

interface InstallmentsCardProps {
  installments: Installment[];
  accounts: Account[];
  onPay: (id: string, accountId?: string) => Promise<void>;
  onEdit: (inst: Installment) => void;
  onDelete: (id: string) => Promise<void>;
}

export function InstallmentsCard({ installments, accounts, onPay, onEdit, onDelete }: InstallmentsCardProps) {
  const { t, isLTR } = useI18n();
  const { fmt, fmtRaw } = useFormat();
  const isMounted = useIsMounted();

  // Load configured salary structure from Zustand Store
  const { salaryBasic, salaryAllowances, salaryDeductions } = useSettingsStore(
    useShallow((s) => ({
      salaryBasic: s.salaryBasic,
      salaryAllowances: s.salaryAllowances,
      salaryDeductions: s.salaryDeductions
    }))
  );

  const configuredAllowances = salaryAllowances?.reduce((sum, item) => sum + (item.amount || 0), 0) || 0;
  const configuredDeductions = salaryDeductions?.reduce((sum, item) => sum + (item.amount || 0), 0) || 0;
  const calculatedNetSalary = (salaryBasic || 0) + configuredAllowances - configuredDeductions;
  const hasSalaryConfigured = (salaryBasic || 0) > 0;

  // User configurable income with local storage state to preserve user calibration!
  const [monthlyIncome, setMonthlyIncome] = useState(() => {
    const saved = localStorage.getItem('masarifi_estimated_income');
    return saved ? parseFloat(saved) : 10000;
  });

  // Fetch actual monthly income from transactions if available to pre-populate or suggest
  useEffect(() => {
    if (hasSalaryConfigured) return; // Skip if salary structure is already calibrated
    async function loadActualIncome() {
      try {
        const transactions = await DB.getTransactions();
        // Filter income transactions from the current month
        const now = new Date();
        const thisMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        
        const incomeTxs = transactions.filter(t => 
          t.type === 'income' && 
          t.date && 
          t.date.startsWith(thisMonthStr)
        );
        
        const sum = incomeTxs.reduce((acc, t) => acc + (t.amount || 0), 0);
        if (sum > 0 && isMounted.current && !localStorage.getItem('masarifi_estimated_income')) {
          setMonthlyIncome(sum);
        }
      } catch (e) {
        silentFail('Failed to calculate actual income in InstallmentsCard')(e);
      }
    }
    loadActualIncome();
  }, [hasSalaryConfigured, isMounted]);

  const handleIncomeChange = (val: number) => {
    setMonthlyIncome(val);
    localStorage.setItem('masarifi_estimated_income', val.toString());
  };

  // Active installments (where paidPayments < totalPayments)
  const activeInstallments = installments.filter(inst => inst.paidPayments < inst.totalPayments);
  
  // Total monthly installment deduction
  const totalDeduction = activeInstallments.reduce((sum, inst) => sum + inst.amount, 0);
  
  // Choose correct monthly income
  const activeMonthlyIncome = hasSalaryConfigured ? calculatedNetSalary : monthlyIncome;

  // Real disposable income
  const disposableIncome = Math.max(0, activeMonthlyIncome - totalDeduction);
  
  // Deduction ratio
  const ratio = activeMonthlyIncome > 0 ? (totalDeduction / activeMonthlyIncome) * 100 : 0;

  // Determine financial status based on deduction ratio
  let statusColor = 'from-emerald-500/25 to-teal-500/5';
  let borderStrokeColor = '#10b981'; // Tailwind Emerald 500
  let statusBadgeColor = 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400';
  let statusTitle = t('debt.statusSafe') || 'Safe 🟢';
  let statusDesc = t('debt.statusSafeDesc') || 'Your deduction ratio is within safe limits.';

  if (ratio >= 33 && ratio <= 50) {
    statusColor = 'from-amber-500/25 to-orange-500/5';
    borderStrokeColor = '#f59e0b'; // Tailwind Amber 500
    statusBadgeColor = 'bg-amber-500/20 text-amber-600 dark:text-amber-400';
    statusTitle = t('debt.statusWarning') || 'Caution 🟡';
    statusDesc = t('debt.statusWarningDesc') || 'Caution: Approaching half your monthly income. Avoid new commitments.';
  } else if (ratio > 50) {
    statusColor = 'from-rose-500/25 to-red-500/5';
    borderStrokeColor = '#f43f5e'; // Tailwind Rose 500
    statusBadgeColor = 'bg-rose-500/20 text-rose-600 dark:text-rose-400';
    statusTitle = t('debt.statusRisk') || 'High Risk 🔴';
    statusDesc = t('debt.statusRiskDesc') || 'Danger! Monthly commitments consume more than half your income.';
  }

  // Account mapping for payment selectors
  const [selectedAccounts, setSelectedAccounts] = useState<Record<string, string>>({});

  const handlePayClick = async (instId: string) => {
    const accId = selectedAccounts[instId] || accounts[0]?.id;
    await onPay(instId, accId);
    
    // Clear selection
    setSelectedAccounts(prev => {
      const next = { ...prev };
      delete next[instId];
      return next;
    });
  };

  // Stacked progress bar calculations for Salary Structure cockpit
  const totalConfiguredIncome = (salaryBasic || 0) + configuredAllowances;
  const deductPct = totalConfiguredIncome > 0 ? (configuredDeductions / totalConfiguredIncome) * 100 : 0;
  const installPct = totalConfiguredIncome > 0 ? (totalDeduction / totalConfiguredIncome) * 100 : 0;
  const remainingPct = Math.max(0, 100 - deductPct - installPct);

  return (
    <div className="space-y-6">
      
      {/* ── VISUAL DEDUCTION ADVISOR PANEL ── */}
      <div className={`relative overflow-hidden rounded-[24px] border border-white/10 p-6 bg-gradient-to-br ${statusColor} backdrop-blur-xl shadow-xl transition-all duration-500`}>
        
        <div className="flex justify-between items-start mb-6">
          <div>
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${statusBadgeColor} mb-2`}>
              {statusTitle}
            </span>
            <h4 className="text-sm font-bold text-slate-500 dark:text-slate-400">
              {t('debt.totalInstallments') || 'Total Monthly Installment'}
            </h4>
            <div className="text-3xl font-black text-slate-800 dark:text-white mt-1">
              {fmt(totalDeduction)}
            </div>
          </div>

          {/* Interactive Progress Circle */}
          <div className="relative w-20 h-20 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90">
              <circle 
                cx="40" 
                cy="40" 
                r="34" 
                className="stroke-slate-200 dark:stroke-slate-800" 
                strokeWidth="6" 
                fill="transparent" 
              />
              <circle 
                cx="40" 
                cy="40" 
                r="34" 
                stroke={borderStrokeColor}
                strokeWidth="6" 
                fill="transparent" 
                strokeDasharray={2 * Math.PI * 34}
                strokeDashoffset={2 * Math.PI * 34 * (1 - Math.min(100, ratio) / 100)}
                className="transition-all duration-1000 ease-out"
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-sm font-black text-slate-800 dark:text-white">
                %{fmtRaw(Math.round(ratio))}
              </span>
            </div>
          </div>
        </div>

        {/* Real Disposable Income breakdown */}
        <div className="grid grid-cols-2 gap-4 border-t border-white/10 pt-4 mb-6">
          <div>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block mb-1">
              {t('debt.realNetIncome') || 'Real Net Available Income'}
            </span>
            <span className="text-lg font-black text-slate-800 dark:text-white">
              {fmt(disposableIncome)}
            </span>
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block mb-1">
              {hasSalaryConfigured ? (t('settings.salaryNet') || 'Calibrated Net Salary') : (t('debt.income') || 'Estimated Monthly Income')}
            </span>
            <span className="text-lg font-black text-slate-800 dark:text-white">
              {fmt(activeMonthlyIncome)}
            </span>
          </div>
        </div>

        {/* Advisor text */}
        <p className="text-xs font-bold text-slate-600 dark:text-slate-300 leading-relaxed mb-6">
          {statusDesc}
        </p>

        {/* ── NEW HIGHER-DENSITY COCKPIT VISUALIZATION ── */}
        {hasSalaryConfigured ? (
          <div className="bg-white/5 dark:bg-black/20 border border-white/5 rounded-2xl p-4 flex flex-col gap-3">
            <div className="flex justify-between items-center text-[10px] font-black tracking-wider uppercase text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-sm text-emerald-500">stacked_bar_chart</span>
                {t('debt.salaryBreakdown') || 'Salary Breakdown Cockpit'}
              </span>
              <span className="text-emerald-500 dark:text-emerald-400">{fmt(activeMonthlyIncome)}</span>
            </div>

            {/* Stacked Progress Bar */}
            <div className="w-full h-3.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden flex border border-slate-300 dark:border-slate-700/50">
              {deductPct > 0 && (
                <div 
                  style={{ width: `${deductPct}%` }} 
                  className="h-full bg-amber-500 transition-all"
                  title={`Salary Deductions: ${fmt(configuredDeductions)}`}
                />
              )}
              {installPct > 0 && (
                <div 
                  style={{ width: `${installPct}%` }} 
                  className="h-full bg-red-500 transition-all animate-pulse"
                  title={`Installments Outflow: ${fmt(totalDeduction)}`}
                />
              )}
              {remainingPct > 0 && (
                <div 
                  style={{ width: `${remainingPct}%` }} 
                  className="h-full bg-emerald-500 transition-all"
                  title={`Net Remaining Liquidity: ${fmt(disposableIncome)}`}
                />
              )}
            </div>

            {/* Premium Legend Grid */}
            <div className="grid grid-cols-3 gap-1.5 text-[9px] font-black tracking-widest uppercase text-slate-500 dark:text-slate-400 mt-0.5">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-amber-500 shrink-0"></div>
                <span className="truncate">{t('settings.salaryTotalDeductions') || 'Deductions'}: {fmt(configuredDeductions)}</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-red-500 shrink-0"></div>
                <span className="truncate">{t('debt.totalInstallments') || 'Commitments'}: {fmt(totalDeduction)}</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 animate-pulse"></div>
                <span className="truncate text-emerald-600 dark:text-emerald-400">{t('debt.netCashAfterCommitments') || 'Liquidity'}: {fmt(disposableIncome)}</span>
              </div>
            </div>
            
            <p className="text-[9px] font-bold text-blue-500/75 dark:text-blue-400/70 border-t border-white/5 pt-2 mt-1 flex items-center gap-1">
              <span className="material-symbols-outlined text-xs">info</span>
              {t('settings.salaryCalibratedNotice') || 'Income is dynamically calibrated from your Settings.'}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {/* Dynamic income calibration slider */}
            <div className="bg-white/5 dark:bg-black/10 rounded-2xl p-4 border border-white/5">
              <div className="flex justify-between text-[11px] font-black text-slate-500 dark:text-slate-400 mb-2">
                <span>{t('debt.income') || 'Income Calibration'}</span>
                <span className="text-blue-500 dark:text-blue-400">{fmt(monthlyIncome)}</span>
              </div>
              <input 
                type="range" 
                min="2000" 
                max="50000" 
                step="500"
                value={monthlyIncome}
                onChange={(e) => handleIncomeChange(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
              <div className="flex justify-between text-[9px] font-bold text-slate-400 mt-1">
                <span>{fmt(2000)}</span>
                <span>{fmt(50000)}</span>
              </div>
            </div>

            <p className="text-[10px] font-bold text-amber-600 dark:text-amber-400/80 bg-amber-500/5 rounded-xl p-3 border border-amber-500/10 flex items-start gap-1.5 leading-relaxed">
              <span className="material-symbols-outlined text-sm font-black text-amber-500 shrink-0">lightbulb</span>
              {t('debt.configureSalaryTip') || '💡 هل تعلم؟ يمكنك تهيئة هيكل تفاصيل راتبك بالكامل (بدلات وخصومات) في الإعدادات للحصول على تحليل سيولة فائق الدقة!'}
            </p>
          </div>
        )}

      </div>

      {/* ── ACTIVE INSTALLMENTS LIST ── */}
      <div className="space-y-3">
        <div className="flex justify-between items-center px-1">
          <h3 className="text-base font-black text-slate-800 dark:text-white">
            {t('debt.tabInstallments') || 'Active Installments'}
          </h3>
          <span className="text-xs font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg">
            {fmtRaw(activeInstallments.length)}
          </span>
        </div>

        {activeInstallments.length === 0 ? (
          <div className="text-center py-10 rounded-2xl bg-white/5 border border-dashed border-white/10">
            <span className="material-symbols-outlined text-4xl text-slate-400 mb-2">schedule</span>
            <p className="text-sm font-bold text-slate-400">
              {t('debt.noInstallments') || 'No active installments found'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {activeInstallments.map(inst => {
              const currentPaidRatio = inst.totalPayments > 0 ? (inst.paidPayments / inst.totalPayments) * 100 : 0;

              return (
                <div 
                  key={inst.id}
                  className="cv-item-lg contain-card w-full max-w-full min-w-0 bg-white/60 dark:bg-slate-900/60 rounded-2xl p-4 border border-white/10 dark:border-slate-800/80 shadow-md relative overflow-hidden transition-all duration-300 hover:-translate-y-0.5"
                >
                  {/* Action buttons on top right (or top left in RTL) */}
                  <div className={`absolute top-4 ${isLTR ? 'right-4' : 'left-4'} flex gap-1.5 z-10 shrink-0`}>
                    <button 
                      onClick={() => onEdit(inst)}
                      className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 transition-colors shrink-0 active:scale-95"
                      aria-label={t('action.edit') || 'تعديل'}
                      title={t('action.edit') || 'تعديل'}
                    >
                      <span className="material-symbols-outlined text-xs" aria-hidden="true">edit</span>
                    </button>
                    <button 
                      onClick={() => onDelete(inst.id)}
                      className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-500 transition-colors shrink-0 active:scale-95"
                      aria-label={t('action.delete') || 'حذف'}
                      title={t('action.delete') || 'حذف'}
                    >
                      <span className="material-symbols-outlined text-xs" aria-hidden="true">delete</span>
                    </button>
                  </div>

                  {/* Header info */}
                  <div className={`flex items-center gap-3 mb-3 min-w-0 ${isLTR ? 'pr-20 pl-1' : 'pl-20 pr-1'}`}>
                    <div className="w-10 h-10 rounded-xl bg-blue-500/15 flex items-center justify-center text-blue-500 shrink-0">
                      <span className="material-symbols-outlined text-xl">schedule</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-sm font-black text-slate-800 dark:text-white leading-tight truncate" title={inst.name}>
                        {inst.name}
                      </h4>
                      {inst.person && (
                        <p className="text-[11px] font-bold text-slate-400 mt-0.5 truncate">
                          🏢 {inst.person}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="mb-4">
                    <div className="flex justify-between text-xs font-black text-slate-500 dark:text-slate-400 mb-1.5">
                      <span>{t('debt.paidPayments') || 'Paid Progress'}</span>
                      <span className="text-blue-500 dark:text-blue-400">
                        {fmtRaw(inst.paidPayments)} / {fmtRaw(inst.totalPayments)}
                      </span>
                    </div>
                    <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-blue-600 rounded-full transition-all duration-700" 
                        style={{ width: `${currentPaidRatio}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Details and pay section */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-t border-slate-100 dark:border-slate-800/80 pt-3 mt-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-[9px] font-black text-slate-400 block mb-0.5 uppercase">
                          {t('debt.installmentAmount') || 'Monthly Amount'}
                        </span>
                        <span className="text-base font-black text-slate-800 dark:text-white">
                          {fmt(inst.amount)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[9px] font-black text-slate-400 block mb-0.5 uppercase">
                          {t('debt.nextDueDate') || 'Next Due Date'}
                        </span>
                        <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                          {inst.dueDate}
                        </span>
                      </div>
                    </div>

                    {/* Pay trigger */}
                    <div className="flex items-center gap-2">
                      {accounts.length > 0 && (
                        <select 
                          value={selectedAccounts[inst.id] || inst.accountId || accounts[0]?.id}
                          onChange={(e) => setSelectedAccounts(prev => ({ ...prev, [inst.id]: e.target.value }))}
                          className="bg-slate-100 dark:bg-slate-800 text-xs font-bold p-2.5 rounded-xl border-none text-slate-800 dark:text-white outline-none"
                        >
                          {accounts.map(a => (
                            <option key={a.id} value={a.id}>{a.name}</option>
                          ))}
                        </select>
                      )}

                      <button 
                        onClick={() => handlePayClick(inst.id)}
                        className="flex-1 md:flex-initial bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl active:scale-95 transition-all shadow-md shadow-emerald-500/10"
                      >
                        {t('debt.payInstallment') || 'Pay 🟢'}
                      </button>
                    </div>
                  </div>

                  {/* Notes if present */}
                  {inst.notes && (
                    <div className="bg-slate-50 dark:bg-slate-900/40 rounded-xl p-2.5 mt-3 text-[11px] font-bold text-slate-500 dark:text-slate-400 leading-relaxed border border-slate-100/50 dark:border-slate-800/30">
                      📝 {inst.notes}
                    </div>
                  )}

                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
