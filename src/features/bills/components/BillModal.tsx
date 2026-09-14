import React, { useState } from 'react';
import { useI18n } from '../../../i18n/index';
import { useFormat } from '../../../core/hooks/useFormat';
import { useSettingsStore } from '../../../store/settingsStore';
import { useShallow } from 'zustand/react/shallow';
import { sanitizeNumericInput } from '../../../core/utils';
import type { Bill } from '../../../types';

/**
 * Add / edit sheet for a one-off or recurring bill.
 *
 * Extracted from Bills.tsx (699 lines) as part of L-1. It was already a
 * self-contained component living inside that file; moving it out is a pure
 * relocation -- its props, state and markup are unchanged, so the page and the
 * sheet cannot drift apart the way two copies of a form would.
 */
export function BillModal({
  bill, onSave, onDelete, onClose,
}: { bill?: Partial<Bill>; onSave: (d: Partial<Bill>) => void; onDelete?: (id: string) => void; onClose: () => void }) {
  const { t } = useI18n();
  const { parseNum } = useFormat();
  const { isWorkHoursEnabled, hourlyRate, setIsWorkHoursEnabled } = useSettingsStore(
    useShallow((s) => ({
      isWorkHoursEnabled: s.isWorkHoursEnabled,
      hourlyRate: s.hourlyRate,
      setIsWorkHoursEnabled: s.setIsWorkHoursEnabled
    }))
  );
  const [name, setName] = useState(bill?.name || '');
  const [amountStr, setAmountStr] = useState(bill?.amount ? String(bill.amount) : '');
  const [dueDate, setDueDate] = useState(bill?.dueDate?.slice(0, 10) || new Date().toISOString().slice(0, 10));
  const [recurring, setRecurring] = useState(bill?.recurring || 'monthly');
  const [icon, setIcon] = useState(bill?.icon || 'receipt_long');

  const [confirmDelete, setConfirmDelete] = useState(false);
  const icons = [
    '⚡', '🏠', '🚗', '🛒', '🍔', '🏥', '🎓', '🌐', '📱', '💳', '📄', '💸',
    '💧', '🔥', '⛽', '📺', '🎵', '🎮', '🛋️', '🧺', '🧹', '🛁', '🛠️', '⚙️', '🛡️', '🔐'
  ];

  const handleSave = () => {
    const numAmount = parseNum(amountStr);
    if (!name.trim() || numAmount <= 0) return;
    onSave({
      ...bill,
      name: name.trim(),
      amount: numAmount,
      dueDate,
      recurring,
      icon,
    });
    onClose();
  };

  const currentAmt = parseNum(amountStr);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white dark:bg-[#1e2124] w-full max-w-lg rounded-[2.5rem] p-6 pb-12 shadow-2xl space-y-4 animate-in slide-in-from-bottom-8 duration-300 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="w-10 h-1 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto mb-2" />
        <h3 className="text-lg font-black dark:text-white">{bill?.id ? t('bill.edit') : t('bill.add')}</h3>

        <div className="flex gap-2 flex-wrap">
          {icons.map(ic => (
            <button key={ic} onClick={() => setIcon(ic)}
              className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl transition-all ${icon === ic ? 'bg-[#002b59] text-white scale-110 shadow-lg' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700'}`}>
              {ic}
            </button>
          ))}
        </div>

        <input 
          type="text"
          value={name} 
          onChange={e => setName(e.target.value)}
          onCompositionEnd={e => setName((e.target as HTMLInputElement).value)}
          onBlur={e => setName(e.target.value)}
          dir="auto"
          autoComplete="off"
          placeholder={t('bill.namePlaceholder') || 'Bill name'}
          className="w-full bg-slate-50 dark:bg-[#2a2d30] p-3 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-400 dark:text-white" 
        />

        <div className="flex gap-2">
          <input 
            type="text" 
            inputMode="decimal"
            dir="auto"
            value={amountStr} 
            onChange={e => setAmountStr(sanitizeNumericInput(e.target.value))}
            onCompositionEnd={e => setAmountStr(sanitizeNumericInput((e.target as HTMLInputElement).value))}
            onBlur={e => setAmountStr(sanitizeNumericInput(e.target.value))}
            placeholder={t('txn.amount') || 'Amount'}
            className="flex-1 bg-slate-50 dark:bg-[#2a2d30] p-3 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-400 dark:text-white" 
          />
          <input 
            type="date" 
            value={dueDate} 
            onChange={e => setDueDate(e.target.value)}
            className="flex-1 bg-slate-50 dark:bg-[#2a2d30] p-3 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-400 dark:text-white" 
          />
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

          {isWorkHoursEnabled && hourlyRate > 0 && currentAmt > 0 && (
            <div className="animate-in zoom-in slide-in-from-top-2 duration-500 bg-[#002b59] dark:bg-blue-600 text-white px-4 py-2 rounded-2xl shadow-xl shadow-blue-900/20 flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                <span className="material-symbols-outlined text-sm">schedule</span>
              </div>
              <div className="flex flex-col">
                <span className="text-[9px] font-bold opacity-70 uppercase tracking-widest leading-tight">{t('settings.hourlyRatePh')}</span>
                <span className="text-sm font-black leading-tight">
                  {t('txn.workHours', { hours: (currentAmt / hourlyRate).toFixed(1) })}
                </span>
              </div>
            </div>
          )}
        </div>

        <select 
          value={recurring} 
          onChange={e => setRecurring(e.target.value as NonNullable<Bill['recurring']>)}
          className="w-full bg-slate-50 dark:bg-[#2a2d30] p-3 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-400 dark:text-white"
        >
          <option value="daily">{t('bill.daily') || 'Daily'}</option>
          <option value="monthly">{t('bill.monthly') || 'Monthly'}</option>
          <option value="weekly">{t('bill.weekly') || 'Weekly'}</option>
          <option value="yearly">{t('bill.yearly') || 'Yearly'}</option>
        </select>

        <div className="flex gap-3 pt-2">
          {bill?.id && onDelete && (
            <div className="flex gap-2 items-center flex-1">
              {!confirmDelete ? (
                <button 
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center shrink-0 hover:bg-rose-500 hover:text-white transition-all"
                >
                  <span className="material-symbols-outlined">delete</span>
                </button>
              ) : (
                <div className="flex-1 flex gap-2 animate-in fade-in slide-in-from-left-2 duration-300">
                  <button type="button" onClick={async () => {
                    await onDelete(bill.id!);
                    onClose();
                  }} className="flex-1 py-3 rounded-2xl bg-rose-500 text-white font-black text-[10px] uppercase">
                    {t('action.confirm') || 'Confirm Delete'}
                  </button>
                  <button type="button" onClick={() => setConfirmDelete(false)} className="px-4 py-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-500 font-bold text-[10px] uppercase">
                    <span className="material-symbols-outlined text-sm">close</span>
                  </button>
                </div>
              )}
            </div>
          )}
          {!confirmDelete && (
            <>
              <button type="button" onClick={onClose} className="flex-1 py-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-sm">
                {t('action.cancel')}
              </button>
              <button 
                type="button" 
                onClick={handleSave}
                disabled={!name.trim() || currentAmt <= 0}
                className="flex-1 py-3 rounded-2xl bg-[#002b59] text-white font-black text-sm shadow-lg shadow-blue-900/20 disabled:opacity-50"
              >
                {t('action.save')}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

