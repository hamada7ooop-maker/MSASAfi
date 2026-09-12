import React, { useEffect } from 'react';
import { useI18n } from '../../../i18n';
import { useFormat } from '../../../core/hooks/useFormat';
import { useFocusTrap } from '../../../core/hooks/useFocusTrap';
import type { ChildAccount } from '../../../store/settingsStore';

interface EditChildModalProps {
  child: ChildAccount | null;
  name: string;
  age: string;
  allowance: string;
  period: 'daily' | 'weekly' | 'monthly';
  onNameChange: (val: string) => void;
  onAgeChange: (val: string) => void;
  onAllowanceChange: (val: string) => void;
  onPeriodChange: (val: 'daily' | 'weekly' | 'monthly') => void;
  onSave: () => void;
  onClose: () => void;
}

export function EditChildModal({
  child,
  name,
  age,
  allowance,
  period,
  onNameChange,
  onAgeChange,
  onAllowanceChange,
  onPeriodChange,
  onSave,
  onClose,
}: EditChildModalProps) {
  const { t } = useI18n();
  const { sanitizeNumericInput, sanitizeIntegerInput, sanitizeNameInput } = useFormat();
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
      aria-labelledby="edit-child-title"
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div 
        ref={containerRef}
        className="relative w-full sm:max-w-md bg-white dark:bg-[#1e2124] rounded-t-[2rem] sm:rounded-[2rem] p-6 shadow-2xl animate-in slide-in-from-bottom-full sm:slide-in-from-bottom-8"
      >
        <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto mb-6 sm:hidden" />
        
        <h3 id="edit-child-title" className="text-xl font-black text-slate-800 dark:text-white mb-6 text-center flex items-center justify-center gap-2">
          <span>🧸</span>
          <span>{t('family.monitored.editChild')}</span>
        </h3>

        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">{t('family.monitored.kidName')}</label>
              <input 
                type="text" 
                value={name}
                onChange={e => onNameChange(sanitizeNameInput(e.target.value))}
                onCompositionEnd={e => onNameChange(sanitizeNameInput((e.target as HTMLInputElement).value))}
                onBlur={e => onNameChange(sanitizeNameInput(e.target.value))}
                dir="auto"
                autoComplete="off"
                placeholder={t('family.monitored.kidNamePlaceholder')}
                className="w-full bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 text-xs font-bold border-none outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">{t('family.monitored.kidAge')}</label>
              <input 
                type="text" 
                inputMode="numeric"
                value={age}
                onChange={e => onAgeChange(sanitizeIntegerInput(e.target.value))}
                onCompositionEnd={e => onAgeChange(sanitizeIntegerInput((e.target as HTMLInputElement).value))}
                onBlur={e => onAgeChange(sanitizeIntegerInput(e.target.value))}
                dir="auto"
                autoComplete="off"
                placeholder="8"
                className="w-full bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 text-xs font-bold border-none outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">{t('family.monitored.allowanceAmount')}</label>
              <input 
                type="text" 
                inputMode="decimal"
                value={allowance}
                onChange={e => onAllowanceChange(sanitizeNumericInput(e.target.value))}
                onCompositionEnd={e => onAllowanceChange(sanitizeNumericInput((e.target as HTMLInputElement).value))}
                onBlur={e => onAllowanceChange(sanitizeNumericInput(e.target.value))}
                dir="auto"
                autoComplete="off"
                placeholder="50"
                className="w-full bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 text-xs font-bold border-none outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">{t('family.monitored.allowancePeriod')}</label>
              <select 
                value={period}
                onChange={e => onPeriodChange(e.target.value as 'daily' | 'weekly' | 'monthly')}
                className="w-full bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 text-xs font-bold border-none outline-none focus:ring-1 focus:ring-amber-500 appearance-none"
              >
                <option value="daily">{t('family.monitored.periodDaily')}</option>
                <option value="weekly">{t('family.monitored.periodWeekly')}</option>
                <option value="monthly">{t('family.monitored.periodMonthly')}</option>
              </select>
            </div>
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
              onClick={onSave}
              className="flex-1 py-3.5 rounded-2xl bg-amber-600 text-white font-black text-xs active:scale-95 transition-all shadow-lg shadow-amber-600/30 cursor-pointer"
            >
              {t('action.save')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
