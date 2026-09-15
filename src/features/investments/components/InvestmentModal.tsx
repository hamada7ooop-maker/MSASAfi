import React, { useState } from 'react';
import { useI18n } from '../../../i18n/index';
import { useFormat } from '../../../core/hooks/useFormat';
import { useSettingsStore } from '../../../store/settingsStore';
import { useShallow } from 'zustand/react/shallow';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../../core/db/core';
import type { Investment } from '../../../types';
import { INV_ICONS } from '../utils/investmentMeta';

/**
 * Directive 19 — deferred decomposition: the investment bottom sheet.
 *
 * Lifted verbatim from Investments.tsx — create/edit form with the type
 * selector, the work-hours toggle, the account linker and the two-step
 * in-modal delete. tests/unit/investmentsPage.test.tsx pins all of it
 * (titles, type selection, save gate, edit prefill, delete confirm).
 */

export function InvestmentModal({
  investment, onSave, onDelete, onClose
}: { investment?: Partial<Investment>; onSave: (d: Partial<Investment>) => void; onDelete?: (id: string) => void; onClose: () => void }) {
  const { t } = useI18n();
  const { fmt, parseNum, sanitizeNumericInput } = useFormat();
  const { isWorkHoursEnabled, hourlyRate, setIsWorkHoursEnabled } = useSettingsStore(
    useShallow((s) => ({
      isWorkHoursEnabled: s.isWorkHoursEnabled,
      hourlyRate: s.hourlyRate,
      setIsWorkHoursEnabled: s.setIsWorkHoursEnabled
    }))
  );
  const accounts = useLiveQuery(() => db.accounts.toArray()) || [];
  const [form, setForm] = useState<Partial<Investment>>(investment ?? {
    name: '', type: 'stocks', value: 0, cost: 0, icon: 'trending_up', accountId: ''
  });
  const [costStr, setCostStr] = useState(investment?.cost ? String(investment.cost) : '');
  const [valueStr, setValueStr] = useState(investment?.value ? String(investment.value) : '');
  const [confirmDelete, setConfirmDelete] = useState(false);

  const set = <K extends keyof Investment>(k: K, v: Investment[K]) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="fixed inset-0 z-[200] flex items-end justify-center transition-all animate-in fade-in duration-300">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onClose} aria-hidden="true" />
      <div className="relative bg-white dark:bg-[#1e2124] w-full max-w-lg rounded-t-[3rem] p-8 shadow-2xl space-y-6 animate-in slide-in-from-bottom-10 duration-500">
        <div className="w-12 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto mb-2 opacity-50" />
        
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-black dark:text-white flex items-center gap-2">
            <span className="material-symbols-outlined text-blue-500">account_balance_wallet</span>
            {investment?.id ? t('investment.edit') : t('investment.add')}
          </h3>
          <button aria-label={t('action.close') || 'Close'} onClick={onClose} className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
             <span className="material-symbols-outlined text-sm" aria-hidden="true">close</span>
          </button>
        </div>

        {/* Type selector */}
        <div className="grid grid-cols-3 gap-3">
          {(['stocks','crypto','real_estate','gold','reit','other'] as const).map(tp => (
            <button key={tp} onClick={() => { set('type', tp); set('icon', INV_ICONS[tp]); }}
              className={`flex flex-col items-center gap-2 p-4 rounded-[2rem] transition-all duration-300 ${form.type === tp ? 'bg-[#002b59] text-white shadow-lg shadow-blue-900/30 scale-105' : 'bg-slate-50 dark:bg-slate-800/50 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${form.type === tp ? 'bg-white/20' : 'bg-slate-200/50 dark:bg-slate-700/50'}`}>
                {(() => {
                  const icon = INV_ICONS[tp];
                  const isEmoji = /\p{Extended_Pictographic}/u.test(icon) || icon === '₿';
                  return (
                    <span className={isEmoji ? "text-xl" : "material-symbols-outlined text-xl"} style={isEmoji ? {} : { fontVariationSettings: "'FILL' 1" }}>
                      {icon}
                    </span>
                  );
                })()}
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest">{t(`investment.${tp}`) || tp}</span>
            </button>
          ))}
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-1 mb-1 block">{t('investment.namePlaceholder')}</label>
            <input 
              dir="auto"
              autoComplete="off"
              value={form.name || ''} 
              onChange={e => set('name', e.target.value)}
              onCompositionEnd={e => set('name', (e.target as HTMLInputElement).value)}
              onBlur={e => set('name', e.target.value)}
              placeholder="e.g. Apple Stocks"
              className="w-full bg-slate-50 dark:bg-[#2a2d30] p-4 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-400 dark:text-white border border-transparent dark:border-white/5" 
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] px-1 mb-1 block">{t('investment.cost')}</label>
              <input 
                type="text" 
                inputMode="decimal"
                dir="ltr"
                autoComplete="off"
                value={costStr} 
                onChange={e => {
                  const val = sanitizeNumericInput(e.target.value);
                  setCostStr(val);
                  set('cost', parseNum(val) || 0);
                }}
                onCompositionEnd={e => {
                  const val = sanitizeNumericInput((e.target as HTMLInputElement).value);
                  setCostStr(val);
                  set('cost', parseNum(val) || 0);
                }}
                onBlur={e => {
                  const val = sanitizeNumericInput(e.target.value);
                  setCostStr(val);
                  set('cost', parseNum(val) || 0);
                }}
                placeholder="0.00"
                className="w-full bg-slate-50 dark:bg-[#2a2d30] p-4 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-400 dark:text-white border border-transparent dark:border-white/5" 
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] px-1 mb-1 block">{t('investment.value')}</label>
              <input 
                type="text" 
                inputMode="decimal"
                dir="ltr"
                autoComplete="off"
                value={valueStr} 
                onChange={e => {
                  const val = sanitizeNumericInput(e.target.value);
                  setValueStr(val);
                  set('value', parseNum(val) || 0);
                }}
                onCompositionEnd={e => {
                  const val = sanitizeNumericInput((e.target as HTMLInputElement).value);
                  setValueStr(val);
                  set('value', parseNum(val) || 0);
                }}
                onBlur={e => {
                  const val = sanitizeNumericInput(e.target.value);
                  setValueStr(val);
                  set('value', parseNum(val) || 0);
                }}
                placeholder="0.00"
                className="w-full bg-slate-50 dark:bg-[#2a2d30] p-4 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-400 dark:text-white border border-transparent dark:border-white/5" 
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

            {isWorkHoursEnabled && hourlyRate > 0 && parseNum(costStr) > 0 && (
              <div className="animate-in zoom-in slide-in-from-top-2 duration-500 bg-[#002b59] dark:bg-blue-600 text-white px-4 py-2 rounded-2xl shadow-xl shadow-blue-900/20 flex items-center gap-3 w-full">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                  <span className="material-symbols-outlined text-sm">schedule</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[9px] font-bold opacity-70 uppercase tracking-widest leading-tight">{t('settings.hourlyRatePh')}</span>
                  <span className="text-sm font-black leading-tight">
                    {t('txn.workHours', { hours: (parseNum(costStr) / hourlyRate).toFixed(1) })}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Account Linker */}
          {!investment?.id && (
            <div>
              <label className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] px-1 mb-1 block">{t('investment.linkAccount')}</label>
              <select 
                value={form.accountId || ''} 
                onChange={e => set('accountId', e.target.value)}
                className="w-full bg-slate-50 dark:bg-[#2a2d30] p-4 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-400 dark:text-white border border-transparent dark:border-white/5 appearance-none"
              >
                <option value="">{t('common.selectAccount') || 'Don\'t deduct from balance'}</option>
                {accounts.map(acc => (
                  <option key={acc.id} value={acc.id}>{acc.name} ({fmt(acc.balance)})</option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="flex gap-4 pt-4">
          {investment?.id && onDelete && (
            <div className="flex gap-2 items-center flex-1">
              {!confirmDelete ? (
                <button aria-label={t('action.delete') || 'Delete'} 
                  onClick={() => setConfirmDelete(true)}
                  className="w-14 h-14 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center shrink-0 hover:bg-rose-500 hover:text-white transition-all"
                >
                  <span className="material-symbols-outlined" aria-hidden="true">delete</span>
                </button>
              ) : (
                <div className="flex-1 flex gap-2 animate-in fade-in slide-in-from-left-2 duration-300">
                  <button onClick={async () => {
                    await onDelete(investment.id!);
                    onClose();
                  }} className="flex-1 py-4 rounded-2xl bg-rose-500 text-white font-black text-[10px] uppercase">
                    {t('action.confirm') || 'Confirm Delete'}
                  </button>
                  <button aria-label={t('action.close') || 'Close'} onClick={() => setConfirmDelete(false)} className="px-4 py-4 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-500 font-bold text-[10px] uppercase">
                    <span className="material-symbols-outlined text-sm" aria-hidden="true">close</span>
                  </button>
                </div>
              )}
            </div>
          )}
          {!confirmDelete && (
            <>
              <button onClick={onClose} className="flex-1 py-4 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-sm hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                {t('action.cancel')}
              </button>
              <button onClick={() => { 
                const c = parseNum(costStr);
                const v = valueStr.trim() ? parseNum(valueStr) : c;
                if (form.name?.trim() && c > 0) { 
                  onSave({ ...form, name: form.name.trim(), cost: c, value: v }); 
                  onClose(); 
                } 
              }}
                className="flex-2 py-4 rounded-2xl bg-[#002b59] text-white font-black text-sm shadow-xl shadow-blue-900/30 hover:scale-[1.02] active:scale-95 transition-all">
                {t('action.save')}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

