import React, { useState, useEffect, useRef } from 'react';
import { useI18n } from '../../../i18n/index';
import { useFormat } from '../../../core/hooks/useFormat';
import type { Goal, Account } from '../../../types';
import { toast } from '../../../toast';
import { useSettingsStore } from '../../../store/settingsStore';
import { useShallow } from 'zustand/react/shallow';

interface GoalModalProps {
  isOpen: boolean;
  onClose: () => void;
  goalToEdit: Goal | null;
  accounts: Account[];
  onSave: (data: Partial<Goal>) => Promise<void>;
}

const COMMON_ICONS = [
  '🎯', '🏠', '🚗', '✈️', '🛡️', '💍', '🎓', '🏖️', '🎁', '📱', '💻', '🚲', '👶', '🧘',
  '💰', '🏦', '📈', '🏢', '🏗️', '🛋️', '🎨', '🎭', '⚽', '🏀', '🎾', '🎳', '🎮', '🕹️',
  '👤', '💳', '🏥', '🛍️', '📄', '💸', '🤝', '💼', '📉', '🪙', '💵', '💶', '👔', '👗',
  '👜', '👞', '⌚', '💎', '🔐'
];

export function GoalModal({ isOpen, onClose, goalToEdit, accounts, onSave }: GoalModalProps) {
  const { t, isLTR } = useI18n();
  const { fmt, parseNum, getCurrencySymbol, sanitizeNumericInput } = useFormat();
  const { isWorkHoursEnabled, hourlyRate, setIsWorkHoursEnabled } = useSettingsStore(
    useShallow((s) => ({
      isWorkHoursEnabled: s.isWorkHoursEnabled,
      hourlyRate: s.hourlyRate,
      setIsWorkHoursEnabled: s.setIsWorkHoursEnabled
    }))
  );

  const [name, setName] = useState('');
  const [target, setTarget] = useState('');
  const [icon, setIcon] = useState('flag');
  const [accountId, setAccountId] = useState('');
  const wasOpenRef = useRef(false);

  useEffect(() => {
    if (isOpen) {
      if (!wasOpenRef.current) {
        wasOpenRef.current = true;
        if (goalToEdit) {
          setName(goalToEdit.name || '');
          setTarget(goalToEdit.target?.toString() || '');
          setIcon(goalToEdit.icon || 'flag');
          setAccountId(goalToEdit.accountId || '');
        } else {
          setName('');
          setTarget('');
          setIcon('flag');
          setAccountId(accounts.length > 0 ? accounts[0].id : '');
        }
      }
    } else {
      wasOpenRef.current = false;
    }
  }, [isOpen, goalToEdit, accounts]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSave = async () => {
    const numTarget = parseNum(target);
    if (!name.trim()) {
      toast(t('bill.fillAll') || 'Please enter a name', 'error');
      return;
    }
    if (!numTarget || numTarget <= 0) {
      toast(t('txn.errAmount') || 'Invalid target amount', 'error');
      return;
    }

    if (goalToEdit && goalToEdit.saved && goalToEdit.saved > numTarget) {
       toast(t('goal.targetLowErr') || 'Target cannot be less than saved amount', 'error');
       return;
    }

    await onSave({
      name: name.trim(),
      target: numTarget,
      icon,
      accountId: accountId || undefined
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
        aria-labelledby="goal-modal-title"
        className="relative w-full max-w-[440px] bg-gradient-to-b from-white to-slate-50 dark:from-[#1c1f23] dark:to-[#141618] rounded-t-[32px] p-6 shadow-2xl animate-in slide-in-from-bottom-full duration-500"
      >
        <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto mb-6" aria-hidden="true"></div>

        <h3 id="goal-modal-title" className="text-xl font-black mb-6 text-[#002b59] dark:text-blue-100">
          {goalToEdit ? t('goal.editTitle') : t('goal.newGoal')}
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
              className="w-full bg-slate-100 dark:bg-slate-800 p-4 rounded-2xl border-none font-bold text-[#002b59] dark:text-white outline-none focus:ring-2 focus:ring-blue-500/30" 
              placeholder={t('goal.namePh')}
            />
          </div>

          {/* Target Amount */}
          <div>
            <label className="text-[11px] uppercase font-black text-slate-400 mb-1 block">
              {t('goal.target')}
            </label>
            <div className="relative">
              <div className={`absolute inset-y-0 ${isLTR ? 'left-4' : 'right-4'} flex items-center pointer-events-none`}>
                <span className="text-slate-400 font-bold">{getCurrencySymbol()}</span>
              </div>
              <input 
                type="text" 
                inputMode="decimal"
                value={target}
                onChange={(e) => setTarget(sanitizeNumericInput(e.target.value))}
                onCompositionEnd={(e) => setTarget(sanitizeNumericInput((e.target as HTMLInputElement).value))}
                onBlur={(e) => setTarget(sanitizeNumericInput(e.target.value))}
                dir="auto"
                autoComplete="off"
                className={`w-full bg-slate-100 dark:bg-slate-800 p-4 rounded-2xl border-none font-black text-2xl text-[#002b59] dark:text-white outline-none focus:ring-2 focus:ring-blue-500/30 ${isLTR ? 'pl-12' : 'pr-12'}`} 
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

            {isWorkHoursEnabled && hourlyRate > 0 && parseNum(target) > 0 && (
              <div className="animate-in zoom-in slide-in-from-top-2 duration-500 bg-[#002b59] dark:bg-blue-600 text-white px-4 py-2 rounded-2xl shadow-xl shadow-blue-900/20 flex items-center gap-3 w-full">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                  <span className="material-symbols-outlined text-sm">schedule</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[9px] font-bold opacity-70 uppercase tracking-widest leading-tight">{t('settings.hourlyRatePh')}</span>
                  <span className="text-sm font-black leading-tight">
                    {t('txn.workHours', { hours: (parseNum(target) / hourlyRate).toFixed(1) })}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Linked Account */}
          {accounts.length > 0 && (
            <div>
              <label className="text-[11px] uppercase font-black text-slate-400 mb-1 block">
                {t('nav.accounts')}
              </label>
              <div className="relative">
                <select 
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  className="w-full bg-slate-100 dark:bg-slate-800 p-4 rounded-2xl border-none font-bold text-[#002b59] dark:text-white outline-none focus:ring-2 focus:ring-blue-500/30 appearance-none"
                >
                  <option value="">{t('common.selectAccount') || '-- None --'}</option>
                  {accounts.map(a => (
                    <option key={a.id} value={a.id}>{a.name} ({fmt(a.balance)})</option>
                  ))}
                </select>
                <div className={`absolute inset-y-0 ${isLTR ? 'right-4' : 'left-4'} flex items-center pointer-events-none`}>
                  <span className="material-symbols-outlined text-slate-400">expand_more</span>
                </div>
              </div>
            </div>
          )}

          {/* Icon Selection */}
          <div>
            <label className="text-[11px] uppercase font-black text-slate-400 mb-2 block">
              {t('settings.icon') || 'Icon'}
            </label>
            <div className="flex gap-2 flex-wrap">
              {COMMON_ICONS.map((ic) => (
                <button
                  key={ic}
                  onClick={() => setIcon(ic)}
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all active:scale-95 ${
                    icon === ic 
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30 ring-4 ring-blue-500/20' 
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  <span className="text-xl">{ic}</span>
                </button>
              ))}
            </div>
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
            className="flex-1 py-4 rounded-2xl bg-[#002b59] dark:bg-blue-600 text-white font-bold active:scale-95 transition-all shadow-lg shadow-blue-900/30 dark:shadow-blue-500/30"
          >
            {t('action.save')}
          </button>
        </div>
      </div>
    </div>
  );
}
