import React, { useState } from 'react';
import { useI18n } from '../../../../i18n/index';
import { useFormat } from '../../../../core/hooks/useFormat';
import type { SalaryAllowance, SalaryDeduction } from '../../../../types';
import { checkMilestone } from '../../../../core/loyalty';
import { toast } from '../../../../toast';

interface SalaryStructureCardProps {
  settings: Record<string, unknown>;
  updateSetting: (key: string, value: unknown) => void;
}

export function SalaryStructureCard({ settings, updateSetting }: SalaryStructureCardProps) {
  const { t, isLTR } = useI18n();
  const { fmt, parseNum, sanitizeNumericInput, sanitizeNameInput } = useFormat();

  // Load existing salary settings
  const [basicSalary, setBasicSalary] = useState<string>(() => {
    return settings.salaryBasic ? String(settings.salaryBasic) : '';
  });
  
  const [allowances, setAllowances] = useState<SalaryAllowance[]>(() => {
    return Array.isArray(settings.salaryAllowances) ? (settings.salaryAllowances as SalaryAllowance[]) : [];
  });

  const [deductions, setDeductions] = useState<SalaryDeduction[]>(() => {
    return Array.isArray(settings.salaryDeductions) ? (settings.salaryDeductions as SalaryDeduction[]) : [];
  });

  // Inputs for adding new allowance
  const [newAllowanceLabel, setNewAllowanceLabel] = useState('');
  const [newAllowanceAmount, setNewAllowanceAmount] = useState('');

  // Inputs for adding new deduction
  const [newDeductionLabel, setNewDeductionLabel] = useState('');
  const [newDeductionAmount, setNewDeductionAmount] = useState('');

  // Collapsible state
  const [isExpanded, setIsExpanded] = useState(false);

  // Calculate totals
  const totalAllowances = allowances.reduce((sum, item) => sum + (parseNum(item.amount) || 0), 0);
  const totalDeductions = deductions.reduce((sum, item) => sum + (parseNum(item.amount) || 0), 0);
  const calculatedNet = Math.max(0, (parseNum(basicSalary) || 0) + totalAllowances - totalDeductions);

  // Add allowance handler
  const handleAddAllowance = () => {
    if (!newAllowanceLabel.trim() || !newAllowanceAmount) return;
    const amountVal = parseNum(newAllowanceAmount) || 0;
    if (amountVal <= 0) return;

    const newItem: SalaryAllowance = {
      id: `allow-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      label: newAllowanceLabel.trim(),
      amount: amountVal
    };

    setAllowances(prev => [...prev, newItem]);
    setNewAllowanceLabel('');
    setNewAllowanceAmount('');
  };

  // Add deduction handler
  const handleAddDeduction = () => {
    if (!newDeductionLabel.trim() || !newDeductionAmount) return;
    const amountVal = parseNum(newDeductionAmount) || 0;
    if (amountVal <= 0) return;

    const newItem: SalaryDeduction = {
      id: `deduct-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      label: newDeductionLabel.trim(),
      amount: amountVal
    };

    setDeductions(prev => [...prev, newItem]);
    setNewDeductionLabel('');
    setNewDeductionAmount('');
  };

  // Remove allowance
  const handleRemoveAllowance = (id: string) => {
    setAllowances(prev => prev.filter(item => item.id !== id));
  };

  // Remove deduction
  const handleRemoveDeduction = (id: string) => {
    setDeductions(prev => prev.filter(item => item.id !== id));
  };

  // Save handler
  const handleSave = async () => {
    const basicVal = parseNum(basicSalary) || 0;
    
    // Save to settings
    await updateSetting('salaryBasic', basicVal);
    await updateSetting('salaryAllowances', allowances);
    await updateSetting('salaryDeductions', deductions);

    // Call checkMilestone to trigger Loyalty 2.0 reward
    await checkMilestone('SALARY_PLANNER');

    toast(t('settings.salarySaved') || 'Salary structure saved and calibrated successfully! 💰');
  };

  return (
    <div className="space-y-1 animate-in slide-in-from-bottom-4 duration-500">
      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500 px-1 mb-2">
        {t('settings.salaryTitle') || 'هيكل الراتب'}
      </p>

      <div className="bg-white/40 dark:bg-white/[0.02] backdrop-blur-md rounded-[1.75rem] overflow-hidden border border-white/20 dark:border-white/[0.05] shadow-[0_8px_32px_0_rgba(31,38,135,0.03)]">

        {/* Header Toggle */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-black/[0.01] dark:hover:bg-white/[0.01] transition-all duration-150 active:scale-[0.99] text-start"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500/10 to-teal-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 shadow-sm">
              <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>monetization_on</span>
            </div>
            <div>
              <p className="text-[13px] font-bold text-on-surface dark:text-white leading-tight truncate">
                {t('settings.salaryTitle') || 'هيكل الراتب'}
              </p>
              {!isExpanded && (
                <p className="text-[10px] text-blue-600 dark:text-blue-400 font-black mt-0.5">
                  {t('settings.salaryNet') || 'صافي'}: {fmt(calculatedNet)}
                </p>
              )}
            </div>
          </div>
          <span
            className="material-symbols-outlined text-slate-300 dark:text-slate-600 text-[20px] transition-transform duration-300"
            style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
          >
            expand_more
          </span>
        </button>

        {isExpanded && (
          <div className="border-t border-slate-100/70 dark:border-white/[0.04] divide-y divide-slate-100/70 dark:divide-white/[0.04] animate-in fade-in slide-in-from-top-2 duration-300">
            {/* Basic Salary */}
            <div className="px-4 py-3.5 flex flex-col gap-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                {t('settings.salaryBasic') || 'الراتب الأساسي'}
              </label>
              <div className="relative">
                <input
                  type="text"
                  inputMode="decimal"
                  dir="ltr"
                  autoComplete="off"
                  value={basicSalary}
                  onChange={(e) => setBasicSalary(sanitizeNumericInput(e.target.value))}
                  onCompositionEnd={(e) => setBasicSalary(sanitizeNumericInput((e.target as HTMLInputElement).value))}
                  onBlur={(e) => setBasicSalary(sanitizeNumericInput(e.target.value))}
                  className={`w-full bg-black/[0.02] dark:bg-white/[0.02] rounded-2xl px-4 py-3.5 text-base font-black text-slate-800 dark:text-white focus:ring-2 focus:ring-blue-500/20 outline-none border border-black/[0.03] dark:border-white/[0.03] transition-all ${isLTR ? 'pr-11' : 'pl-11'}`}
                  placeholder="0"
                />
                <span className={`absolute top-1/2 -translate-y-1/2 material-symbols-outlined text-blue-500 text-[20px] ${isLTR ? 'right-3.5' : 'left-3.5'}`} style={{ fontVariationSettings: "'FILL' 1" }}>
                  payments
                </span>
              </div>
            </div>

            {/* Allowances */}
            <div className="px-4 py-3.5 flex flex-col gap-2.5">
              <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
                {t('settings.salaryAllowances') || 'البدلات والمزايا'}
              </p>
              {allowances.length > 0 && (
                <div className="flex flex-col gap-1.5 animate-in fade-in duration-300">
                  {allowances.map((item) => (
                    <div key={item.id} className="flex items-center justify-between bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/10 rounded-2xl px-3.5 py-2.5">
                      <div>
                        <p className="text-[12px] font-bold text-slate-700 dark:text-slate-300">{item.label}</p>
                        <p className="text-[13px] font-black text-emerald-600 dark:text-emerald-400">+{fmt(item.amount)}</p>
                      </div>
                      <button
                        onClick={() => handleRemoveAllowance(item.id)}
                        className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-500/10 text-rose-500 flex items-center justify-center active:scale-90 transition-all"
                      >
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-1.5 sm:gap-2">
                <input
                  type="text"
                  dir="auto"
                  autoComplete="off"
                  placeholder={t('settings.salaryPlaceholderName') || 'الاسم'}
                  value={newAllowanceLabel}
                  onChange={(e) => setNewAllowanceLabel(sanitizeNameInput(e.target.value))}
                  onCompositionEnd={(e) => setNewAllowanceLabel(sanitizeNameInput((e.target as HTMLInputElement).value))}
                  onBlur={(e) => setNewAllowanceLabel(sanitizeNameInput(e.target.value))}
                  className="flex-1 min-w-0 bg-black/[0.02] dark:bg-white/[0.02] rounded-2xl px-3 sm:px-3.5 py-2.5 text-[12px] font-bold text-slate-800 dark:text-white outline-none border border-black/[0.03] dark:border-white/[0.03] focus:ring-2 focus:ring-emerald-500/20"
                />
                <input
                  type="text"
                  inputMode="decimal"
                  dir="ltr"
                  autoComplete="off"
                  placeholder={t('settings.salaryPlaceholderAmount') || 'المبلغ'}
                  value={newAllowanceAmount}
                  onChange={(e) => setNewAllowanceAmount(sanitizeNumericInput(e.target.value))}
                  onCompositionEnd={(e) => setNewAllowanceAmount(sanitizeNumericInput((e.target as HTMLInputElement).value))}
                  onBlur={(e) => setNewAllowanceAmount(sanitizeNumericInput(e.target.value))}
                  className="w-20 sm:w-24 shrink-0 min-w-0 bg-black/[0.02] dark:bg-white/[0.02] rounded-2xl px-2 sm:px-3 py-2.5 text-[12px] font-bold text-slate-800 dark:text-white outline-none border border-black/[0.03] dark:border-white/[0.03] focus:ring-2 focus:ring-emerald-500/20"
                />
                <button
                  onClick={handleAddAllowance}
                  className="w-10 h-10 sm:w-11 sm:h-11 shrink-0 bg-emerald-500 text-white rounded-2xl flex items-center justify-center active:scale-90 transition-all shadow-md shadow-emerald-500/20"
                >
                  <span className="material-symbols-outlined text-[20px]">add</span>
                </button>
              </div>
            </div>

            {/* Deductions */}
            <div className="px-4 py-3.5 flex flex-col gap-2.5">
              <p className="text-[10px] font-black uppercase tracking-widest text-rose-500 dark:text-rose-400">
                {t('settings.salaryDeductions') || 'الاستقطاعات'}
              </p>
              {deductions.length > 0 && (
                <div className="flex flex-col gap-1.5 animate-in fade-in duration-300">
                  {deductions.map((item) => (
                    <div key={item.id} className="flex items-center justify-between bg-rose-500/5 dark:bg-rose-500/10 border border-rose-500/10 rounded-2xl px-3.5 py-2.5">
                      <div>
                        <p className="text-[12px] font-bold text-slate-700 dark:text-slate-300">{item.label}</p>
                        <p className="text-[13px] font-black text-rose-600 dark:text-rose-400">-{fmt(item.amount)}</p>
                      </div>
                      <button
                        onClick={() => handleRemoveDeduction(item.id)}
                        className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-500/10 text-rose-500 flex items-center justify-center active:scale-90 transition-all"
                      >
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-1.5 sm:gap-2">
                <input
                  type="text"
                  dir="auto"
                  autoComplete="off"
                  placeholder={t('settings.salaryPlaceholderName') || 'الاسم'}
                  value={newDeductionLabel}
                  onChange={(e) => setNewDeductionLabel(sanitizeNameInput(e.target.value))}
                  onCompositionEnd={(e) => setNewDeductionLabel(sanitizeNameInput((e.target as HTMLInputElement).value))}
                  onBlur={(e) => setNewDeductionLabel(sanitizeNameInput(e.target.value))}
                  className="flex-1 min-w-0 bg-black/[0.02] dark:bg-white/[0.02] rounded-2xl px-3 sm:px-3.5 py-2.5 text-[12px] font-bold text-slate-800 dark:text-white outline-none border border-black/[0.03] dark:border-white/[0.03] focus:ring-2 focus:ring-rose-500/20"
                />
                <input
                  type="text"
                  inputMode="decimal"
                  dir="ltr"
                  autoComplete="off"
                  placeholder={t('settings.salaryPlaceholderAmount') || 'المبلغ'}
                  value={newDeductionAmount}
                  onChange={(e) => setNewDeductionAmount(sanitizeNumericInput(e.target.value))}
                  onCompositionEnd={(e) => setNewDeductionAmount(sanitizeNumericInput((e.target as HTMLInputElement).value))}
                  onBlur={(e) => setNewDeductionAmount(sanitizeNumericInput(e.target.value))}
                  className="w-20 sm:w-24 shrink-0 min-w-0 bg-black/[0.02] dark:bg-white/[0.02] rounded-2xl px-2 sm:px-3 py-2.5 text-[12px] font-bold text-slate-800 dark:text-white outline-none border border-black/[0.03] dark:border-white/[0.03] focus:ring-2 focus:ring-rose-500/20"
                />
                <button
                  onClick={handleAddDeduction}
                  className="w-10 h-10 sm:w-11 sm:h-11 shrink-0 bg-rose-500 text-white rounded-2xl flex items-center justify-center active:scale-90 transition-all shadow-md shadow-rose-500/20"
                >
                  <span className="material-symbols-outlined text-[20px]">add</span>
                </button>
              </div>
            </div>

            {/* Breakdown + Save */}
            <div className="px-4 py-4 bg-black/[0.01] dark:bg-white/[0.005] flex flex-col gap-3">
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-white/50 dark:bg-[#1a1d21]/60 rounded-2xl px-3 py-2.5 flex flex-col border border-black/[0.03] dark:border-white/[0.03] backdrop-blur-sm">
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">{t('settings.salaryTotalBasic') || 'الأساسي'}</span>
                  <span className="text-[13px] font-black text-slate-700 dark:text-slate-200 mt-0.5 leading-none">{fmt(Number(basicSalary) || 0)}</span>
                </div>
                <div className="bg-emerald-500/5 dark:bg-emerald-500/10 rounded-2xl px-3 py-2.5 flex flex-col border border-emerald-500/10">
                  <span className="text-[9px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">{t('settings.salaryTotalAllowances') || 'البدلات'}</span>
                  <span className="text-[13px] font-black text-emerald-600 dark:text-emerald-400 mt-0.5 leading-none">+{fmt(totalAllowances)}</span>
                </div>
                <div className="bg-rose-500/5 dark:bg-rose-500/10 rounded-2xl px-3 py-2.5 flex flex-col border border-rose-500/10">
                  <span className="text-[9px] font-black uppercase tracking-widest text-rose-500 dark:text-rose-400">{t('settings.salaryTotalDeductions') || 'الاستقطاع'}</span>
                  <span className="text-[13px] font-black text-rose-600 dark:text-rose-400 mt-0.5 leading-none">-{fmt(totalDeductions)}</span>
                </div>
              </div>

              <div className="bg-blue-500/5 dark:bg-blue-500/10 border border-blue-500/10 rounded-2xl px-4 py-3 flex items-center justify-between backdrop-blur-sm">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 shadow-sm">
                    <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>account_balance</span>
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">{t('settings.salaryNet') || 'الصافي'}</p>
                    <p className="text-[15px] font-black text-blue-600 dark:text-blue-400 mt-0.5 leading-none">{fmt(calculatedNet)}</p>
                  </div>
                </div>
                <button
                  onClick={handleSave}
                  className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-[11px] font-black shadow-md shadow-blue-600/20 active:scale-95 transition-all flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[18px]">save</span>
                  {t('settings.salarySave') || 'حفظ'}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
