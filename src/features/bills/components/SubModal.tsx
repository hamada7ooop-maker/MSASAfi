import React, { useState } from 'react';
import { useI18n } from '../../../i18n/index';
import { useFormat } from '../../../core/hooks/useFormat';
import { useSettingsStore } from '../../../store/settingsStore';
import { useShallow } from 'zustand/react/shallow';
import { sanitizeNumericInput, sanitizeIntegerInput } from '../../../core/utils';
import type { Subscription } from '../../../types';

/**
 * Add / edit sheet for a recurring subscription.
 *
 * Extracted from Bills.tsx as part of L-1, same reasoning as BillModal: it was
 * already a discrete component, so this is a relocation rather than a rewrite.
 */
export function SubModal({
  sub, onSave, onDelete, onClose,
}: { sub?: Partial<Subscription>; onSave: (d: Partial<Subscription>) => void; onDelete?: (id: string) => void; onClose: () => void }) {
  const { t } = useI18n();
  const { parseNum } = useFormat();
  const { isWorkHoursEnabled, hourlyRate } = useSettingsStore(
    useShallow((s) => ({
      isWorkHoursEnabled: s.isWorkHoursEnabled,
      hourlyRate: s.hourlyRate
    }))
  );
  const [name, setName] = useState(sub?.name || '');
  const [amountStr, setAmountStr] = useState(sub?.amount ? String(sub.amount) : '');
  const [renewDate, setRenewDate] = useState(sub?.renewDate ? String(sub.renewDate) : '1');
  const [icon, setIcon] = useState(sub?.icon || 'subscriptions');

  const icons = [
    '📺', '🎵', '🎮', '☁️', '🛡️', '📰', '🍎', '🎨', '🚀', '🧠', '🏋️', '💖',
    '📱', '💻', '🛍️', '💄', '👕', '🚲', '🍕', '☕', '🥤', '🧘', '💆', '📸', '🍿', '🎟️'
  ];

  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleSave = () => {
    const numAmount = parseNum(amountStr);
    if (!name.trim() || numAmount <= 0) return;
    onSave({
      ...sub,
      name: name.trim(),
      amount: numAmount,
      renewDate,
      icon,
    });
    onClose();
  };

  const currentAmt = parseNum(amountStr);

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div className="relative bg-white dark:bg-[#1e2124] w-full max-w-lg rounded-[2.5rem] p-6 pb-12 shadow-2xl space-y-4 animate-in slide-in-from-bottom-8 duration-300 max-h-[90vh] overflow-y-auto">
        <div className="w-10 h-1 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto mb-2" />
        <h3 className="text-lg font-black dark:text-white">{sub?.id ? t('bill.editSubTitle') : t('bill.addSub')}</h3>

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
          placeholder={t('bill.subNamePh') || 'Subscription name'}
          className="w-full bg-slate-50 dark:bg-[#2a2d30] p-3 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-400 dark:text-white" 
        />

        <div className="flex gap-2">
          <div className="flex-1">
            <label className="text-[10px] text-slate-500 block mb-1 font-bold">{t('txn.amount')}</label>
            <input 
              type="text" 
              inputMode="decimal"
              dir="auto"
              value={amountStr} 
              onChange={e => setAmountStr(sanitizeNumericInput(e.target.value))}
              onCompositionEnd={e => setAmountStr(sanitizeNumericInput((e.target as HTMLInputElement).value))}
              onBlur={e => setAmountStr(sanitizeNumericInput(e.target.value))}
              placeholder="0.00"
              className="w-full bg-slate-50 dark:bg-[#2a2d30] p-3 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-400 dark:text-white" 
            />
          </div>
          <div className="flex-1">
            <label className="text-[10px] text-slate-500 block mb-1 font-bold">{t('bill.renewDay')}</label>
            <input 
              type="text" 
              inputMode="numeric"
              dir="auto"
              value={renewDate} 
              onChange={e => setRenewDate(sanitizeIntegerInput(e.target.value))}
              onCompositionEnd={e => setRenewDate(sanitizeIntegerInput((e.target as HTMLInputElement).value))}
              onBlur={e => setRenewDate(sanitizeIntegerInput(e.target.value))}
              className="w-full bg-slate-50 dark:bg-[#2a2d30] p-3 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-400 dark:text-white" 
            />
          </div>
        </div>

        {isWorkHoursEnabled && hourlyRate > 0 && currentAmt > 0 && (
          <div className="flex justify-center animate-in zoom-in duration-300">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-blue-600/10 text-blue-600 dark:text-blue-400 rounded-full border border-blue-600/20 shadow-sm">
              <span className="material-symbols-outlined text-sm animate-pulse" aria-hidden="true">hourglass_empty</span>
              <span className="text-[11px] font-black uppercase tracking-tight">
                {t('txn.workHours', { hours: (currentAmt / hourlyRate).toFixed(1) })}
              </span>
            </div>
          </div>
        )}

        <div className="flex gap-3 pt-2">
          {sub?.id && onDelete && (
            <div className="flex gap-2 items-center flex-1">
              {!confirmDelete ? (
                <button 
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  aria-label={t('action.delete') || 'Delete'}
                  className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center shrink-0 hover:bg-rose-500 hover:text-white transition-all"
                >
                  <span className="material-symbols-outlined" aria-hidden="true">delete</span>
                </button>
              ) : (
                <div className="flex-1 flex gap-2 animate-in fade-in slide-in-from-left-2 duration-300">
                  <button type="button" onClick={async () => {
                    await onDelete(sub.id!);
                    onClose();
                  }} className="flex-1 py-3 rounded-2xl bg-rose-500 text-white font-black text-[10px] uppercase">
                    {t('action.confirm') || 'Confirm Delete'}
                  </button>
                  <button type="button" onClick={() => setConfirmDelete(false)} aria-label={t('action.cancel') || 'Cancel'} className="px-4 py-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-500 font-bold text-[10px] uppercase">
                    <span className="material-symbols-outlined text-sm" aria-hidden="true">close</span>
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

