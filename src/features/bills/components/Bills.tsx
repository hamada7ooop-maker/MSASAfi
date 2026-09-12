import React, { useState } from 'react';
import { useBills } from '../hooks/useBills';
import { useI18n } from '../../../i18n/index';
import { useAppStore } from '../../../store/appStore';
import { useFormat } from '../../../core/hooks/useFormat';
import { useSettingsStore } from '../../../store/settingsStore';
import { useShallow } from 'zustand/react/shallow';
import { useIsMounted } from '../../../hooks/useIsMounted';
import type { Bill, Subscription } from '../../../types';
import { checkMilestone } from '../../../core/loyalty';
import { bridge } from '../../../core/AppBridge';
import { silentFail, sanitizeNumericInput, sanitizeIntegerInput } from '../../../core/utils';

// ─── Bill Modal ───────────────────────────────────────────────────────────────
function BillModal({
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

// ─── Subscription Modal ───────────────────────────────────────────────────────
function SubModal({
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
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white dark:bg-[#1e2124] w-full max-w-lg rounded-[2.5rem] p-6 pb-12 shadow-2xl space-y-4 animate-in slide-in-from-bottom-8 duration-300 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
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
              <span className="material-symbols-outlined text-sm animate-pulse">hourglass_empty</span>
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
                  className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center shrink-0 hover:bg-rose-500 hover:text-white transition-all"
                >
                  <span className="material-symbols-outlined">delete</span>
                </button>
              ) : (
                <div className="flex-1 flex gap-2 animate-in fade-in slide-in-from-left-2 duration-300">
                  <button type="button" onClick={async () => {
                    await onDelete(sub.id!);
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

// ─── Main Bills Page ──────────────────────────────────────────────────────────
export function Bills() {
  const { t } = useI18n();
  const { fmt } = useFormat();
  const isMounted = useIsMounted();
  const { 
    bills, subscriptions, upcoming, overdue, totalUnpaid, 
    isLoading, addBill, updateBill, deleteBill, markPaid, markUnpaid,
    addSubscription, updateSubscription, deleteSubscription, paySubscription,
    bulkDelete
  } = useBills();

  const { pendingAction, setPendingAction } = useAppStore(
    useShallow((s) => ({
      pendingAction: s.pendingAction,
      setPendingAction: s.setPendingAction
    }))
  );
  
  const [showBillModal, setShowBillModal] = useState(false);
  const [showSubModal, setShowSubModal] = useState(false);

  React.useEffect(() => {
    if (pendingAction === 'ADD_BILL') {
      setShowBillModal(true);
      setPendingAction(null);
    }
  }, [pendingAction, setPendingAction]);
  const [editingBill, setEditingBill] = useState<Bill | undefined>();
  const [editingSub, setEditingSub] = useState<Subscription | undefined>();
  const [tab, setTab] = useState<'bills' | 'subs'>('bills');

  const [holidays, setHolidays] = useState<{ date: string; localName: string; name: string }[]>([]);

  React.useEffect(() => {
    const fetchHolidays = async () => {
      try {
        const year = new Date().getFullYear();
        const res = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${year}/SA`);
        if (!res.ok) throw new Error('Failed to fetch holidays');
        const data = await res.json();
        if (Array.isArray(data) && isMounted.current) {
          const fetchedHolidays = data.map(h => ({
            date: h.date,
            localName: h.localName,
            name: h.name
          }));
          setHolidays(fetchedHolidays);
        }
      } catch (err) {
        silentFail('[Nager.Date API] Failed to fetch holidays')(err);
        if (isMounted.current) {
          const year = new Date().getFullYear();
          setHolidays([
            { date: `${year}-02-22`, localName: 'يوم التأسيس 🇸🇦', name: 'Founding Day 🇸🇦' },
            { date: `${year}-09-23`, localName: 'اليوم الوطني 🇸🇦', name: 'National Day 🇸🇦' },
          ]);
        }
      }
    };
    fetchHolidays();
  }, [isMounted]);

  // Multi-select State
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  if (isLoading) return (
    <div className="flex items-center justify-center p-20 animate-pulse text-slate-400">
      {t('misc.loading')}
    </div>
  );

  const isSelecting = selectedIds.size > 0;
  
  const toggleSelection = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const clearSelection = () => setSelectedIds(new Set());
  
  const selectAll = () => {
    const next = new Set<string>();
    if (tab === 'bills') bills.forEach(b => next.add(b.id));
    else subscriptions.forEach(s => next.add(s.id));
    setSelectedIds(next);
  };

  const handleBulkDelete = () => {
    if (!selectedIds.size) return;
    bridge.confirmSheet(
      t('bill.deleteMany', { n: String(selectedIds.size) }) || `Delete ${selectedIds.size} items?`,
      async () => {
        await bulkDelete(selectedIds);
        clearSelection();
      },
      t('action.delete') || 'حذف',
      t('action.cancel') || 'إلغاء'
    );
  };

  return (
    <div className="p-5 space-y-6 pb-32 animate-in fade-in duration-700">

      {/* Header */}
      <div className="flex items-center justify-between px-1">
        <div className="space-y-1">
          <h2 className="text-3xl text-premium-header text-[var(--color-primary)] dark:text-blue-100">
            {t('nav.bills') || 'Bills & Subs'}
          </h2>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></div>
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest opacity-70">
              {tab === 'bills' ? bills.length : subscriptions.length} {tab === 'bills' ? t('bill.activeBills') || 'Active Bills' : t('bill.activeSubs') || 'Active Subs'}
            </p>
          </div>
        </div>
        
        <div className="flex gap-2">
          {isSelecting ? (
            <div className="flex items-center gap-2 bg-surface-container-low dark:bg-slate-800 p-1 rounded-2xl border border-black/5 dark:border-white/5">
              <button onClick={selectAll} className="w-9 h-9 rounded-xl flex items-center justify-center text-blue-600 dark:text-blue-400 hover:bg-white dark:hover:bg-slate-700 transition-all" title={t('txn.all')}>
                <span className="material-symbols-outlined text-xl">done_all</span>
              </button>
              <button onClick={handleBulkDelete} className="w-9 h-9 rounded-xl flex items-center justify-center text-rose-600 dark:text-rose-400 hover:bg-white dark:hover:bg-slate-700 transition-all" title={t('action.delete')}>
                <span className="material-symbols-outlined text-xl">delete</span>
              </button>
              <button onClick={clearSelection} className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:bg-white dark:hover:bg-slate-700 transition-all" title={t('action.cancel')}>
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>
          ) : (
            <button onClick={() => tab === 'bills' ? (setEditingBill(undefined), setShowBillModal(true)) : (setEditingSub(undefined), setShowSubModal(true))}
              className="w-10 h-10 rounded-2xl bg-[#002b59] text-white flex items-center justify-center shadow-lg shadow-blue-500/30 active:scale-95 transition-all">
              <span className="material-symbols-outlined text-xl">add</span>
            </button>
          )}
        </div>
      </div>

      {isSelecting && (
        <div className="mx-1 px-4 py-2 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-between animate-in slide-in-from-top-2 duration-300">
          <p className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest">
            {selectedIds.size} {t('bill.bulkSelected') || 'Items Selected'}
          </p>
        </div>
      )}

      {/* Summary Card for Bills - Premium Glassmorphism */}
      {tab === 'bills' && bills.length > 0 && (
        <div className="relative overflow-hidden rounded-[40px] p-8 text-white bg-gradient-to-br from-[#002b59] to-[#1a4175] shadow-[0_32px_64px_-16px_rgba(0,43,89,0.4)] border border-white/20 group transition-all duration-700">
          <div className="absolute -top-12 -right-12 w-64 h-64 bg-white/10 rounded-full blur-[80px] animate-pulse"></div>
          
          <div className="relative z-10 w-full">
            <p className="text-[10px] uppercase tracking-[0.3em] opacity-60 font-black mb-3">
              {t('bill.totalDue') || 'Total Due'}
            </p>
            <h1 className="text-4xl font-black tracking-tighter tabular-nums drop-shadow-2xl mb-6">
              {fmt(totalUnpaid)}
            </h1>
            
            <div className="flex gap-3">
               <div className="bg-white/5 hover:bg-white/10 backdrop-blur-xl px-4 py-2 rounded-2xl flex flex-col gap-0.5 min-w-[90px] border border-white/5 transition-colors">
                  <p className="text-rose-300 text-[9px] font-black uppercase tracking-widest">{t('bill.overdue') || 'Overdue'}</p>
                  <p className="text-white font-black text-sm">{overdue.length}</p>
               </div>
               <div className="bg-white/5 hover:bg-white/10 backdrop-blur-xl px-4 py-2 rounded-2xl flex flex-col gap-0.5 min-w-[90px] border border-white/5 transition-colors">
                  <p className="text-blue-200 text-[9px] font-black uppercase tracking-widest">{t('bill.upcoming') || 'Upcoming'}</p>
                  <p className="text-white font-black text-sm">{upcoming.length}</p>
               </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex bg-surface-container-low dark:bg-slate-800/50 p-1.5 rounded-[1.5rem] mx-1 border border-black/5 dark:border-white/5">
        {(['bills', 'subs'] as const).map(tp => (
          <button key={tp} onClick={() => { setTab(tp); clearSelection(); }}
            className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${tab === tp ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-md' : 'text-slate-500'}`}>
            {tp === 'bills' ? (t('bill.bills') || 'Bills') : (t('bill.subs') || 'Subs')}
            <span className={`ms-2 px-1.5 py-0.5 rounded-lg text-[9px] ${tab === tp ? 'bg-blue-100 dark:bg-blue-900/40' : 'bg-slate-100 dark:bg-slate-800'}`}>
              {tp === 'bills' ? bills.length : subscriptions.length}
            </span>
          </button>
        ))}
      </div>

      {/* List */}
      {tab === 'bills' ? (
        bills.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-300">
            <span className="material-symbols-outlined text-5xl">receipt_long</span>
            <p className="text-sm font-bold">{t('bill.noBills') || 'No bills here'}</p>
            <button onClick={() => setShowBillModal(true)} className="text-xs text-blue-400 font-bold">
              {t('bill.addFirst') || '+ Add your first bill'}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {bills.map(b => {
              const due = new Date(b.dueDate);
              const daysLeft = Math.ceil((due.getTime() - new Date().getTime()) / 86400000);
              const isSelected = selectedIds.has(b.id);
              const billDateStr = new Date(b.dueDate).toISOString().slice(0, 10);
              const matchingHoliday = holidays.find(h => h.date === billDateStr);

              return (
                <div key={b.id} className="flex items-center mb-2">
                  {/* Selection Indicator */}
                  <div onClick={() => toggleSelection(b.id)} className={`overflow-hidden transition-all duration-300 flex items-center justify-center cursor-pointer shrink-0 ${isSelected || isSelecting ? 'w-10 opacity-100' : 'w-0 opacity-0'}`}>
                    <span className={`material-symbols-outlined text-2xl ${isSelected ? 'text-[#002b59] dark:text-blue-400 font-bold' : 'text-slate-200 dark:text-slate-700'}`}>
                      {isSelected ? 'check_circle' : 'radio_button_unchecked'}
                    </span>
                  </div>

                  {/* Bill Card */}
                  <div className={`w-full max-w-full min-w-0 flex-1 fin-card p-4 flex items-center justify-between transition-all group overflow-hidden ${isSelected ? 'border-[#002b59] ring-2 ring-[#002b59]/10' : 'hover:border-blue-500/20'} ${b.isPaid ? 'opacity-50' : ''}`}>
                    <div className="flex items-center gap-4 min-w-0 flex-1">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm border border-black/5 dark:border-white/5 transition-transform group-hover:scale-110 ${daysLeft <= 3 && !b.isPaid ? 'bg-rose-500/10 text-rose-500' : 'bg-surface-container-low text-[#002b59] dark:text-blue-200'}`}>
                        {(() => {
                          const icon = b.icon || 'receipt_long';
                          const isEmoji = /\p{Extended_Pictographic}/u.test(icon);
                          return (
                            <span className={isEmoji ? "text-2xl" : "material-symbols-outlined text-2xl"} style={isEmoji ? {} : { fontVariationSettings: "'FILL' 1" }}>
                              {icon}
                            </span>
                          );
                        })()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className={`font-black text-sm truncate group-hover:text-blue-600 transition-colors ${b.isPaid ? 'line-through text-slate-400' : 'dark:text-slate-100'}`} title={b.name}>{b.name}</p>
                        <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-0.5">
                          {b.isPaid ? t('bill.paid') : daysLeft > 0 ? `${t('bill.dueIn')} ${daysLeft} ${t('home.days')}` : t('bill.overdue')}
                        </p>
                        {!b.isPaid && matchingHoliday && (
                          <div className="mt-1.5 flex items-center gap-1 bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded-lg text-[9px] font-black w-fit animate-pulse">
                            <span className="material-symbols-outlined text-[10px]">calendar_month</span>
                            <span>{(t('bill.holidayConflict') || 'تداخل مع عطلة رسمية: {holiday}').replace('{holiday}', (useI18n().isLTR) ? matchingHoliday.name : matchingHoliday.localName)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <p className={`font-black text-base tabular-nums ${daysLeft <= 0 && !b.isPaid ? 'text-rose-500' : 'dark:text-slate-100'}`}>{fmt(b.amount)}</p>
                      {!b.isPaid ? (
                        <button onClick={() => markPaid(b.id)} className="bg-emerald-600 text-white px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20 active:scale-95 transition-all">{t('bill.markPaid') || 'Pay'}</button>
                      ) : (
                        <button onClick={() => markUnpaid(b.id)} className="w-9 h-9 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center transition-colors">
                          <span className="material-symbols-outlined text-base">check_circle</span>
                        </button>
                      )}
                      <button onClick={() => { setEditingBill(b); setShowBillModal(true); }} className="w-9 h-9 rounded-full bg-surface-container-low dark:bg-slate-800 text-blue-400 flex items-center justify-center hover:bg-blue-500/10 transition-all">
                        <span className="material-symbols-outlined text-base">edit</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )
      ) : (
        subscriptions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-300">
            <span className="material-symbols-outlined text-5xl">subscriptions</span>
            <p className="text-sm font-bold">{t('bill.noSubs') || 'No subscriptions here'}</p>
            <button onClick={() => setShowSubModal(true)} className="text-xs text-blue-400 font-bold">
              {t('bill.addFirst') || '+ Add your first subscription'}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {subscriptions.map(s => {
              const isSelected = selectedIds.has(s.id);

              return (
                <div key={s.id} className="flex items-center mb-2">
                  <div onClick={() => toggleSelection(s.id)} className={`overflow-hidden transition-all duration-300 flex items-center justify-center cursor-pointer shrink-0 ${isSelected || isSelecting ? 'w-10 opacity-100' : 'w-0 opacity-0'}`}>
                    <span className={`material-symbols-outlined text-2xl ${isSelected ? 'text-[#002b59] dark:text-blue-400 font-bold' : 'text-slate-200 dark:text-slate-700'}`}>
                      {isSelected ? 'check_circle' : 'radio_button_unchecked'}
                    </span>
                  </div>

                  <div className={`flex-1 fin-card p-4 flex items-center justify-between transition-all group ${isSelected ? 'border-[#002b59] ring-2 ring-[#002b59]/10' : 'hover:border-blue-500/20'}`}>
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-surface-container-low text-[#002b59] dark:text-blue-200 shadow-sm border border-black/5 dark:border-white/5 transition-transform group-hover:scale-110">
                        {(() => {
                          const icon = s.icon || 'subscriptions';
                          const isEmoji = /\p{Extended_Pictographic}/u.test(icon);
                          return (
                            <span className={isEmoji ? "text-2xl" : "material-symbols-outlined text-2xl"} style={isEmoji ? {} : { fontVariationSettings: "'FILL' 1" }}>
                              {icon}
                            </span>
                          );
                        })()}
                      </div>
                      <div className="min-w-0">
                        <p className="font-black text-sm truncate dark:text-slate-100 group-hover:text-blue-600 transition-colors">{s.name}</p>
                        <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-0.5">
                          {t('bill.renewsDay', { day: String(s.renewDate) }) || `Renews on day ${s.renewDate}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <p className="font-black text-base tabular-nums dark:text-slate-100">{fmt(s.amount)}</p>
                      <button onClick={() => paySubscription(s.id)} className="bg-blue-600 text-white px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-500/30 active:scale-95 transition-all">{t('bill.payNow') || 'Pay Now'}</button>
                      <button onClick={() => { setEditingSub(s); setShowSubModal(true); }} className="w-9 h-9 rounded-full bg-surface-container-low dark:bg-slate-800 text-blue-400 flex items-center justify-center hover:bg-blue-500/10 transition-all">
                        <span className="material-symbols-outlined text-base">edit</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      {/* Modals */}
      {showBillModal && (
        <BillModal
          bill={editingBill}
          onSave={async (d) => {
            if (editingBill?.id) await updateBill(editingBill.id, d);
            else {
              await addBill(d);
              checkMilestone('FIRST_BILL');
            }
          }}
          onDelete={deleteBill}
          onClose={() => { setShowBillModal(false); setEditingBill(undefined); }} />
      )}

      {showSubModal && (
        <SubModal
          sub={editingSub}
          onSave={async (d) => {
            if (editingSub?.id) await updateSubscription(editingSub.id, d);
            else {
              await addSubscription(d);
              checkMilestone('FIRST_RECURRING');
            }
          }}
          onDelete={deleteSubscription}
          onClose={() => { setShowSubModal(false); setEditingSub(undefined); }} />
      )}
    </div>
  );
}
