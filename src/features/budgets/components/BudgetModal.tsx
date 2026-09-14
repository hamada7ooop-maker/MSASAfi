import React, { useState, useEffect, useRef } from 'react';
import { useI18n } from '../../../i18n/index';
import { useFormat } from '../../../core/hooks/useFormat';
import type { Budget, Category } from '../../../types';
import { toast } from '../../../toast';
import { useSettingsStore } from '../../../store/settingsStore';
import { useShallow } from 'zustand/react/shallow';

interface BudgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  budgetToEdit: Budget | null;
  categories: Category[];
  onSave: (data: Partial<Budget>) => Promise<void>;
}

export function BudgetModal({ isOpen, onClose, budgetToEdit, categories, onSave }: BudgetModalProps) {
  const { t, isLTR } = useI18n();
  const { parseNum, getCurrencySymbol, sanitizeNumericInput } = useFormat();
  const { isWorkHoursEnabled, hourlyRate, setIsWorkHoursEnabled } = useSettingsStore(
    useShallow((s) => ({
      isWorkHoursEnabled: s.isWorkHoursEnabled,
      hourlyRate: s.hourlyRate,
      setIsWorkHoursEnabled: s.setIsWorkHoursEnabled
    }))
  );

  const [name, setName] = useState('');
  const [limit, setLimit] = useState('');
  const [selectedCats, setSelectedCats] = useState<Set<string>>(new Set());
  const [rollover, setRollover] = useState(false);
  const wasOpenRef = useRef(false);

  useEffect(() => {
    if (isOpen) {
      if (!wasOpenRef.current) {
        wasOpenRef.current = true;
        if (budgetToEdit) {
          setName(budgetToEdit.name || '');
          setLimit(budgetToEdit.limit?.toString() || '');
          setRollover(!!budgetToEdit.rollover);
          const cats = budgetToEdit.categories && budgetToEdit.categories.length > 0 
            ? budgetToEdit.categories 
            : [budgetToEdit.category];
          setSelectedCats(new Set(cats));
        } else {
          setName('');
          setLimit('');
          setRollover(false);
          setSelectedCats(new Set());
        }
      }
    } else {
      wasOpenRef.current = false;
    }
  }, [isOpen, budgetToEdit]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const toggleCat = (catName: string) => {
    const next = new Set(selectedCats);
    if (next.has(catName)) {
      next.delete(catName);
    } else {
      next.add(catName);
    }
    setSelectedCats(next);
  };

  const handleSave = async () => {
    const numLimit = parseNum(limit);
    if (!name.trim()) {
      toast(t('bill.fillAll') || 'Please enter a name', 'error');
      return;
    }
    if (selectedCats.size === 0) {
      toast(t('bill.fillAll') || 'Please select at least one category', 'error');
      return;
    }
    if (!numLimit || numLimit <= 0) {
      toast(t('txn.errAmount') || 'Invalid limit', 'error');
      return;
    }

    const catsArr = Array.from(selectedCats);
    
    await onSave({
      name: name.trim(),
      limit: numLimit,
      categories: catsArr,
      category: catsArr[0], // fallback for legacy
      rollover
    });
    
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 z-[99990] flex items-end justify-center transition-opacity duration-300 animate-in fade-in"
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={onClose} aria-hidden="true" />
      <div 
        role="dialog"
        aria-modal="true"
        aria-labelledby="budget-modal-title"
        className="relative w-full max-w-[440px] bg-gradient-to-b from-white to-slate-50 dark:from-[#1c1f23] dark:to-[#141618] rounded-t-[32px] p-6 shadow-2xl animate-in slide-in-from-bottom-full duration-500"
      >
        <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto mb-6" aria-hidden="true"></div>

        <h3 id="budget-modal-title" className="text-xl font-black mb-6 text-slate-800 dark:text-white">
          {budgetToEdit ? (t('budget.editTitle') || 'تعديل الميزانية') : t('budget.addNew')}
        </h3>

        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
          {/* Name */}
          <div>
            <label className="text-[11px] uppercase font-black text-slate-400 mb-1 block">
              {t('goal.namePh')}
            </label>
            <input 
              value={name}
              onChange={(e) => setName(e.target.value)}
              onCompositionEnd={(e) => setName((e.target as HTMLInputElement).value)}
              onBlur={(e) => setName(e.target.value)}
              dir="auto"
              autoComplete="off"
              className="w-full bg-slate-100 dark:bg-slate-800 p-4 rounded-2xl border-none font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/30" 
              placeholder={t('goal.namePh')}
            />
          </div>

          {/* Categories */}
          <div>
            <label className="text-[11px] uppercase font-black text-slate-400 mb-2 block">
              {t('budget.selectCats')}
            </label>
            <div className="flex gap-2 flex-wrap">
              {categories.map((c) => {
                const isSel = selectedCats.has(c.name);
                return (
                  <button
                    key={c.name}
                    onClick={() => toggleCat(c.name)}
                    className={`px-4 py-2 rounded-full text-xs font-bold transition-all active:scale-95 ${
                      isSel 
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' 
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    {isLTR ? (c.nameEn || c.name) : t(c.name)}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Limit */}
          <div>
            <label className="text-[11px] uppercase font-black text-slate-400 mb-1 block">
              {t('budget.limitLabel')}
            </label>
            <div className="relative">
              <div className={`absolute inset-y-0 ${isLTR ? 'left-4' : 'right-4'} flex items-center pointer-events-none`}>
                <span className="text-slate-400 font-bold">{getCurrencySymbol()}</span>
              </div>
              <input 
                type="text" 
                inputMode="decimal"
                value={limit}
                onChange={(e) => setLimit(sanitizeNumericInput(e.target.value))}
                onCompositionEnd={(e) => setLimit(sanitizeNumericInput((e.target as HTMLInputElement).value))}
                onBlur={(e) => setLimit(sanitizeNumericInput(e.target.value))}
                dir="auto"
                autoComplete="off"
                className={`w-full bg-slate-100 dark:bg-slate-800 p-4 rounded-2xl border-none font-black text-2xl text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/30 ${isLTR ? 'pl-12' : 'pr-12'}`} 
                placeholder="0"
              />
            </div>
          </div>

          {/* Work Hours Metric Toggle */}
          <div className="flex flex-col items-center gap-2">
            <button 
              type="button"
              onClick={() => setIsWorkHoursEnabled(!isWorkHoursEnabled)}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-full border transition-all duration-300 ${
                isWorkHoursEnabled 
                ? 'bg-blue-600/10 text-blue-600 border-blue-600/20 shadow-sm' 
                : 'bg-slate-100 dark:bg-slate-800/50 text-slate-400 border-transparent opacity-60 hover:opacity-100'
              }`}
            >
              <span className={`material-symbols-outlined text-sm ${isWorkHoursEnabled ? 'animate-pulse' : ''}`}>
                hourglass_empty
              </span>
              <span className="text-[10px] font-black uppercase tracking-tight">
                {isWorkHoursEnabled ? t('common.enabled') : t('common.disabled')}
              </span>
            </button>

            {isWorkHoursEnabled && hourlyRate > 0 && parseNum(limit) > 0 && (
              <div className="animate-in zoom-in slide-in-from-top-2 duration-500 bg-[#002b59] dark:bg-blue-600 text-white px-4 py-2 rounded-2xl shadow-xl shadow-blue-900/20 flex items-center gap-3 w-full">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                  <span className="material-symbols-outlined text-sm">schedule</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[9px] font-bold opacity-70 uppercase tracking-widest leading-tight">{t('settings.hourlyRatePh')}</span>
                  <span className="text-sm font-black leading-tight">
                    {t('txn.workHours', { hours: (parseNum(limit) / hourlyRate).toFixed(1) })}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Rollover Toggle */}
          <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-white/5 flex items-center justify-between group transition-all">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="material-symbols-outlined text-blue-500 text-sm">history</span>
                <span className="text-xs font-black text-slate-700 dark:text-blue-100 uppercase tracking-wider">
                  {t('budget.rollover')}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-bold leading-relaxed pr-4">
                {t('budget.rolloverDesc')}
              </p>
            </div>
            <button 
              onClick={() => setRollover(!rollover)}
              className={`w-12 h-6 rounded-full relative transition-all duration-300 ${rollover ? 'bg-blue-600 shadow-lg shadow-blue-600/20' : 'bg-slate-200 dark:bg-slate-700'}`}
            >
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-300 shadow-sm ${rollover ? (isLTR ? 'left-7' : 'right-7') : (isLTR ? 'left-1' : 'right-1')}`}></div>
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 mt-8">
          <button 
            onClick={onClose}
            className="flex-1 py-4 rounded-2xl bg-slate-100 dark:bg-slate-800 font-bold text-slate-500 active:scale-95 transition-all"
          >
            {t('action.cancel')}
          </button>
          <button 
            onClick={handleSave}
            className="flex-1 py-4 rounded-2xl bg-blue-600 text-white font-bold active:scale-95 transition-all shadow-lg shadow-blue-500/30"
          >
            {t('action.save')}
          </button>
        </div>
      </div>
    </div>
  );
}
