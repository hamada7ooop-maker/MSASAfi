import React, { useState, useEffect } from 'react';
import { useRecurring } from '../hooks/useRecurring';
import { useI18n } from '../../../i18n/index';
import { useFormat } from '../../../core/hooks/useFormat';
import type { RecurringTransaction } from '../../../types';
import { db } from '../../../core/db/core';
import { detectSubscriptions, type DetectedSubscription } from '../../../ai';
import { toast } from '../../../toast';
import { silentFail } from '../../../core/utils';

export function RecurringTransactions() {
  const { t } = useI18n();
  const { fmt } = useFormat();
  const { 
    recurringTxns, 
    isLoading, 
    addRecurring,
    deleteRecurring, 
    toggleActive, 
    confirmRecurring, 
    skipRecurring, 
    postponeRecurring 
  } = useRecurring();

  const [activeTab, setActiveTab] = useState<'rules' | 'scheduler'>('rules');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  
  // State for postponement date inputs
  const [postponeDates, setPostponeDates] = useState<Record<string, string>>({});
  const [activePostponeId, setActivePostponeId] = useState<string | null>(null);

  // AI Discovered Subscriptions State
  const [discoveredSubs, setDiscoveredSubs] = useState<DetectedSubscription[]>([]);

  useEffect(() => {
    async function auditSubscriptions() {
      try {
        if (!db.transactions) return;
        const txs = await db.transactions.toArray();
        const detected = detectSubscriptions(txs);
        
        // Filter out those that are already in recurringTxns by matching description
        const existingDescs = recurringTxns.map(r => (r.description || '').toLowerCase().replace(/[\d\s\W]+/g, ''));
        const filtered = detected.filter(sub => {
          const subKey = (sub.description || '').toLowerCase().replace(/[\d\s\W]+/g, '');
          return !existingDescs.includes(subKey);
        });
        
        setDiscoveredSubs(filtered);
      } catch (err) {
        silentFail('[Subscription Audit] Error detecting subscriptions')(err);
      }
    }
    if (!isLoading) {
      auditSubscriptions();
    }
  }, [isLoading, recurringTxns]);

  if (isLoading) return (
    <div className="flex items-center justify-center p-20 animate-pulse text-slate-400">
      <span className="material-symbols-outlined animate-spin mr-2">progress_activity</span>
      {t('misc.loading') || 'Loading...'}
    </div>
  );

  const activeRules = recurringTxns.filter(r => r.isActive);
  
  // Sort recurring transactions by nextDate for the scheduler
  const sortedSchedulerTxns = [...recurringTxns]
    .filter(r => r.isActive)
    .sort((a, b) => new Date(a.nextDate).getTime() - new Date(b.nextDate).getTime());

  const handlePostponeSubmit = async (rt: RecurringTransaction) => {
    const selectedDate = postponeDates[rt.id];
    if (!selectedDate) return;
    await postponeRecurring(rt, selectedDate);
    setActivePostponeId(null);
    setPostponeDates(prev => {
      const copy = { ...prev };
      delete copy[rt.id];
      return copy;
    });
  };

  return (
    <div className="p-4 space-y-6 pb-32 animate-in fade-in duration-500">
      
      {/* Title Header */}
      <div className="flex items-center justify-between px-1 pt-2">
        <h2 className="text-2xl font-black text-[#002b59] dark:text-blue-100 flex items-center gap-2">
          <span className="material-symbols-outlined text-rose-500 text-3xl">autorenew</span>
          {t('title.recurring') || 'Recurring Transactions'}
        </h2>
      </div>

      {/* Premium Glassmorphic Tab Container */}
      <div className="backdrop-blur-md bg-white/60 dark:bg-[#1e2124]/60 border border-white/20 dark:border-slate-800/50 rounded-2xl p-1.5 flex gap-1 shadow-lg">
        <button
          onClick={() => setActiveTab('rules')}
          className={`flex-1 py-3 px-4 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 ${
            activeTab === 'rules'
              ? 'bg-[#002b59] dark:bg-blue-600 text-white shadow-md scale-[1.02]'
              : 'text-[#002b59] dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/40'
          }`}
        >
          <span className="material-symbols-outlined text-sm font-variation-fill">settings_suggest</span>
          {t('rec.tabs.rules') || 'Recurring Rules'}
        </button>
        <button
          onClick={() => setActiveTab('scheduler')}
          className={`flex-1 py-3 px-4 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 relative ${
            activeTab === 'scheduler'
              ? 'bg-[#002b59] dark:bg-blue-600 text-white shadow-md scale-[1.02]'
              : 'text-[#002b59] dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/40'
          }`}
        >
          <span className="material-symbols-outlined text-sm">schedule</span>
          {t('rec.tabs.scheduler') || 'Smart Scheduler ⏱️'}
          {activeRules.length > 0 && (
            <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[9px] w-5 h-5 rounded-full flex items-center justify-center font-bold border-2 border-white dark:border-[#131517]">
              {activeRules.length}
            </span>
          )}
        </button>
      </div>

      {/* Dynamic Tab View */}
      {activeTab === 'rules' ? (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
          
          {/* AI Automated Subscription Audit Panel */}
          {discoveredSubs.length > 0 && (
            <div className="relative group overflow-hidden p-5 rounded-[2rem] bg-gradient-to-br from-amber-500/10 to-indigo-500/10 dark:from-amber-950/20 dark:to-indigo-950/20 border border-amber-500/20 dark:border-amber-500/15 shadow-2xl backdrop-blur-md space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
              <div className="absolute -right-8 -top-8 w-24 h-24 bg-amber-500/10 rounded-full blur-2xl group-hover:scale-125 transition-transform duration-500"></div>
              <div className="absolute -left-8 -bottom-8 w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl group-hover:scale-125 transition-transform duration-500"></div>
              
              <div className="flex items-center gap-2.5 relative z-10">
                <span className="material-symbols-outlined text-amber-500 text-2xl animate-pulse">explore</span>
                <div>
                  <h4 className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-wide">
                    {t('recurring.smartAudit.title')}
                  </h4>
                  <p className="text-[9px] text-slate-400 font-bold">
                    {t('recurring.smartAudit.discoveredDesc', { count: discoveredSubs.length })}
                  </p>
                </div>
              </div>

              <div className="space-y-2 relative z-10">
                {discoveredSubs.map((sub, index) => (
                  <div key={index} className="p-4 rounded-2xl bg-white/60 dark:bg-slate-900/40 border border-white/20 dark:border-white/5 shadow-md flex justify-between items-center transition-all hover:scale-[1.01]">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-slate-800 text-lg flex items-center justify-center">
                        📱
                      </div>
                      <div>
                        <p className="font-black text-xs text-slate-800 dark:text-slate-100">{sub.description}</p>
                        <p className="text-[9px] text-slate-400 font-bold uppercase flex items-center gap-1 mt-0.5">
                          <span className="material-symbols-outlined text-[10px]">repeat</span>
                          {sub.period === 'weekly' ? t('recurring.smartAudit.weekly') : t('recurring.smartAudit.monthly')}
                          <span className="opacity-40">•</span>
                          <span className="material-symbols-outlined text-[10px]">wallet</span>
                          {sub.category || t('recurring.smartAudit.subscriptions')}
                        </p>
                      </div>
                    </div>

                    <div className="text-right flex items-center gap-3">
                      <div>
                        <p className="font-black text-xs text-slate-800 dark:text-white">
                          {fmt(sub.amount)} ر.س
                        </p>
                        <p className="text-[8px] font-black text-amber-500 uppercase tracking-wider">
                          {t('recurring.smartAudit.detectedPattern')}
                        </p>
                      </div>

                      <button 
                        onClick={async () => {
                          await addRecurring({
                            description: sub.description,
                            amount: sub.amount,
                            type: 'expense',
                            category: sub.category || 'اشتراكات',
                            frequency: sub.period,
                            nextDate: new Date().toISOString().slice(0, 10),
                            notes: 'AI Automated subscription discovery conversion'
                          });
                          toast(t('recurring.smartAudit.convertedToast', { name: sub.description }), 'success');
                          // Remove from local display state immediately
                          setDiscoveredSubs(prev => prev.filter((_, i) => i !== index));
                        }}
                        className="px-3 py-2 rounded-xl bg-[#002b59] dark:bg-blue-600 hover:bg-[#044a94] text-white text-[9px] font-black flex items-center gap-1 shadow-md transition-all active:scale-95 shrink-0"
                      >
                        <span className="material-symbols-outlined text-xs">receipt_long</span>
                        {t('recurring.smartAudit.convertToBill')}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Active Rules Count Card */}
          <div className="bg-gradient-to-br from-[#002b59] to-[#044a94] dark:from-blue-600 dark:to-indigo-700 rounded-[2rem] p-5 text-white shadow-xl shadow-blue-500/10">
            <p className="text-blue-100 text-xs font-bold uppercase tracking-widest mb-1">
              {t('recurring.active') || 'Active Subscriptions'}
            </p>
            <div className="flex items-baseline justify-between">
              <p className="text-4xl font-black">{activeRules.length}</p>
              <span className="material-symbols-outlined text-4xl opacity-30">settings_sync</span>
            </div>
          </div>

          {/* Rules List */}
          <div className="space-y-3">
            {recurringTxns.length === 0 ? (
              <div className="bg-white/60 dark:bg-[#1e2124]/60 backdrop-blur-md rounded-[2rem] p-8 text-center border border-white/20 dark:border-slate-800/50 shadow-md">
                <span className="material-symbols-outlined text-5xl text-slate-300 dark:text-slate-600 mb-2">event_repeat</span>
                <p className="font-bold text-slate-500 dark:text-slate-400">
                  {t('recurring.empty') || 'No recurring transactions set up.'}
                </p>
              </div>
            ) : (
              recurringTxns.map(tx => (
                <div 
                  key={tx.id} 
                  className={`bg-white/60 dark:bg-[#1e2124]/60 backdrop-blur-md rounded-2xl p-4 border border-white/20 dark:border-slate-800/50 shadow-sm flex items-center justify-between transition-all ${
                    !tx.isActive ? 'opacity-50 grayscale scale-[0.98]' : 'hover:scale-[1.01]'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <button 
                      onClick={() => toggleActive(tx.id, tx.isActive)}
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all active:scale-90 ${
                        tx.isActive 
                          ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400' 
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                      }`}
                      title={tx.isActive ? 'Deactivate' : 'Activate'}
                    >
                      <span className="material-symbols-outlined font-variation-fill" aria-hidden="true">
                        {tx.isActive ? 'check_circle' : 'pause_circle'}
                      </span>
                    </button>
                    <div className="min-w-0">
                      <p className="font-bold text-sm text-[#002b59] dark:text-white truncate">
                        {tx.description || tx.category}
                      </p>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest flex items-center gap-1 mt-0.5">
                        <span className="material-symbols-outlined text-xs">autorenew</span>
                        {tx.frequency} 
                        <span className="opacity-40">•</span> 
                        <span className="material-symbols-outlined text-xs">event</span>
                        Next: {tx.nextDate}
                      </p>
                    </div>
                  </div>

                  <div className="text-right flex items-center gap-3 shrink-0">
                    <div>
                      <p className="font-black text-sm text-[#002b59] dark:text-white">
                        {fmt(tx.amount)}
                      </p>
                      <p className={`text-[10px] font-bold uppercase tracking-wider ${
                        tx.type === 'income' ? 'text-green-500' : 'text-rose-500'
                      }`}>
                        {t(`type.${tx.type}`) || tx.type}
                      </p>
                    </div>
                    
                    {confirmDeleteId === tx.id ? (
                      <div className="flex gap-1 animate-in fade-in slide-in-from-right-2 duration-300">
                        <button aria-label={t('action.confirm') || 'Confirm'} 
                          onClick={async () => {
                            await deleteRecurring(tx.id);
                            setConfirmDeleteId(null);
                          }} 
                          className="w-8 h-8 rounded-lg bg-rose-500 text-white flex items-center justify-center shadow-lg active:scale-90 transition-all"
                        >
                          <span className="material-symbols-outlined text-sm font-bold" aria-hidden="true">check</span>
                        </button>
                        <button aria-label={t('action.close') || 'Close'} 
                          onClick={() => setConfirmDeleteId(null)} 
                          className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 flex items-center justify-center active:scale-90 transition-all"
                        >
                          <span className="material-symbols-outlined text-sm font-bold" aria-hidden="true">close</span>
                        </button>
                      </div>
                    ) : (
                      <button aria-label={t('action.delete') || 'Delete'} 
                        onClick={() => setConfirmDeleteId(tx.id)} 
                        className="w-8 h-8 rounded-lg text-red-400 dark:text-red-500/80 hover:bg-rose-50 dark:hover:bg-rose-950/20 flex items-center justify-center active:scale-90"
                      >
                        <span className="material-symbols-outlined text-[18px]" aria-hidden="true">delete</span>
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
          
          {/* Smart Scheduler Intro Card */}
          <div className="bg-gradient-to-br from-indigo-900 to-indigo-950 dark:from-[#1a1e29] dark:to-[#0f1118] rounded-[2rem] p-5 text-white border border-indigo-500/20 shadow-xl shadow-indigo-950/30">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-indigo-400 text-2xl animate-pulse">timer</span>
              </div>
              <div>
                <p className="font-black text-sm text-indigo-200">
                  {t('rec.manualScheduler') || 'Interactions & Controls'}
                </p>
                <p className="text-xs text-indigo-300/80 mt-1 leading-relaxed">
                  {t('rec.schedulerDesc') || 'Scheduled payments and salaries that require your confirmation, skipping, or postponement.'}
                </p>
              </div>
            </div>
          </div>

          {/* Scheduler List */}
          <div className="space-y-3">
            {sortedSchedulerTxns.length === 0 ? (
              <div className="bg-white/60 dark:bg-[#1e2124]/60 backdrop-blur-md rounded-[2rem] p-8 text-center border border-white/20 dark:border-slate-800/50 shadow-md">
                <span className="material-symbols-outlined text-5xl text-slate-300 dark:text-slate-600 mb-2">done_all</span>
                <p className="font-bold text-slate-500 dark:text-slate-400">
                  {t('common.noActive') || 'No active scheduled payments!'}
                </p>
              </div>
            ) : (
              sortedSchedulerTxns.map(tx => {
                const isPostponing = activePostponeId === tx.id;
                const nextDateObj = new Date(tx.nextDate);
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const isOverdue = nextDateObj.getTime() < today.getTime();

                return (
                  <div 
                    key={tx.id} 
                    className="bg-white/60 dark:bg-[#1e2124]/60 backdrop-blur-md rounded-2xl p-4 border border-white/20 dark:border-slate-800/50 shadow-sm space-y-4 hover:scale-[1.01] transition-all"
                  >
                    
                    {/* Top Info Section */}
                    <div className="flex items-start justify-between min-w-0">
                      <div className="min-w-0">
                        <span className={`inline-flex items-center gap-1 text-[9px] font-black uppercase px-2 py-0.5 rounded-full mb-1.5 ${
                          tx.type === 'income' 
                            ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400' 
                            : 'bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400'
                        }`}>
                          <span className="material-symbols-outlined text-[10px] font-variation-fill">
                            {tx.type === 'income' ? 'arrow_circle_up' : 'arrow_circle_down'}
                          </span>
                          {t(`type.${tx.type}`) || tx.type}
                        </span>
                        <p className="font-black text-base text-[#002b59] dark:text-white truncate">
                          {tx.description || tx.category}
                        </p>
                        <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 flex items-center gap-1 mt-1">
                          <span className="material-symbols-outlined text-xs">autorenew</span>
                          {tx.frequency}
                          <span className="opacity-40">•</span>
                          <span className="material-symbols-outlined text-xs">account_balance_wallet</span>
                          {tx.account || 'Wallet'}
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        <p className="font-black text-lg text-[#002b59] dark:text-white">
                          {fmt(tx.amount)}
                        </p>
                        <span className={`inline-flex items-center gap-0.5 text-[9px] font-bold mt-1 px-1.5 py-0.5 rounded ${
                          isOverdue 
                            ? 'bg-red-500/10 text-red-500' 
                            : 'bg-blue-500/10 text-blue-500 dark:text-blue-400'
                        }`}>
                          <span className="material-symbols-outlined text-[10px]">event</span>
                          {tx.nextDate}
                          {isOverdue && ' (Overdue)'}
                        </span>
                      </div>
                    </div>

                    {/* Inline Postponement Selector */}
                    {isPostponing && (
                      <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 p-3 rounded-xl flex items-center justify-between gap-3 animate-in slide-in-from-top-2 duration-200">
                        <div className="flex-1 min-w-0">
                          <label className="block text-[9px] font-black text-slate-400 uppercase mb-1">
                            {t('rec.newNextDate') || 'Choose New Date'}
                          </label>
                          <input
                            type="date"
                            value={postponeDates[tx.id] || tx.nextDate}
                            onChange={(e) => setPostponeDates(prev => ({ ...prev, [tx.id]: e.target.value }))}
                            className="bg-white dark:bg-[#1e2124] border border-slate-200 dark:border-slate-800 rounded-lg py-1 px-2 text-xs font-bold text-[#002b59] dark:text-white focus:outline-none focus:border-blue-500 w-full"
                          />
                        </div>
                        <div className="flex gap-1 shrink-0 mt-3.5">
                          <button
                            onClick={() => handlePostponeSubmit(tx)}
                            className="p-1.5 bg-emerald-500 text-white rounded-lg active:scale-95 transition-all shadow-md"
                            title="Confirm Postpone"
                          >
                            <span className="material-symbols-outlined text-sm font-bold" aria-hidden="true">check</span>
                          </button>
                          <button
                            onClick={() => setActivePostponeId(null)}
                            className="p-1.5 bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg active:scale-95 transition-all"
                            title="Cancel"
                          >
                            <span className="material-symbols-outlined text-sm font-bold" aria-hidden="true">close</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Glassmorphic Interaction Control Buttons */}
                    {!isPostponing && (
                      <div className="flex gap-2 pt-1 border-t border-slate-100 dark:border-slate-800/40">
                        
                        {/* Confirm Button */}
                        <button
                          onClick={() => confirmRecurring(tx)}
                          className="flex-1 py-2 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-black transition-all flex items-center justify-center gap-1 shadow-md shadow-emerald-500/10 active:scale-[0.98]"
                        >
                          <span className="material-symbols-outlined text-sm font-variation-fill">check_circle</span>
                          {t('rec.confirm') || 'Confirm'}
                        </button>

                        {/* Skip Button */}
                        <button
                          onClick={() => skipRecurring(tx)}
                          className="flex-1 py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-black transition-all flex items-center justify-center gap-1 shadow-md shadow-amber-500/10 active:scale-[0.98]"
                        >
                          <span className="material-symbols-outlined text-sm">skip_next</span>
                          {t('rec.skip') || 'Skip'}
                        </button>

                        {/* Postpone Button */}
                        <button
                          onClick={() => {
                            setPostponeDates(prev => ({ ...prev, [tx.id]: tx.nextDate }));
                            setActivePostponeId(tx.id);
                          }}
                          className="flex-1 py-2 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700/60 text-[#002b59] dark:text-slate-300 text-xs font-black transition-all flex items-center justify-center gap-1 active:scale-[0.98]"
                        >
                          <span className="material-symbols-outlined text-sm">calendar_month</span>
                          {t('rec.postpone') || 'Postpone'}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
