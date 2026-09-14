import React from 'react';
import { useI18n } from '../../../i18n/index';
import { useFormat } from '../../../core/hooks/useFormat';
import { simulateRetirement } from '../../../ai';
import { parseNum, sanitizeNumericInput } from '../../../core/utils';

export interface NecessityStats {
  need: number;
  want: number;
  needPct: number;
  wantPct: number;
  total: number;
}

export interface RetirementSimulatorProps {
  /**
   * Need-vs-want split, used only by the 50/30/20 advice strip at the bottom
   * of this section. Optional because the advice is skipped when the user has
   * no categorised spending yet.
   */
  necessityStats: NecessityStats;
}

/**
 * The retirement / financial-freedom simulator.
 *
 * Extracted from AdvisorPage.tsx (930 lines) as part of L-1. All six inputs
 * and the derived figures live here because nothing outside this section reads
 * them -- hoisting them into the page was what gave it six useState calls it
 * never used elsewhere.
 *
 * The projection itself is NOT reimplemented: it delegates to
 * `simulateRetirement` in core/ai/calculator.ts, which applies the Fisher
 * equation for the real return rate. A second compounding implementation in a
 * presentational component is how two different answers to "when can I retire"
 * end up shipping in one app.
 */
export function RetirementSimulator({ necessityStats }: RetirementSimulatorProps) {
  const { t } = useI18n();
  const { fmt, getCurrencySymbol } = useFormat();

  const [currentAge, setCurrentAge] = React.useState(25);
  const [retireAge, setRetireAge] = React.useState(60);
  const [currentSavingsStr, setCurrentSavingsStr] = React.useState('10000');
  const currentSavings = parseNum(currentSavingsStr) || 0;
  const [monthlyContribution, setMonthlyContribution] = React.useState(2000);
  const [expectedReturn, setExpectedReturn] = React.useState(8);
  const [inflationRate, setInflationRate] = React.useState(3);

  const retirementPoints = React.useMemo(() => {
    if (retireAge <= currentAge) return [];
    return simulateRetirement({
      currentAge,
      retireAge,
      currentSavings,
      monthlyContribution,
      expectedReturn,
      inflationRate
    });
  }, [currentAge, retireAge, currentSavings, monthlyContribution, expectedReturn, inflationRate]);

  const finalPoints = retirementPoints[retirementPoints.length - 1];
  const finalBalance = finalPoints ? finalPoints.balance : 0;
  const finalConts = finalPoints ? finalPoints.contributions : 0;
  const interestEarned = Math.max(0, finalBalance - finalConts);

  return (
    <>
      {/* Comprehensive Retirement & Financial Freedom Simulator */}
      <section className="space-y-4">
        <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] px-2">
          {t('advisor.retirementTitle')}
        </h4>
        <div className="bg-white/40 dark:bg-[#1e2124]/40 backdrop-blur-xl rounded-[2.5rem] p-7 shadow-xl shadow-blue-900/5 border border-white/20 dark:border-white/5 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:scale-125 transition-transform duration-700">
             <span className="material-symbols-outlined" style={{ fontSize: '80px' }}>rocket_launch</span>
          </div>

          <div className="relative z-10 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 text-amber-500 dark:text-amber-400">
                <span className="material-symbols-outlined">query_stats</span>
                <span className="text-xs font-black uppercase tracking-widest">
                  {t('advisor.wealthSimulator')}
                </span>
              </div>
            </div>

            {/* Layout Split: Inputs & Premium Output Card */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Inputs */}
              <div className="space-y-4">
                {/* Ages */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                      {t('advisor.currentAge')} ({currentAge})
                    </label>
                    <input 
                      type="range" 
                      min="18" 
                      max="75" 
                      value={currentAge}
                      onChange={(e) => setCurrentAge(Number(e.target.value))}
                      className="w-full h-1 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                      {t('advisor.targetRetireAge')} ({retireAge})
                    </label>
                    <input 
                      type="range" 
                      min={currentAge + 1} 
                      max="90" 
                      value={retireAge}
                      onChange={(e) => setRetireAge(Number(e.target.value))}
                      className="w-full h-1 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                    />
                  </div>
                </div>

                {/* Savings / Contribution */}
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex justify-between">
                      <span>{t('advisor.currentSavings')}</span>
                      <span className="text-blue-500 font-bold">{fmt(currentSavings)} ر.س</span>
                    </label>
                    <input 
                      type="text" 
                      inputMode="decimal"
                      dir="ltr"
                      autoComplete="off"
                      value={currentSavingsStr}
                      onChange={(e) => setCurrentSavingsStr(sanitizeNumericInput(e.target.value))}
                      onCompositionEnd={(e) => setCurrentSavingsStr(sanitizeNumericInput((e.target as HTMLInputElement).value))}
                      onBlur={(e) => setCurrentSavingsStr(sanitizeNumericInput(e.target.value))}
                      className="w-full px-4 py-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex justify-between">
                      <span>{t('advisor.monthlyContribution')}</span>
                      <span className="text-amber-500 font-bold">{fmt(monthlyContribution)} ر.س</span>
                    </label>
                    <input 
                      type="range" 
                      min="100" 
                      max="50000" 
                      step="100"
                      value={monthlyContribution}
                      onChange={(e) => setMonthlyContribution(Number(e.target.value))}
                      className="w-full h-1 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                    />
                  </div>
                </div>

                {/* Rates */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex justify-between">
                      <span>{t('advisor.expectedReturn')}</span>
                      <span className="text-emerald-500 font-bold">{expectedReturn}%</span>
                    </label>
                    <input 
                      type="range" 
                      min="1" 
                      max="20" 
                      value={expectedReturn}
                      onChange={(e) => setExpectedReturn(Number(e.target.value))}
                      className="w-full h-1 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex justify-between">
                      <span>{t('advisor.expectedInflation')}</span>
                      <span className="text-rose-500 font-bold">{inflationRate}%</span>
                    </label>
                    <input 
                      type="range" 
                      min="0" 
                      max="10" 
                      value={inflationRate}
                      onChange={(e) => setInflationRate(Number(e.target.value))}
                      className="w-full h-1 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-rose-500"
                    />
                  </div>
                </div>
              </div>

              {/* Output Premium Glassmorphic Wealth Card */}
              <div className="p-6 rounded-[2.2rem] bg-gradient-to-br from-[#0b1622] to-[#122b49] border border-blue-500/10 text-white flex flex-col justify-between shadow-2xl relative overflow-hidden group">
                <div className="absolute -right-8 -top-8 w-24 h-24 bg-amber-500/10 rounded-full blur-2xl group-hover:scale-125 transition-transform duration-500"></div>
                
                <div className="space-y-1.5 relative z-10">
                  <p className="text-[9px] font-black text-amber-400 uppercase tracking-widest">
                    {t('advisor.expectedWealth')}
                  </p>
                  <h3 className="text-3xl font-black text-white leading-none tracking-tight">
                    {fmt(finalBalance)} <span className="text-xs font-bold text-slate-400">{getCurrencySymbol()}</span>
                  </h3>
                  <p className="text-[9px] text-slate-400 font-medium">
                    {t('advisor.inflationAdjusted').replace('{pct}', String(inflationRate))}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-6 relative z-10 pt-4 border-t border-white/5">
                  <div>
                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider">
                      {t('advisor.totalContributed')}
                    </span>
                    <p className="text-sm font-black text-white tabular-nums">
                      {fmt(finalConts)} ر.س
                    </p>
                  </div>
                  <div>
                    <span className="text-[8px] font-black text-amber-400 uppercase tracking-wider">
                      {t('advisor.compoundGrowth')}
                    </span>
                    <p className="text-sm font-black text-emerald-400 tabular-nums">
                      +{fmt(interestEarned)} ر.س
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Checkpoint Timeline */}
            {retirementPoints.length > 0 && (
              <div className="space-y-3 pt-2">
                <h6 className="text-[10px] font-black text-slate-400 uppercase tracking-wider px-1">
                  {t('advisor.financialMilestones')}
                </h6>
                <div className="grid grid-cols-4 gap-2">
                  {retirementPoints
                    .filter((_, idx, arr) => idx === 0 || idx === Math.floor(arr.length / 3) || idx === Math.floor(arr.length * 2 / 3) || idx === arr.length - 1)
                    .map((pt, idx) => (
                      <div key={idx} className="p-3 rounded-2xl bg-white/50 dark:bg-black/10 border border-white/40 dark:border-white/5 text-center">
                        <span className="text-[9px] font-black text-slate-400 block uppercase">
                          {t('advisor.ageLabel').replace('{n}', String(pt.age))}
                        </span>
                        <span className="text-xs font-black text-slate-800 dark:text-slate-200 mt-1 block tabular-nums">
                          {fmt(pt.balance)} ر.س
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Smart 50/30/20 Rule Retirement Advice */}
            <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/10 flex gap-3 items-start">
              <span className="material-symbols-outlined text-amber-500 text-lg mt-0.5">
                military_tech
              </span>
              <div className="flex-1 space-y-1">
                <h6 className="text-[10px] font-black text-amber-500 uppercase tracking-widest">
                  {t('advisor.earlyRetirementPlan')}
                </h6>
                <p className="text-xs font-medium text-slate-600 dark:text-slate-300 leading-relaxed">
                  {(() => {
                    const necessaryPct = necessityStats.needPct || 50;
                    const luxuryPct = necessityStats.wantPct || 30;
                    const savingsPct = 100 - (necessaryPct + luxuryPct);
                    
                    if (savingsPct < 20) {
                      return t('advisor.lowSavings')
                        .replace('{savings}', fmt(savingsPct))
                        .replace('{wealth}', fmt(finalBalance))
                        .replace('{luxury}', fmt(luxuryPct));
                    }
                    return t('advisor.goodSavings')
                      .replace('{savings}', fmt(savingsPct))
                      .replace('{wealth}', fmt(finalBalance));
                  })()}
                </p>
              </div>
            </div>

          </div>
        </div>
      </section>
    </>
  );
}
