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
import { silentFail } from '../../../core/utils';
import { ChallengeModal } from './ChallengeModal';
import { Week52Tab } from './Week52Tab';
import { NoSpendTab } from './NoSpendTab';
import { CustomChallengesTab } from './CustomChallengesTab';
import { Week52ConfirmationModal } from './Week52ConfirmationModal';


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
              <button aria-label={t('action.add') || 'Add'} onClick={() => { setEditingChal(undefined); setShowModal(true); }}
                className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-lg shadow-amber-500/30 active:scale-95 transition-all">
                <span className="material-symbols-outlined text-xl" aria-hidden="true">add</span>
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
          <CustomChallengesTab
            activeChallenges={activeChallenges}
            selectedIds={selectedIds}
            isSelecting={isSelecting}
            onToggleSelection={toggleSelection}
            confirmDeleteId={confirmDeleteId}
            onRequestDelete={setConfirmDeleteId}
            onDelete={deleteChallenge}
            onEdit={(c) => { setEditingChal(c); setShowModal(true); }}
          />
        )}

        {/* 52-WEEK SAVER TAB */}
        {activeTab === 'week52' && (
          <Week52Tab
            completedWeeks={completedWeeks}
            onRequestSaveWeek={setConfirmWeekSave}
          />
        )}

        {/* NO-SPEND DAY TAB */}
        {activeTab === 'nospend' && (
          <NoSpendTab
            noSpendActive={noSpendActive}
            noSpendClaimed={noSpendClaimed}
            onActivate={handleActivateNoSpend}
            onVerify={handleVerifyNoSpend}
          />
        )}
      </div>

      {confirmWeekSave !== null && (
        <Week52ConfirmationModal
          week={confirmWeekSave}
          amount={fmt(confirmWeekSave * 10)}
          currency={baseCurrency}
          onCancel={() => setConfirmWeekSave(null)}
          onConfirm={() => handleSaveWeek(confirmWeekSave)}
        />
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
