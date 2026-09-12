import React, { useState, useEffect, useRef } from 'react';
import { useI18n } from '../../../i18n/index';
import { useFormat } from '../../../core/hooks/useFormat';
import type { Debt, Account } from '../../../types';
import { toast } from '../../../toast';
import { useSettingsStore } from '../../../store/settingsStore';
import { useShallow } from 'zustand/react/shallow';

interface DebtModalProps {
  isOpen: boolean;
  onClose: () => void;
  debtToEdit: Debt | null;
  accounts: Account[];
  onSave: (data: Partial<Debt>) => Promise<void>;
}

const COMMON_ICONS = [
  '🏦', '👤', '💳', '🏠', '🚗', '🏥', '🎓', '🛍️', '📄', '💸', '🤝', '💼',
  '💰', '📈', '📉', '🪙', '💵', '💶', '👔', '👗', '👜', '👞', '⌚', '💎', '🔐', '🛡️'
];

export function DebtModal({ isOpen, onClose, debtToEdit, accounts, onSave }: DebtModalProps) {
  const { t, isLTR } = useI18n();
  const { fmt, parseNum, getCurrencySymbol, sanitizeNumericInput, sanitizeIntegerInput } = useFormat();
  const { isWorkHoursEnabled, hourlyRate, setIsWorkHoursEnabled } = useSettingsStore(
    useShallow((s) => ({
      isWorkHoursEnabled: s.isWorkHoursEnabled,
      hourlyRate: s.hourlyRate,
      setIsWorkHoursEnabled: s.setIsWorkHoursEnabled
    }))
  );

  const [type, setType] = useState<'owed' | 'lent'>('owed');
  const [name, setName] = useState('');
  const [person, setPerson] = useState('');
  const [total, setTotal] = useState('');
  const [icon, setIcon] = useState('account_balance');
  const [accountId, setAccountId] = useState('');
  const [isLoan, setIsLoan] = useState(false);
  const [interestRate, setInterestRate] = useState('');
  const [termMonths, setTermMonths] = useState('');
  const [interestType, setInterestType] = useState<'declining' | 'flat'>('declining');

  const wasOpenRef = useRef(false);

  useEffect(() => {
    if (isOpen && !wasOpenRef.current) {
      if (debtToEdit) {
        setType(debtToEdit.type as 'owed' | 'lent');
        setName(debtToEdit.name || '');
        setPerson(debtToEdit.person || '');
        setTotal(debtToEdit.total ? String(debtToEdit.total) : '');
        setIcon(debtToEdit.icon || 'account_balance');
        setAccountId(debtToEdit.accountId || '');
        setIsLoan(!!debtToEdit.interestRate || !!debtToEdit.termMonths);
        setInterestRate(debtToEdit.interestRate !== undefined ? String(debtToEdit.interestRate) : '');
        setTermMonths(debtToEdit.termMonths !== undefined ? String(debtToEdit.termMonths) : '');
        setInterestType(debtToEdit.interestType || 'declining');
      } else {
        setType('owed');
        setName('');
        setPerson('');
        setTotal('');
        setIcon('account_balance');
        setAccountId('');
        setIsLoan(false);
        setInterestRate('');
        setTermMonths('');
        setInterestType('declining');
      }
    }
    wasOpenRef.current = isOpen;
  }, [isOpen, debtToEdit]);

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
    const numTotal = parseNum(total);
    if (!name.trim()) {
      toast(t('bill.fillAll') || 'Please enter a description', 'error');
      return;
    }
    if (!person.trim()) {
      toast(t('bill.fillAll') || 'Please enter a person name', 'error');
      return;
    }
    if (!numTotal || numTotal <= 0) {
      toast(t('txn.errAmount') || 'Invalid total amount', 'error');
      return;
    }

    if (debtToEdit && debtToEdit.paid && debtToEdit.paid > numTotal) {
      toast(t('txn.errAmount') || 'Total cannot be less than already paid amount', 'error');
      return;
    }

    await onSave({
      type,
      name: name.trim(),
      person: person.trim(),
      total: numTotal,
      icon,
      accountId: accountId || undefined,
      interestRate: isLoan ? (parseNum(interestRate) || 0) : undefined,
      termMonths: isLoan ? Math.round(parseNum(termMonths) || 0) : undefined,
      interestType: isLoan ? interestType : undefined
    });
    
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 z-[99990] flex items-end justify-center bg-black/40 backdrop-blur-[2px] transition-opacity duration-300 animate-in fade-in"
      onClick={onClose}
    >
      <div 
        role="dialog"
        aria-modal="true"
        aria-labelledby="debt-modal-title"
        className="w-full max-w-[440px] bg-gradient-to-b from-white to-slate-50 dark:from-[#1c1f23] dark:to-[#141618] rounded-t-[32px] p-6 shadow-2xl animate-in slide-in-from-bottom-full duration-500"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto mb-6" aria-hidden="true"></div>

        <h3 id="debt-modal-title" className="text-xl font-black mb-6 text-slate-800 dark:text-white">
          {debtToEdit ? (t('debt.editTitle') || 'Edit Debt') : t('action.add')}
        </h3>

        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
          
          {/* Type Selection */}
          <div className="flex gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl">
            <button
              onClick={() => setType('owed')}
              className={`flex-1 py-3 rounded-xl text-sm font-black transition-all ${
                type === 'owed' 
                  ? 'bg-white dark:bg-slate-700 text-rose-600 dark:text-rose-400 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              {t('debt.owed')}
            </button>
            <button
              onClick={() => setType('lent')}
              className={`flex-1 py-3 rounded-xl text-sm font-black transition-all ${
                type === 'lent' 
                  ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              {t('debt.lent')}
            </button>
          </div>

          {/* Description & Person */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] uppercase font-black text-slate-400 mb-1 block">
                {t('debt.descPh')}
              </label>
              <input 
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onCompositionEnd={(e) => setName((e.target as HTMLInputElement).value)}
                onBlur={(e) => setName(e.target.value)}
                dir="auto"
                autoComplete="off"
                className="w-full bg-slate-100 dark:bg-slate-800 p-4 rounded-2xl border-none font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/30" 
                placeholder={t('debt.descPh')}
              />
            </div>
            <div>
              <label className="text-[11px] uppercase font-black text-slate-400 mb-1 block">
                {t('debt.person')}
              </label>
              <input 
                type="text"
                value={person}
                onChange={(e) => setPerson(e.target.value)}
                onCompositionEnd={(e) => setPerson((e.target as HTMLInputElement).value)}
                onBlur={(e) => setPerson(e.target.value)}
                dir="auto"
                autoComplete="off"
                className="w-full bg-slate-100 dark:bg-slate-800 p-4 rounded-2xl border-none font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/30" 
                placeholder={t('debt.person')}
              />
            </div>
          </div>

          {/* Total Amount */}
          <div>
            <label className="text-[11px] uppercase font-black text-slate-400 mb-1 block">
              {t('txn.amount')}
            </label>
            <div className="relative">
              <div className={`absolute inset-y-0 ${isLTR ? 'left-4' : 'right-4'} flex items-center pointer-events-none`}>
                <span className="text-slate-400 font-bold">{getCurrencySymbol()}</span>
              </div>
              <input 
                type="text" 
                inputMode="decimal"
                dir="auto"
                value={total}
                onChange={(e) => setTotal(sanitizeNumericInput(e.target.value))}
                onCompositionEnd={(e) => setTotal(sanitizeNumericInput((e.target as HTMLInputElement).value))}
                onBlur={(e) => setTotal(sanitizeNumericInput(e.target.value))}
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

            {isWorkHoursEnabled && hourlyRate > 0 && parseNum(total) > 0 && (
              <div className="animate-in zoom-in slide-in-from-top-2 duration-500 bg-[#002b59] dark:bg-blue-600 text-white px-4 py-2 rounded-2xl shadow-xl shadow-blue-900/20 flex items-center gap-3 w-full">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                  <span className="material-symbols-outlined text-sm">schedule</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[9px] font-bold opacity-70 uppercase tracking-widest leading-tight">{t('settings.hourlyRatePh')}</span>
                  <span className="text-sm font-black leading-tight">
                    {t('txn.workHours', { hours: (parseNum(total) / hourlyRate).toFixed(1) })}
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
                  className="w-full bg-slate-100 dark:bg-slate-800 p-4 rounded-2xl border-none font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/30 appearance-none"
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

          {/* Structured Loan Toggle */}
          <div className="flex items-center justify-between p-4 bg-slate-100/50 dark:bg-slate-850 rounded-2xl border border-black/5 dark:border-white/5">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-blue-500">percent</span>
              <span className="text-xs font-black text-slate-700 dark:text-slate-200">
                {t('debt.isLoan') || 'Loan with interest and schedule?'}
              </span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                checked={isLoan} 
                onChange={(e) => setIsLoan(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600 peer-checked:bg-blue-600"></div>
            </label>
          </div>

          {/* Structured Loan Details */}
          {isLoan && (
            <div className="p-4 bg-blue-500/5 rounded-2xl border border-blue-500/10 space-y-4 animate-in slide-in-from-top-2 duration-300">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] uppercase font-black text-slate-400 mb-1 block">
                    {t('debt.interestRate') || 'Interest Rate (%)'}
                  </label>
                  <input 
                    type="text"
                    inputMode="decimal"
                    dir="auto"
                    value={interestRate}
                    onChange={(e) => setInterestRate(sanitizeNumericInput(e.target.value))}
                    onCompositionEnd={(e) => setInterestRate(sanitizeNumericInput((e.target as HTMLInputElement).value))}
                    onBlur={(e) => setInterestRate(sanitizeNumericInput(e.target.value))}
                    className="w-full bg-slate-100 dark:bg-slate-800 p-3.5 rounded-xl border-none font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/30" 
                    placeholder="0.0"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase font-black text-slate-400 mb-1 block">
                    {t('debt.termMonths') || 'Term (Months)'}
                  </label>
                  <input 
                    type="text"
                    inputMode="numeric"
                    dir="auto"
                    value={termMonths}
                    onChange={(e) => setTermMonths(sanitizeIntegerInput(e.target.value))}
                    onCompositionEnd={(e) => setTermMonths(sanitizeIntegerInput((e.target as HTMLInputElement).value))}
                    onBlur={(e) => setTermMonths(sanitizeIntegerInput(e.target.value))}
                    className="w-full bg-slate-100 dark:bg-slate-800 p-3.5 rounded-xl border-none font-bold text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/30" 
                    placeholder="12"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] uppercase font-black text-slate-400 mb-1.5 block">
                  {t('debt.interestType') || 'Interest Type'}
                </label>
                <div className="flex gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setInterestType('declining')}
                    className={`flex-1 py-2 rounded-lg text-xs font-black transition-all ${
                      interestType === 'declining' 
                        ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm' 
                        : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                    }`}
                  >
                    {t('debt.declining') || 'Declining'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setInterestType('flat')}
                    className={`flex-1 py-2 rounded-lg text-xs font-black transition-all ${
                      interestType === 'flat' 
                        ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-sm' 
                        : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                    }`}
                  >
                    {t('debt.flat') || 'Flat'}
                  </button>
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
            className={`flex-1 py-4 rounded-2xl text-white font-bold active:scale-95 transition-all shadow-lg ${
              type === 'owed' ? 'bg-rose-600 shadow-rose-500/30' : 'bg-emerald-600 shadow-emerald-500/30'
            }`}
          >
            {t('action.save')}
          </button>
        </div>
      </div>
    </div>
  );
}
