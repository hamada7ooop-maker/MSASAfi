import React, { useState, useEffect } from 'react';
import { useI18n } from '../../../i18n/index';
import { useFormat } from '../../../core/hooks/useFormat';
import { TransactionRepository } from '../../../core/db/repositories/transactions';
import type { Transaction } from '../../../types';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../../core/db/core';
import { toast } from '../../../toast';
import { bridge } from '../../../core/AppBridge';

interface CoolingQueueModalProps {
  onClose: () => void;
  onRefreshList?: () => void;
}

export function CoolingQueueModal({ onClose, onRefreshList }: CoolingQueueModalProps) {
  const { t } = useI18n();
  const { fmt, getCurrencySymbol } = useFormat();
  const [, setTick] = useState(0);

  // Update countdowns every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setTick(prev => prev + 1);
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  const coolingItems = useLiveQuery(
    async () => {
      const all = await db.transactions.toArray();
      return all.filter(t => t.isDraft && t.coolingExpireDate && !t.isDeleted)
                .sort((a, b) => new Date(a.coolingExpireDate!).getTime() - new Date(b.coolingExpireDate!).getTime());
    },
    []
  );

  const getRemainingTimeText = (expireStr: string) => {
    const diffMs = new Date(expireStr).getTime() - Date.now();
    if (diffMs <= 0) return 'expired';
    const hours = Math.floor(diffMs / (60 * 60 * 1000));
    const mins = Math.floor((diffMs % (60 * 60 * 1000)) / (60 * 1000));
    return t('cooling.remainingTime')
      .replace('{hours}', fmt(hours))
      .replace('{mins}', fmt(mins));
  };

  const handleSkipCooling = (item: Transaction) => {
    bridge.confirmSheet(
      t('cooling.skipConfirmDialog'),
      async () => {
        try {
          await TransactionRepository.update(item.id, {
            isDraft: false,
            coolingExpireDate: undefined
          });
          toast(t('cooling.skipSuccess'), 'success');
          onRefreshList?.();
        } catch {
          toast(t('common.error'), 'error');
        }
      },
      t('action.confirm') || 'تأكيد',
      t('action.cancel') || 'إلغاء'
    );
  };

  const handleConfirmPurchase = async (item: Transaction) => {
    try {
      await TransactionRepository.update(item.id, {
        isDraft: false,
        coolingExpireDate: undefined
      });
      toast(t('cooling.confirmSuccess'), 'success');
      onRefreshList?.();
    } catch {
      toast(t('common.error'), 'error');
    }
  };

  const handleCancelItem = (id: string) => {
    bridge.confirmSheet(
      t('cooling.cancelConfirmDialog'),
      async () => {
        try {
          await TransactionRepository.hardDelete(id);
          toast(t('cooling.cancelSuccess'), 'info');
          onRefreshList?.();
        } catch {
          toast(t('common.error'), 'error');
        }
      },
      t('action.delete') || 'إلغاء الشراء',
      t('action.cancel') || 'تراجع'
    );
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-white/90 dark:bg-[#1a1d21]/95 border border-slate-200/50 dark:border-white/10 rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-300">
        
        {/* Header */}
        <div className="p-6 pb-4 border-b border-slate-100 dark:border-white/5 flex justify-between items-center bg-cyan-500/5 dark:bg-cyan-500/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center">
              <span className="material-symbols-outlined text-2xl animate-pulse">ac_unit</span>
            </div>
            <div>
              <h3 className="text-lg font-black text-[#002b59] dark:text-blue-100">
                {t('cooling.title')}
              </h3>
              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tight">
                {t('cooling.subtitle')}
              </p>
            </div>
          </div>
          <button aria-label={t('action.close') || 'Close'} 
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center hover:scale-105 active:scale-95 transition-all text-slate-400 hover:text-slate-600"
          >
            <span className="material-symbols-outlined text-lg" aria-hidden="true">close</span>
          </button>
        </div>

        {/* List Content */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          {coolingItems && coolingItems.length > 0 ? (
            coolingItems.map(item => {
              const remText = getRemainingTimeText(item.coolingExpireDate!);
              const isExpired = remText === 'expired';

              return (
                <div 
                  key={item.id}
                  className={`p-4 rounded-3xl border transition-all ${
                    isExpired 
                      ? 'bg-emerald-500/5 dark:bg-emerald-500/10 border-emerald-500/20' 
                      : 'bg-cyan-500/5 dark:bg-cyan-500/10 border-cyan-500/20 animate-pulse'
                  } flex flex-col gap-3`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-black text-sm text-slate-800 dark:text-slate-200">
                        {item.description || item.category}
                      </h4>
                      <p className="text-[10px] text-slate-400 font-bold">
                        {t('cooling.categoryLabel').replace('{category}', t(item.category))} • {t('cooling.moodLabel').replace('{mood}', t(`txn.mood.${item.mood}`) || t('txn.mood.neutral'))}
                      </p>
                    </div>
                    <span className="text-sm font-black text-rose-500 tabular-nums">
                      {fmt(item.amount)} {getCurrencySymbol()}
                    </span>
                  </div>

                  {/* Countdown Timer Row */}
                  <div className="flex items-center justify-between bg-white/50 dark:bg-slate-800/40 p-3 rounded-2xl border border-black/5 dark:border-white/5">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-sm text-cyan-600 dark:text-cyan-400">
                        {isExpired ? 'verified' : 'hourglass_empty'}
                      </span>
                      <span className="text-[10px] font-black text-slate-700 dark:text-slate-300">
                        {isExpired ? t('cooling.expiredStatus') : t('cooling.waitingTime')}
                      </span>
                    </div>
                    <span className={`text-[10px] font-black ${isExpired ? 'text-emerald-600 dark:text-emerald-400' : 'text-cyan-600 dark:text-cyan-400'}`}>
                      {isExpired ? t('cooling.expiredState') : remText}
                    </span>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => handleCancelItem(item.id)}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-[10px] font-black transition-all flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-xs">close</span>
                      {t('cooling.cancelPurchaseBtn')}
                    </button>
                    {isExpired ? (
                      <button
                        onClick={() => handleConfirmPurchase(item)}
                        className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-[10px] font-black transition-all flex items-center gap-1 shadow-md shadow-emerald-500/20"
                      >
                        <span className="material-symbols-outlined text-xs">done</span>
                        {t('cooling.confirmPurchaseBtn')}
                      </button>
                    ) : (
                      <button
                        onClick={() => handleSkipCooling(item)}
                        className="px-3 py-1.5 bg-cyan-500 hover:bg-cyan-600 text-white rounded-xl text-[10px] font-black transition-all flex items-center gap-1 shadow-md shadow-cyan-500/20"
                      >
                        <span className="material-symbols-outlined text-xs">bolt</span>
                        {t('cooling.skipPurchaseBtn')}
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="py-16 text-center space-y-4">
              <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto text-slate-300 dark:text-slate-600">
                <span className="material-symbols-outlined text-4xl">ac_unit</span>
              </div>
              <h4 className="text-sm font-black text-slate-700 dark:text-slate-300">
                {t('cooling.emptyTitle')}
              </h4>
              <p className="text-[10px] text-slate-400 font-bold max-w-xs mx-auto">
                {t('cooling.emptyDesc')}
              </p>
            </div>
          )}
        </div>

        {/* Footer info banner */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-white/5 text-center text-[9px] text-slate-400 font-bold">
          {t('cooling.meditation')}
        </div>
      </div>
    </div>
  );
}
