import React, { useState, useEffect } from 'react';
import { useChallenges } from '../hooks/useChallenges';
import { useI18n } from '../../../i18n/index';
import { useFormat } from '../../../core/hooks/useFormat';
import { useAppStore } from '../../../store/appStore';
import type { Challenge } from '../../../types';
import { awardPoints } from '../../../core/loyalty';
import { AccountRepository } from '../../../core/db/repositories/accounts';
import { CategoryRepository } from '../../../core/db/repositories/categories';
import { TransactionRepository } from '../../../core/db/repositories/transactions';
import { useSettingsStore } from '../../../store/settingsStore';
import { useShallow } from 'zustand/react/shallow';
import { toast } from '../../../toast';
import { bridge } from '../../../core/AppBridge';
import { silentFail, parseNum, sanitizeIntegerInput } from '../../../core/utils';

function ChallengeModal({
  challenge, onSave, onClose
}: {
  challenge?: Partial<Challenge>;
  onSave: (data: Partial<Challenge>) => void;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const [form, setForm] = useState<Partial<Challenge>>(challenge ?? {
    name: '', duration: 7, progress: 0, reward: '🏆', icon: '💰'
  });
  const [durationStr, setDurationStr] = useState(challenge?.duration ? String(challenge.duration) : '7');
  const [progressStr, setProgressStr] = useState(challenge?.progress !== undefined ? String(challenge.progress) : '0');

  const set = <K extends keyof Challenge>(k: K, v: Challenge[K]) => setForm(f => ({ ...f, [k]: v }));

  const emojis = ['🏆', '🚀', '✅', '🛠️', '😉', '💪', '💎', '🌿', '🎉', '✨', '🚶', '💰', '🍔', '📊'];

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md" onClick={onClose}>
      <div className="bg-white dark:bg-[#1e2124] w-full max-w-lg rounded-[2.5rem] p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-300" onClick={e => e.stopPropagation()}>
        <div className="w-10 h-1 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto mb-2" />
        <h3 className="text-xl font-black dark:text-white flex items-center justify-between">
          {challenge?.id ? t('challenge.edit') || 'تعديل التحدي' : t('challenge.new') || 'تحدي جديد'}
        </h3>

        <div className="space-y-4">
          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 mb-1.5 block">{t('challenge.namePh') || 'اسم التحدي'}</label>
            <input 
              dir="auto"
              autoComplete="off"
              value={form.name || ''} 
              onChange={e => set('name', e.target.value)}
              onCompositionEnd={e => set('name', (e.target as HTMLInputElement).value)}
              onBlur={e => set('name', e.target.value)}
              placeholder={t('challenge.namePh') || 'أدخل اسم التحدي هنا...'}
              className="w-full bg-slate-50 dark:bg-[#2a2d30] p-4 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-400 dark:text-white transition-all" 
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 mb-1.5 block">{t('challenge.daysLabel') || 'المدة (أيام)'}</label>
              <input 
                type="text" 
                inputMode="numeric" 
                dir="ltr"
                autoComplete="off"
                value={durationStr} 
                onChange={e => {
                  const sanitized = sanitizeIntegerInput(e.target.value);
                  setDurationStr(sanitized);
                  set('duration', Math.max(1, Math.round(parseNum(sanitized))) || 7);
                }}
                onCompositionEnd={e => {
                  const val = sanitizeIntegerInput((e.target as HTMLInputElement).value);
                  setDurationStr(val);
                  set('duration', Math.max(1, Math.round(parseNum(val))) || 7);
                }}
                onBlur={e => {
                  const sanitized = sanitizeIntegerInput(e.target.value);
                  setDurationStr(sanitized);
                  set('duration', Math.max(1, Math.round(parseNum(sanitized))) || 7);
                }}
                className="w-full bg-slate-50 dark:bg-[#2a2d30] p-4 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-400 dark:text-white" 
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 mb-1.5 block">{t('misc.progress') || 'التقدم'} (%)</label>
              <input 
                type="text" 
                inputMode="numeric" 
                dir="ltr"
                autoComplete="off"
                value={progressStr} 
                onChange={e => {
                  const sanitized = sanitizeIntegerInput(e.target.value);
                  setProgressStr(sanitized);
                  set('progress', Math.min(100, Math.max(0, Math.round(parseNum(sanitized)))) || 0);
                }}
                onCompositionEnd={e => {
                  const val = sanitizeIntegerInput((e.target as HTMLInputElement).value);
                  setProgressStr(val);
                  set('progress', Math.min(100, Math.max(0, Math.round(parseNum(val)))) || 0);
                }}
                onBlur={e => {
                  const sanitized = sanitizeIntegerInput(e.target.value);
                  setProgressStr(sanitized);
                  set('progress', Math.min(100, Math.max(0, Math.round(parseNum(sanitized)))) || 0);
                }}
                className="w-full bg-slate-50 dark:bg-[#2a2d30] p-4 rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-400 dark:text-white" 
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 mb-2 block">{t('category.icon') || 'أيقونة التحدي'}</label>
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {emojis.map(emoji => (
                <button 
                  key={emoji}
                  onClick={() => set('icon', emoji)}
                  className={`w-12 h-12 shrink-0 rounded-2xl flex items-center justify-center text-xl transition-all ${
                    form.icon === emoji 
                      ? 'bg-amber-100 dark:bg-amber-900/30 shadow-sm border-2 border-amber-400 scale-110' 
                      : 'bg-slate-50 dark:bg-slate-800/50 border-2 border-transparent hover:scale-105'
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button onClick={onClose} className="flex-1 py-4 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-sm active:scale-95 transition-transform">
            {t('action.cancel') || 'إلغاء'}
          </button>
          <button onClick={() => { if (form.name) { onSave(form); onClose(); } }}
            className="flex-1 py-4 rounded-2xl bg-[#002b59] text-white font-black text-sm shadow-lg shadow-blue-900/20 active:scale-95 transition-transform">
            {t('action.save') || 'حفظ التحدي'}
          </button>
        </div>
      </div>
    </div>
  );
}

export function Challenges() {
  const { t, isLTR } = useI18n();
  const { fmt } = useFormat();
  const { challenges, isLoading, addChallenge, updateChallenge, deleteChallenge } = useChallenges();
  const baseCurrency = useSettingsStore((s) => s.baseCurrency);

  const [activeTab, setActiveTab] = useState<'custom' | 'week52' | 'nospend'>('custom');
  const [showModal, setShowModal] = useState(false);
  const [editingChal, setEditingChal] = useState<Partial<Challenge> | undefined>();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const { pendingAction, setPendingAction } = useAppStore(
    useShallow((s) => ({
      pendingAction: s.pendingAction,
      setPendingAction: s.setPendingAction
    }))
  );

  // 52-Week Saver State
  const [completedWeeks, setCompletedWeeks] = useState<number[]>([]);
  const [confirmWeekSave, setConfirmWeekSave] = useState<number | null>(null);

  // No-Spend Day State
  const [noSpendActive, setNoSpendActive] = useState(false);
  const [noSpendClaimed, setNoSpendClaimed] = useState(false);

  useEffect(() => {
    // Load 52-Week completed weeks
    const storedWeeks = localStorage.getItem('masarifi_week52_completed_weeks');
    if (storedWeeks) {
      try {
        setCompletedWeeks(JSON.parse(storedWeeks));
      } catch (e) {
        silentFail('[Challenges] Error parsing completed weeks')(e);
      }
    }

    // Load No-Spend Day state
    const todayStr = new Date().toISOString().split('T')[0];
    const activeDate = localStorage.getItem('masarifi_nospend_active_date');
    const claimedDate = localStorage.getItem('masarifi_nospend_claimed_date');
    
    setNoSpendActive(activeDate === todayStr);
    setNoSpendClaimed(claimedDate === todayStr);
  }, []);

  useEffect(() => {
    if (pendingAction === 'ADD_CHALLENGE') {
      setEditingChal(undefined);
      setShowModal(true);
      setPendingAction(null);
    }
  }, [pendingAction, setPendingAction]);

  if (isLoading) return (
    <div className="flex items-center justify-center p-20 animate-pulse text-slate-400">
      {t('misc.loading') || 'جاري التحميل...'}
    </div>
  );

  const activeChallenges = challenges.filter(c => !c.deleted);
  const isSelecting = selectedIds.size > 0;

  const toggleSelection = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const clearSelection = () => setSelectedIds(new Set());
  const selectAll = () => setSelectedIds(new Set(activeChallenges.map(c => c.id)));

  const handleBulkDelete = () => {
    if (!selectedIds.size) return;
    bridge.confirmSheet(
      t('challenge.deleteManyConfirm', { n: String(selectedIds.size) }) || `هل أنت متأكد من حذف تحديات التحديد؟`,
      async () => {
        for (const id of selectedIds) {
          await updateChallenge(id, { deleted: true });
        }
        clearSelection();
      },
      t('action.delete') || 'حذف',
      t('action.cancel') || 'إلغاء'
    );
  };

  const handleSave = async (data: Partial<Challenge>) => {
    if (editingChal?.id) {
      await updateChallenge(editingChal.id, data);
      if ((data.progress || 0) >= 100 && (editingChal.progress || 0) < 100) {
         await awardPoints('CHALLENGE_COMPLETED');
         try {
           bridge.fireConfetti?.();
         } catch {
           /* Confetti effect is non-critical UI decoration — silently fallback */
         }
      }
    } else {
      await addChallenge({ ...data, reward: '🏆', progress: data.progress || 0, deleted: false });
      if ((data.progress || 0) >= 100) {
        await awardPoints('CHALLENGE_COMPLETED');
        try {
          bridge.fireConfetti?.();
        } catch {
          /* Confetti effect is non-critical UI decoration — silently fallback */
        }
      }
    }
  };

  // 52-Week Actions
  const handleSaveWeek = async (week: number) => {
    try {
      const accounts = await AccountRepository.getAll();
      if (accounts.length === 0) {
        toast(t('account.noAccounts') || 'يرجى إضافة حساب أولاً لتسجيل المعاملات', 'error');
        setConfirmWeekSave(null);
        return;
      }
      const defaultAccount = accounts[0];
      const categories = await CategoryRepository.getAll();
      const savingsCat = categories.find(c => c.name.toLowerCase().includes('sav') || c.id.includes('sav')) || categories[0];

      // Add actual transaction
      const saveAmount = week * 10;
      await TransactionRepository.add({
        amount: saveAmount,
        type: 'income', // savings is recorded as positive transaction
        category: savingsCat?.id || 'income',
        accountId: defaultAccount?.id || '',
        description: t('challenge.week52.txDesc', { n: String(week) }),
        date: new Date().toISOString(),
        currency: baseCurrency || 'SAR'
      });

      const nextWeeks = [...completedWeeks, week];
      setCompletedWeeks(nextWeeks);
      localStorage.setItem('masarifi_week52_completed_weeks', JSON.stringify(nextWeeks));

      // Award XP
      await awardPoints('CHALLENGE_COMPLETED');
      toast(t('challenge.week52.successToast', { n: String(week), amount: fmt(saveAmount), curr: baseCurrency }), 'success');

      try {
        bridge.fireConfetti?.();
      } catch {
        /* Confetti effect is non-critical UI decoration — silently fallback */
      }

      setConfirmWeekSave(null);
    } catch (err) {
      silentFail('[Challenges] handleConfirmWeekSave error')(err);
      toast(t('common.error') || 'حدث خطأ غير متوقع', 'error');
    }
  };

  // No-Spend Day Actions
  const handleActivateNoSpend = () => {
    const todayStr = new Date().toISOString().split('T')[0];
    localStorage.setItem('masarifi_nospend_active_date', todayStr);
    setNoSpendActive(true);
    toast(t('challenge.noSpend.activatedToast'), 'success');
  };

  const handleVerifyNoSpend = async () => {
    try {
      const todayStr = new Date().toISOString().split('T')[0];
      const start = todayStr + 'T00:00:00.000Z';
      const end = todayStr + 'T23:59:59.999Z';

      const txns = await TransactionRepository.getByRange(start, end);
      const expenses = txns.filter(t => t.type === 'expense' && !t.isDeleted);

      if (expenses.length > 0) {
        toast(t('challenge.noSpend.failedToast'), 'error');
      } else {
        localStorage.setItem('masarifi_nospend_claimed_date', todayStr);
        setNoSpendClaimed(true);
        await awardPoints('CHALLENGE_COMPLETED');
        toast(t('challenge.noSpend.successToast'), 'success');
        try {
          bridge.fireConfetti?.();
        } catch {
          /* Confetti effect is non-critical UI decoration — silently fallback */
        }
      }
    } catch (err) {
      silentFail('[Challenges] handleVerifyNoSpend error')(err);
      toast(t('common.error') || 'حدث خطأ أثناء التحقق', 'error');
    }
  };

  return (
    <div className="p-5 space-y-6 pb-32 animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex items-center justify-between px-1">
        <div className="space-y-1">
          <h2 className="text-3xl text-premium-header text-[var(--color-primary)] dark:text-blue-100 flex items-center gap-2">
            {t('challenge.title')} 🏆
          </h2>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></div>
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest opacity-70">
              {activeTab === 'custom' && `${activeChallenges.length} ${t('challenge.activeChallenges')}`}
              {activeTab === 'week52' && t('challenge.completedWeeks', { n: String(completedWeeks.length) })}
              {activeTab === 'nospend' && (noSpendClaimed ? t('challenge.noSpendCompleted') : t('challenge.noSpendTitle'))}
            </p>
          </div>
        </div>
        
        {activeTab === 'custom' && (
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
              <button onClick={() => { setEditingChal(undefined); setShowModal(true); }}
                className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-lg shadow-amber-500/30 active:scale-95 transition-all">
                <span className="material-symbols-outlined text-xl">add</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex bg-surface-container-low dark:bg-slate-800/50 p-1.5 rounded-[1.5rem] mx-1 mb-2 relative overflow-hidden border border-black/5 dark:border-white/5">
        <div 
          className="absolute inset-y-1.5 bg-white dark:bg-slate-700 rounded-xl shadow-md transition-transform duration-300 ease-in-out"
          style={{
            width: 'calc(33.333% - 6px)',
            transform: `translateX(${
              activeTab === 'custom'
                ? '0%'
                : activeTab === 'week52'
                ? (isLTR ? '100%' : '-100%')
                : (isLTR ? '200%' : '-200%')
            })`
          }}
        ></div>
        <button 
          onClick={() => setActiveTab('custom')}
          className={`flex-1 relative z-10 py-2.5 text-[10px] font-black uppercase tracking-widest transition-colors ${
            activeTab === 'custom' ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500'
          }`}
        >
          🏆 {t('challenge.tabCustom')}
        </button>
        <button 
          onClick={() => setActiveTab('week52')}
          className={`flex-1 relative z-10 py-2.5 text-[10px] font-black uppercase tracking-widest transition-colors ${
            activeTab === 'week52' ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500'
          }`}
        >
          📅 {t('challenge.tab52Week')}
        </button>
        <button 
          onClick={() => setActiveTab('nospend')}
          className={`flex-1 relative z-10 py-2.5 text-[10px] font-black uppercase tracking-widest transition-colors ${
            activeTab === 'nospend' ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500'
          }`}
        >
          🛑 {t('challenge.tabNoSpend')}
        </button>
      </div>

      {/* Tab Content */}
      <div className="relative">
        
        {/* CUSTOM TAB */}
        {activeTab === 'custom' && (
          <div className="space-y-4 animate-in slide-in-from-right-8 duration-300">
            {isSelecting && (
              <div className="mx-1 px-4 py-2 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between animate-in slide-in-from-top-2 duration-300">
                <p className="text-[10px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-widest">
                  {t('challenge.bulkSelected', { n: String(selectedIds.size) })}
                </p>
              </div>
            )}

            {activeChallenges.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-300">
                <span className="material-symbols-outlined text-5xl">emoji_events</span>
                <p className="text-sm font-bold">{t('challenge.emptyTitle')}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {activeChallenges.map(c => {
                  const isSelected = selectedIds.has(c.id);
                  const progressPct = Math.min(100, Math.max(0, c.progress || 0));
                  const isCompleted = progressPct >= 100;

                  return (
                    <div key={c.id} className="flex items-center mb-2">
                      <div onClick={() => toggleSelection(c.id)} className={`overflow-hidden transition-all duration-300 flex items-center justify-center cursor-pointer shrink-0 ${isSelected || isSelecting ? 'w-10 opacity-100' : 'w-0 opacity-0'}`}>
                        <span className={`material-symbols-outlined text-2xl ${isSelected ? 'text-[#002b59] dark:text-blue-400 font-bold' : 'text-slate-200 dark:text-slate-700'}`}>
                          {isSelected ? 'check_circle' : 'radio_button_unchecked'}
                        </span>
                      </div>

                      <div className={`flex-1 fin-card p-5 group transition-all duration-500 overflow-hidden relative ${isSelected ? 'border-amber-500 ring-2 ring-amber-500/10' : 'hover:border-amber-500/20'} ${isCompleted ? 'bg-gradient-to-br from-amber-50/50 to-white dark:from-amber-900/5 dark:to-slate-800' : ''}`}>
                        
                        {isCompleted && (
                          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-bl-full flex items-start justify-end p-4 pointer-events-none">
                            <span className="material-symbols-outlined text-amber-500 text-3xl animate-bounce">emoji_events</span>
                          </div>
                        )}

                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-4">
                            {/* Circular Progress */}
                            <div className="relative w-16 h-16 rounded-full flex items-center justify-center shrink-0 shadow-sm border border-black/5 dark:border-white/5" style={{ background: `conic-gradient(#f59e0b ${progressPct * 3.6}deg, #f1f5f9 0deg)`}}>
                              <div className="absolute inset-1.5 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center font-black text-[10px] text-amber-600 dark:text-amber-400 tabular-nums">
                                {progressPct}%
                              </div>
                            </div>
                            <div>
                              <h3 className="font-black text-base text-slate-800 dark:text-slate-100 pr-8 group-hover:text-amber-600 transition-colors">{c.name}</h3>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="material-symbols-outlined text-[14px] text-slate-400">schedule</span>
                                <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{c.duration} {t('challenge.daysUnit')}</p>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 z-20">
                            <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center text-xl mr-2 shadow-sm border border-black/5 dark:border-white/5">
                              {isCompleted ? '👑' : (c.icon || '⭐')}
                            </div>

                            <button onClick={() => { setEditingChal(c); setShowModal(true); }} className="w-9 h-9 rounded-full bg-surface-container-low dark:bg-slate-800 text-blue-500 flex items-center justify-center hover:bg-blue-500/10 transition-all active:scale-90">
                              <span className="material-symbols-outlined text-base">edit</span>
                            </button>
                            
                            {confirmDeleteId === c.id ? (
                              <div className="flex gap-1 animate-in fade-in slide-in-from-right-2 duration-300">
                                <button onClick={async () => {
                                  await deleteChallenge(c.id);
                                  setConfirmDeleteId(null);
                                }} className="w-9 h-9 rounded-full bg-rose-500 text-white flex items-center justify-center shadow-lg active:scale-90 transition-all">
                                  <span className="material-symbols-outlined text-base">check</span>
                                </button>
                                <button onClick={() => setConfirmDeleteId(null)} className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 flex items-center justify-center active:scale-90 transition-all">
                                  <span className="material-symbols-outlined text-base">close</span>
                                </button>
                              </div>
                            ) : (
                              <button onClick={() => setConfirmDeleteId(c.id)} className="w-9 h-9 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center hover:bg-rose-500/20 transition-all active:scale-90">
                                <span className="material-symbols-outlined text-base">delete</span>
                              </button>
                            )}
                          </div>
                        </div>
                        {isCompleted && (
                          <div className="mt-4 pt-4 border-t border-amber-500/10 flex items-center gap-2">
                             <span className="text-[10px] font-black text-amber-600 dark:text-amber-400 uppercase tracking-[0.2em]">🎉 {t('challenge.completed')}</span>
                             <div className="h-1 flex-1 bg-amber-500/20 rounded-full"></div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* 52-WEEK SAVER TAB */}
        {activeTab === 'week52' && (
          <div className="space-y-6 animate-in slide-in-from-right-8 duration-300">
            {/* Savings Overview Card */}
            <div className="fin-card p-6 bg-gradient-to-br from-indigo-500/10 to-purple-500/5 border border-indigo-500/10 rounded-[2.5rem]">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="space-y-1">
                  <h3 className="text-lg font-black dark:text-white flex items-center gap-2">
                    {t('challenge.week52.title')}
                  </h3>
                  <p className="text-[10px] text-slate-400 font-bold max-w-md leading-relaxed">
                    {t('challenge.week52.desc', { curr: baseCurrency })}
                  </p>
                </div>
                <div className="flex flex-col items-end shrink-0">
                  <span className="text-2xl font-black text-indigo-500 tabular-nums">
                    {fmt(completedWeeks.reduce((sum, w) => sum + w * 10, 0))} / {fmt(13780)} {baseCurrency}
                  </span>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{t('challenge.week52.totalSaved')}</span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mt-5 space-y-2">
                <div className="flex justify-between items-center text-[10px] font-black uppercase text-indigo-500">
                  <span>{t('challenge.week52.progress')}</span>
                  <span>{Math.round((completedWeeks.length / 52) * 100)}%</span>
                </div>
                <div className="h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden border border-black/5 dark:border-white/5">
                  <div 
                    className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-700"
                    style={{ width: `${(completedWeeks.length / 52) * 100}%` }}
                  ></div>
                </div>
              </div>
            </div>

            {/* 52-Week Grid */}
            <div className="space-y-3">
              <h4 className="text-[10px] uppercase tracking-widest font-black text-slate-400 px-1">
                {t('challenge.week52.gridHeader')}
              </h4>
              <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
                {Array.from({ length: 52 }, (_, i) => i + 1).map(w => {
                  const isCompleted = completedWeeks.includes(w);

                  return (
                    <button
                      key={w}
                      onClick={() => !isCompleted && setConfirmWeekSave(w)}
                      className={`h-16 rounded-2xl flex flex-col items-center justify-center border transition-all active:scale-95 relative overflow-hidden ${
                        isCompleted
                          ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                          : 'bg-surface-container-lowest border-slate-100 dark:border-dark-border hover:border-indigo-500/30'
                      }`}
                    >
                      <span className="text-[9px] font-bold text-slate-400 block">{t('challenge.week52.weekLabel', { n: String(w) })}</span>
                      <span className="text-xs font-black dark:text-white tabular-nums mt-0.5">{w * 10}</span>
                      
                      {isCompleted && (
                        <div className="absolute inset-0 bg-emerald-500/5 flex items-center justify-center">
                          <span className="material-symbols-outlined text-emerald-500 text-lg font-bold">check_circle</span>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* NO-SPEND DAY TAB */}
        {activeTab === 'nospend' && (
          <div className="space-y-6 animate-in slide-in-from-right-8 duration-300 max-w-xl mx-auto">
            <div className="fin-card p-8 flex flex-col items-center text-center space-y-6 relative overflow-hidden border border-rose-500/10">
              
              <div className="w-24 h-24 rounded-[2rem] bg-rose-500/10 text-rose-500 flex items-center justify-center shrink-0 border border-rose-500/20 animate-pulse">
                <span className="material-symbols-outlined text-5xl">block</span>
              </div>

              <div className="space-y-2">
                <h3 className="text-xl font-black dark:text-white">
                  {t('challenge.noSpend.title')}
                </h3>
                <p className="text-xs text-slate-400 font-bold leading-relaxed max-w-md mx-auto">
                  {t('challenge.noSpend.desc')}
                </p>
              </div>

              {!noSpendActive ? (
                <button
                  onClick={handleActivateNoSpend}
                  className="w-full py-4 bg-rose-500 text-white rounded-2xl font-black text-sm shadow-lg shadow-rose-500/20 active:scale-95 transition-all"
                >
                  {t('challenge.noSpend.activateBtn')}
                </button>
              ) : noSpendClaimed ? (
                <div className="w-full p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded-2xl font-black text-sm flex items-center justify-center gap-2">
                  <span className="material-symbols-outlined">emoji_events</span>
                  {t('challenge.noSpend.successMessage')}
                </div>
              ) : (
                <div className="w-full space-y-3">
                  <div className="p-4 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-2xl font-black text-sm flex items-center justify-center gap-2">
                    <span className="material-symbols-outlined animate-spin">autorenew</span>
                    {t('challenge.noSpend.activeHelp')}
                  </div>
                  <button
                    onClick={handleVerifyNoSpend}
                    className="w-full py-4 bg-[#002b59] text-white rounded-2xl font-black text-sm shadow-lg active:scale-95 transition-all"
                  >
                    {t('challenge.noSpend.claimBtn')}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 52-Week Confirmation Modal */}
      {confirmWeekSave !== null && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-6 bg-black/70 backdrop-blur-md animate-in fade-in duration-300" onClick={() => setConfirmWeekSave(null)}>
          <div className="bg-white dark:bg-[#1e2124] w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl space-y-6 animate-in zoom-in-95 duration-300" onClick={e => e.stopPropagation()}>
            <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center mx-auto">
              <span className="material-symbols-outlined text-4xl">account_balance_wallet</span>
            </div>
            
            <div className="text-center space-y-2">
              <h3 className="text-xl font-black dark:text-white">
                {t('challenge.week52.confirmTitle', { n: String(confirmWeekSave) })}
              </h3>
              <p className="text-xs text-slate-400 font-bold leading-relaxed">
                {t('challenge.week52.confirmDesc', { n: String(confirmWeekSave), amount: fmt(confirmWeekSave * 10), curr: baseCurrency })}
              </p>
            </div>

            <div className="flex gap-3">
              <button 
                onClick={() => setConfirmWeekSave(null)}
                className="flex-1 py-4 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-500 font-black text-xs active:scale-95 transition-all"
              >
                {t('action.cancel')}
              </button>
              <button 
                onClick={() => handleSaveWeek(confirmWeekSave)}
                className="flex-[2] py-4 rounded-2xl bg-indigo-600 text-white font-black text-xs shadow-lg shadow-indigo-600/20 active:scale-95 transition-all"
              >
                {t('challenge.week52.saveNow')}
              </button>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <ChallengeModal
          challenge={editingChal}
          onSave={handleSave}
          onClose={() => { setShowModal(false); setEditingChal(undefined); }}
        />
      )}
    </div>
  );
}
