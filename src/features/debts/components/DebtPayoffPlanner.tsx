import React, { useState, useMemo, useCallback } from 'react';
import { useI18n } from '../../../i18n/index';
import { useFormat } from '../../../core/hooks/useFormat';
import type { Debt } from '../../../types';
import { isSettled } from '../../../core/money';

interface DebtPlannerProps {
  owedDebts: Debt[];
}

interface PayoffSimulationResult {
  strategyName: string;
  totalMonths: number;
  totalInterestPaid: number;
  schedule: Array<{
    month: number;
    payments: Array<{ debtName: string; amountPaid: number; remaining: number }>;
    events: string[];
  }>;
}

export function DebtPayoffPlanner({ owedDebts }: DebtPlannerProps) {
  const { t } = useI18n();
  const { fmt, getCurrencySymbol, parseNum, sanitizeNumericInput } = useFormat();

  // Dynamic state for interest rates and minimum payments per debt
  const [interestRates, setInterestRates] = useState<Record<string, number>>({});
  const [minPayments, setMinPayments] = useState<Record<string, number>>({});
  const [extraPayment, setExtraPayment] = useState<number>(500);

  // Initialize defaults for each debt
  const activeOwedDebts = useMemo(() => {
    return owedDebts.filter(d => (d.total - d.paid) > 0);
  }, [owedDebts]);

  const initialDebtParams = useMemo(() => {
    const params: Array<{ id: string; name: string; balance: number; interestRate: number; minPayment: number }> = [];
    activeOwedDebts.forEach(d => {
      const balance = d.total - d.paid;
      const rate = interestRates[d.id] ?? 0; // default 0%
      const minPay = minPayments[d.id] ?? Math.max(Math.ceil(balance * 0.05), 100); // default 5% of balance or 100
      params.push({ id: d.id, name: d.name || d.person || t('debt.planner.noName'), balance, interestRate: rate, minPayment: minPay });
    });
    return params;
  }, [activeOwedDebts, interestRates, minPayments, t]);

  // Simulate payoff month by month
  const runSimulation = useCallback((strategy: 'snowball' | 'avalanche'): PayoffSimulationResult => {
    // Clone debts to avoid mutation
    const debtsToPay = initialDebtParams.map(d => ({ ...d, remaining: d.balance }));

    if (debtsToPay.length === 0) {
      return { strategyName: strategy, totalMonths: 0, totalInterestPaid: 0, schedule: [] };
    }

    const schedule: PayoffSimulationResult['schedule'] = [];
    let totalInterestPaid = 0;
    let month = 0;
    const maxMonths = 360; // 30 years safety limit

    while (debtsToPay.some(d => d.remaining > 0) && month < maxMonths) {
      month++;
      const monthlyPayments: Array<{ debtName: string; amountPaid: number; remaining: number }> = [];
      const events: string[] = [];

      // Sort according to strategy
      if (strategy === 'snowball') {
        // Snowball: Smallest balance first
        debtsToPay.sort((a, b) => a.remaining - b.remaining);
      } else {
        // Avalanche: Highest interest rate first, then largest balance
        debtsToPay.sort((a, b) => b.interestRate - a.interestRate || b.remaining - a.remaining);
      }

      // 1. Accrue Monthly Interest
      debtsToPay.forEach(d => {
        if (d.remaining > 0 && d.interestRate > 0) {
          const monthlyRate = (d.interestRate / 100) / 12;
          const interest = d.remaining * monthlyRate;
          d.remaining += interest;
          totalInterestPaid += interest;
        }
      });

      // 2. Budget allocation
      const activeDebts = debtsToPay.filter(d => d.remaining > 0);
      const totalMinRequired = activeDebts.reduce((sum, d) => sum + d.minPayment, 0);
      let availableBudget = totalMinRequired + extraPayment;

      // First pass: Make minimum payments
      const tempPayments: Record<string, number> = {};
      activeDebts.forEach(d => {
        const payment = Math.min(d.minPayment, d.remaining);
        tempPayments[d.id] = payment;
        availableBudget -= payment;
      });

      // Second pass: Apply leftover budget to the target debt (highest priority)
      if (availableBudget > 0 && activeDebts.length > 0) {
        // Target is the first debt in our sorted list
        const target = activeDebts[0];
        const extraApplied = Math.min(availableBudget, target.remaining - (tempPayments[target.id] || 0));
        tempPayments[target.id] = (tempPayments[target.id] || 0) + extraApplied;
        availableBudget -= extraApplied;
      }

      // Apply payments and record states
      debtsToPay.forEach(d => {
        const amountPaid = tempPayments[d.id] || 0;
        if (amountPaid > 0 || d.remaining > 0) {
          d.remaining = Math.max(d.remaining - amountPaid, 0);
          monthlyPayments.push({ debtName: d.name, amountPaid, remaining: d.remaining });

          // `Math.max(..., 0)` above only yields an exact 0 when the
          // subtraction lands exactly; drift makes `=== 0` unreliable.
          if (isSettled(d.remaining) && amountPaid > 0) {
            events.push(t('debt.planner.milestonePaid', { name: d.name }));
          }
        }
      });

      schedule.push({
        month,
        payments: monthlyPayments,
        events
      });
    }

    return {
      strategyName: strategy === 'snowball' ? t('debt.planner.snowballTitle') : t('debt.planner.avalancheTitle'),
      totalMonths: month,
      totalInterestPaid,
      schedule
    };
  }, [extraPayment, initialDebtParams, t]);

  const snowballResult = useMemo(() => runSimulation('snowball'), [runSimulation]);
  const avalancheResult = useMemo(() => runSimulation('avalanche'), [runSimulation]);

  const baselineResult = useMemo(() => {
    const debtsToPay = initialDebtParams.map(d => ({ ...d, remaining: d.balance }));
    if (debtsToPay.length === 0) {
      return { totalMonths: 0, totalInterestPaid: 0 };
    }
    let totalInterestPaid = 0;
    let month = 0;
    const maxMonths = 360;
    while (debtsToPay.some(d => d.remaining > 0) && month < maxMonths) {
      month++;
      debtsToPay.forEach(d => {
        if (d.remaining > 0 && d.interestRate > 0) {
          const monthlyRate = (d.interestRate / 100) / 12;
          const interest = d.remaining * monthlyRate;
          d.remaining += interest;
          totalInterestPaid += interest;
        }
      });
      const activeDebts = debtsToPay.filter(d => d.remaining > 0);
      activeDebts.forEach(d => {
        const payment = Math.min(d.minPayment, d.remaining);
        d.remaining = Math.max(d.remaining - payment, 0);
      });
    }
    return {
      totalMonths: month,
      totalInterestPaid
    };
  }, [initialDebtParams]);

  const fastestStrategy = useMemo(() => {
    if (snowballResult.totalMonths === avalancheResult.totalMonths) {
      return snowballResult.totalInterestPaid <= avalancheResult.totalInterestPaid ? snowballResult : avalancheResult;
    }
    return snowballResult.totalMonths < avalancheResult.totalMonths ? snowballResult : avalancheResult;
  }, [snowballResult, avalancheResult]);

  const totalMinRequiredPayments = useMemo(() => {
    return initialDebtParams.reduce((sum, d) => sum + d.minPayment, 0);
  }, [initialDebtParams]);

  if (activeOwedDebts.length === 0) {
    return (
      <div className="fin-card p-6 md:p-8 rounded-[2.5rem] bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/20 backdrop-blur-xl text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto">
          <span className="material-symbols-outlined text-4xl">celebration</span>
        </div>
        <h3 className="text-lg font-black text-emerald-700 dark:text-emerald-300">
          {t('debt.planner.payoffCongrats')}
        </h3>
        <p className="text-xs text-slate-400 font-bold max-w-sm mx-auto">
          {t('debt.planner.payoffCongratsSub')}
        </p>
      </div>
    );
  }

  return (
    <div className="fin-card p-6 md:p-8 rounded-[2.5rem] bg-white/80 dark:bg-[#1a1d21]/80 border border-slate-200/50 dark:border-white/10 backdrop-blur-xl shadow-xl space-y-6">
      {/* Title */}
      <div>
        <h3 className="text-xl font-black text-[#002b59] dark:text-blue-100 flex items-center gap-2">
          <span className="material-symbols-outlined text-rose-500">route</span>
          {t('debt.planner.title')}
        </h3>
        <p className="text-[10px] text-slate-400 font-bold mt-1">
          {t('debt.planner.subtitle')}
        </p>
      </div>

      {/* Inputs Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 border-y border-slate-100 dark:border-white/5 py-6">
        {/* Extra Monthly Payment Slider */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <label className="text-xs font-black text-[#002b59] dark:text-blue-100 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-emerald-500 text-sm">payments</span>
              {t('debt.planner.extraPaymentLabel')}
            </label>
            <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">
              {fmt(extraPayment)} {getCurrencySymbol()}
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="10000"
            step="100"
            value={extraPayment}
            onChange={(e) => setExtraPayment(Number(e.target.value))}
            className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
          />
          <p className="text-[9px] text-slate-400 font-bold">
            {t('debt.planner.extraPaymentDesc')}
          </p>
        </div>

        {/* Total Minimum Required Info */}
        <div className="p-4 bg-slate-50/50 dark:bg-slate-800/20 border border-slate-100 dark:border-white/5 rounded-2xl flex items-center justify-between gap-4">
          <div>
            <span className="text-[9px] text-slate-400 font-bold block uppercase">{t('debt.planner.totalMinRequired')}</span>
            <span className="text-lg font-black text-[#002b59] dark:text-blue-100">
              {fmt(totalMinRequiredPayments)} {getCurrencySymbol()} / {t('common.month') || 'شهر'}
            </span>
          </div>
          <div className="text-right">
            <span className="text-[9px] text-slate-400 font-bold block uppercase">{t('debt.planner.totalBudget')}</span>
            <span className="text-lg font-black text-emerald-600 dark:text-emerald-400">
              {fmt(totalMinRequiredPayments + extraPayment)} {getCurrencySymbol()} / {t('common.month') || 'شهر'}
            </span>
          </div>
        </div>
      </div>

      {/* Custom Parameters Table */}
      <div className="space-y-4">
        <h4 className="text-xs font-black text-[#002b59] dark:text-blue-100 flex items-center gap-1.5">
          <span className="material-symbols-outlined text-blue-500 text-sm">settings</span>
          {t('debt.planner.customParams')}
        </h4>
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead>
              <tr className="border-b border-slate-100 dark:border-white/5 text-slate-400">
                <th className="pb-3 pr-2">{t('debt.planner.tableName')}</th>
                <th className="pb-3 text-center">{t('debt.planner.tableRemaining')}</th>
                <th className="pb-3 text-center">{t('debt.planner.tableInterest')}</th>
                <th className="pb-3 text-center">{t('debt.planner.tableMinPay')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
              {activeOwedDebts.map(d => {
                const balance = d.total - d.paid;
                const rate = interestRates[d.id] ?? 0;
                const minPay = minPayments[d.id] ?? Math.max(Math.ceil(balance * 0.05), 100);

                return (
                  <tr key={d.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10">
                    <td className="py-3 pr-2 font-black text-slate-700 dark:text-slate-300">{d.name || d.person}</td>
                    <td className="py-3 text-center font-bold text-slate-500">{fmt(balance)} {getCurrencySymbol()}</td>
                    <td className="py-3 text-center">
                      <input
                        type="text"
                        inputMode="decimal"
                        dir="ltr"
                        autoComplete="off"
                        value={rate}
                        onChange={(e) => setInterestRates({ ...interestRates, [d.id]: parseNum(sanitizeNumericInput(e.target.value)) || 0 })}
                        onCompositionEnd={(e) => setInterestRates({ ...interestRates, [d.id]: parseNum(sanitizeNumericInput((e.target as HTMLInputElement).value)) || 0 })}
                        onBlur={(e) => setInterestRates({ ...interestRates, [d.id]: parseNum(sanitizeNumericInput(e.target.value)) || 0 })}
                        className="w-16 bg-slate-100 dark:bg-slate-800 border-none text-center font-black p-1.5 rounded-xl text-[#002b59] dark:text-white"
                      />
                    </td>
                    <td className="py-3 text-center">
                      <input
                        type="text"
                        inputMode="decimal"
                        dir="ltr"
                        autoComplete="off"
                        value={minPay}
                        onChange={(e) => setMinPayments({ ...minPayments, [d.id]: parseNum(sanitizeNumericInput(e.target.value)) || 0 })}
                        onCompositionEnd={(e) => setMinPayments({ ...minPayments, [d.id]: parseNum(sanitizeNumericInput((e.target as HTMLInputElement).value)) || 0 })}
                        onBlur={(e) => setMinPayments({ ...minPayments, [d.id]: parseNum(sanitizeNumericInput(e.target.value)) || 0 })}
                        className="w-20 bg-slate-100 dark:bg-slate-800 border-none text-center font-black p-1.5 rounded-xl text-[#002b59] dark:text-white"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Strategies Side-by-Side Comparison */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Snowball Strategy Card */}
        <div className={`p-5 rounded-3xl border transition-all ${
          fastestStrategy === snowballResult
            ? 'bg-blue-500/5 dark:bg-blue-500/10 border-blue-500/30 shadow-lg shadow-blue-500/5'
            : 'bg-slate-50/50 dark:bg-slate-800/10 border-slate-100 dark:border-white/5'
        } space-y-4`}>
          <div className="flex justify-between items-center">
            <h4 className="text-xs font-black text-[#002b59] dark:text-blue-100 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-blue-500 text-sm">child_care</span>
              {t('debt.planner.snowballTitle')}
            </h4>
            {fastestStrategy === snowballResult && (
              <span className="bg-blue-500 text-white text-[9px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest">
                {t('debt.planner.fastestBadge')}
              </span>
            )}
          </div>
          <div className="space-y-1">
            <span className="text-[10px] text-slate-400 font-bold block">{t('debt.planner.durationLabel')}</span>
            <span className="text-xl font-black text-[#002b59] dark:text-blue-100">
              {snowballResult.totalMonths} <span className="text-xs font-bold text-slate-400">{t('debt.planner.months')}</span>
            </span>
          </div>
          <div className="space-y-1">
            <span className="text-[10px] text-slate-400 font-bold block">{t('debt.planner.totalInterest')}</span>
            <span className="text-xl font-black text-rose-500">
              {fmt(snowballResult.totalInterestPaid)} {getCurrencySymbol()}
            </span>
          </div>
          {(baselineResult.totalMonths - snowballResult.totalMonths > 0 || baselineResult.totalInterestPaid - snowballResult.totalInterestPaid > 0) && (
            <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100 dark:border-white/5">
              {baselineResult.totalMonths - snowballResult.totalMonths > 0 && (
                <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[9px] font-black px-2.5 py-1 rounded-full flex items-center gap-1">
                  <span className="material-symbols-outlined text-[12px]">schedule</span>
                  {t('debt.planner.savedMonths', { count: baselineResult.totalMonths - snowballResult.totalMonths })}
                </span>
              )}
              {baselineResult.totalInterestPaid - snowballResult.totalInterestPaid > 0 && (
                <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[9px] font-black px-2.5 py-1 rounded-full flex items-center gap-1">
                  <span className="material-symbols-outlined text-[12px]">account_balance</span>
                  {t('debt.planner.savedInterest', { amount: `${fmt(baselineResult.totalInterestPaid - snowballResult.totalInterestPaid)} ${getCurrencySymbol()}` })}
                </span>
              )}
            </div>
          )}
          <p className="text-[10px] text-slate-400 font-bold leading-relaxed">
            {t('debt.planner.snowballDesc')}
          </p>
        </div>

        {/* Avalanche Strategy Card */}
        <div className={`p-5 rounded-3xl border transition-all ${
          fastestStrategy === avalancheResult
            ? 'bg-purple-500/5 dark:bg-purple-500/10 border-purple-500/30 shadow-lg shadow-purple-500/5'
            : 'bg-slate-50/50 dark:bg-slate-800/10 border-slate-100 dark:border-white/5'
        } space-y-4`}>
          <div className="flex justify-between items-center">
            <h4 className="text-xs font-black text-[#002b59] dark:text-blue-100 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-purple-500 text-sm">filter_hdr</span>
              {t('debt.planner.avalancheTitle')}
            </h4>
            {fastestStrategy === avalancheResult && (
              <span className="bg-purple-500 text-white text-[9px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest">
                {t('debt.planner.fastestBadge')}
              </span>
            )}
          </div>
          <div className="space-y-1">
            <span className="text-[10px] text-slate-400 font-bold block">{t('debt.planner.durationLabel')}</span>
            <span className="text-xl font-black text-[#002b59] dark:text-blue-100">
              {avalancheResult.totalMonths} <span className="text-xs font-bold text-slate-400">{t('debt.planner.months')}</span>
            </span>
          </div>
          <div className="space-y-1">
            <span className="text-[10px] text-slate-400 font-bold block">{t('debt.planner.totalInterest')}</span>
            <span className="text-xl font-black text-rose-500">
              {fmt(avalancheResult.totalInterestPaid)} {getCurrencySymbol()}
            </span>
          </div>
          {(baselineResult.totalMonths - avalancheResult.totalMonths > 0 || baselineResult.totalInterestPaid - avalancheResult.totalInterestPaid > 0) && (
            <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100 dark:border-white/5">
              {baselineResult.totalMonths - avalancheResult.totalMonths > 0 && (
                <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[9px] font-black px-2.5 py-1 rounded-full flex items-center gap-1">
                  <span className="material-symbols-outlined text-[12px]">schedule</span>
                  {t('debt.planner.savedMonths', { count: baselineResult.totalMonths - avalancheResult.totalMonths })}
                </span>
              )}
              {baselineResult.totalInterestPaid - avalancheResult.totalInterestPaid > 0 && (
                <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[9px] font-black px-2.5 py-1 rounded-full flex items-center gap-1">
                  <span className="material-symbols-outlined text-[12px]">account_balance</span>
                  {t('debt.planner.savedInterest', { amount: `${fmt(baselineResult.totalInterestPaid - avalancheResult.totalInterestPaid)} ${getCurrencySymbol()}` })}
                </span>
              )}
            </div>
          )}
          <p className="text-[10px] text-slate-400 font-bold leading-relaxed">
            {t('debt.planner.avalancheDesc')}
          </p>
        </div>
      </div>

      {/* Payoff Schedule timeline */}
      <div className="space-y-4">
        <h4 className="text-xs font-black text-[#002b59] dark:text-blue-100 flex items-center gap-1.5">
          <span className="material-symbols-outlined text-amber-500 text-sm">timeline</span>
          {t('debt.planner.timelineTitle')}
        </h4>
        <div className="p-5 bg-slate-50/50 dark:bg-slate-800/20 border border-slate-100 dark:border-white/5 rounded-3xl max-h-64 overflow-y-auto space-y-3">
          {fastestStrategy.schedule.map(s => {
            const milestoneEvents = s.events;
            if (milestoneEvents.length === 0) return null;

            return (
              <div key={s.month} className="flex gap-3 items-start">
                <div className="w-16 text-[10px] font-black text-[#002b59] dark:text-blue-200 bg-white dark:bg-slate-700 px-2 py-1 rounded-lg text-center shrink-0 border border-black/5 dark:border-white/5">
                  {t('debt.planner.timelineMonth', { month: s.month })}
                </div>
                <div className="space-y-1">
                  {milestoneEvents.map((evt, idx) => (
                    <p key={idx} className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                      {evt}
                    </p>
                  ))}
                </div>
              </div>
            );
          })}
          {fastestStrategy.schedule.length === 0 && (
            <p className="text-xs text-slate-400 font-bold text-center">{t('debt.planner.noEvents')}</p>
          )}
        </div>
      </div>
    </div>
  );
}
