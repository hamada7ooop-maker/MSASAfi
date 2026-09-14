import React, { useState } from 'react';
import { useBills } from '../hooks/useBills';
import { useI18n } from '../../../i18n/index';
import { useAppStore } from '../../../store/appStore';
import { useFormat } from '../../../core/hooks/useFormat';
import { useShallow } from 'zustand/react/shallow';
import { useIsMounted } from '../../../hooks/useIsMounted';
import type { Bill, Subscription } from '../../../types';
import { checkMilestone } from '../../../core/loyalty';
import { bridge } from '../../../core/AppBridge';
import { silentFail } from '../../../core/utils';
import { BillModal } from './BillModal';
import { SubModal } from './SubModal';

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
                <span className="material-symbols-outlined text-xl" aria-hidden="true">done_all</span>
              </button>
              <button onClick={handleBulkDelete} className="w-9 h-9 rounded-xl flex items-center justify-center text-rose-600 dark:text-rose-400 hover:bg-white dark:hover:bg-slate-700 transition-all" title={t('action.delete')}>
                <span className="material-symbols-outlined text-xl" aria-hidden="true">delete</span>
              </button>
              <button onClick={clearSelection} className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:bg-white dark:hover:bg-slate-700 transition-all" title={t('action.cancel')}>
                <span className="material-symbols-outlined text-xl" aria-hidden="true">close</span>
              </button>
            </div>
          ) : (
            <button onClick={() => tab === 'bills' ? (setEditingBill(undefined), setShowBillModal(true)) : (setEditingSub(undefined), setShowSubModal(true))}
              aria-label={tab === 'bills' ? (t('bill.add') || 'Add bill') : (t('bill.addSub') || 'Add subscription')}
              className="w-10 h-10 rounded-2xl bg-[#002b59] text-white flex items-center justify-center shadow-lg shadow-blue-500/30 active:scale-95 transition-all">
              <span className="material-symbols-outlined text-xl" aria-hidden="true">add</span>
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
            <span className="material-symbols-outlined text-5xl" aria-hidden="true">receipt_long</span>
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
                            <span className="material-symbols-outlined text-[10px]" aria-hidden="true">calendar_month</span>
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
                        <button onClick={() => markUnpaid(b.id)} aria-label={`${t('bill.markUnpaid') || 'Mark unpaid'}: ${b.name}`} className="w-9 h-9 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center transition-colors">
                          <span className="material-symbols-outlined text-base" aria-hidden="true">check_circle</span>
                        </button>
                      )}
                      <button onClick={() => { setEditingBill(b); setShowBillModal(true); }} aria-label={`${t('action.edit') || 'Edit'}: ${b.name}`} className="w-9 h-9 rounded-full bg-surface-container-low dark:bg-slate-800 text-blue-400 flex items-center justify-center hover:bg-blue-500/10 transition-all">
                        <span className="material-symbols-outlined text-base" aria-hidden="true">edit</span>
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
            <span className="material-symbols-outlined text-5xl" aria-hidden="true">subscriptions</span>
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
                      <button onClick={() => { setEditingSub(s); setShowSubModal(true); }} aria-label={`${t('action.edit') || 'Edit'}: ${s.name}`} className="w-9 h-9 rounded-full bg-surface-container-low dark:bg-slate-800 text-blue-400 flex items-center justify-center hover:bg-blue-500/10 transition-all">
                        <span className="material-symbols-outlined text-base" aria-hidden="true">edit</span>
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
