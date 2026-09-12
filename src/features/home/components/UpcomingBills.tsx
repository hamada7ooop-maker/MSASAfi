import React from 'react';
import { useI18n } from '../../../i18n/index';
import { useFormat } from '../../../core/hooks/useFormat';
import { useNavigate } from 'react-router-dom';

import type { Bill } from '@/types';

interface UpcomingBillsProps {
  bills: Array<Bill & { isSubscription?: boolean }>;
}

export function UpcomingBills({ bills }: UpcomingBillsProps) {
  const { t } = useI18n();
  const { fmt } = useFormat();
  const navigate = useNavigate();

  if (bills.length === 0) return null;

  const displayedBills = bills.slice(0, 5);
  const remainingCount = bills.length - displayedBills.length;

  return (
    <div className="bg-white dark:bg-slate-800 rounded-[32px] p-7 shadow-xl border border-black/5 dark:border-white/5">
      <div className="flex justify-between items-center mb-6">
        <h3 className="font-black text-sm uppercase tracking-tighter flex items-center gap-2 text-rose-500">
          <span className="material-symbols-outlined">event_upcoming</span>
          {t('home.upcomingBills')}
        </h3>
        <button 
          onClick={() => navigate('/bills')}
          className="text-blue-500 text-[10px] font-black uppercase tracking-widest"
        >
          {t('action.viewAll')}
        </button>
      </div>
      <div className="space-y-4">
        {displayedBills.map((b, i) => {
          const daysLeft = Math.ceil((new Date(b.dueDate).getTime() - new Date().getTime()) / 86400000);
          const urgent = daysLeft <= 3;
          return (
            <div key={i} className={`flex items-center gap-4 p-4 rounded-2xl ${urgent ? 'bg-red-50 dark:bg-red-900/20' : 'bg-slate-50 dark:bg-slate-900/40'}`}>
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${urgent ? 'bg-red-100 dark:bg-red-900/40' : 'bg-blue-50 dark:bg-blue-900/40'}`}>
                <span className={`material-symbols-outlined ${urgent ? 'text-red-600' : 'text-blue-600 dark:text-blue-200'}`}>
                  {b.icon || 'receipt_long'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-black text-sm text-slate-700 dark:text-slate-200 truncate">{b.name}</p>
                <p className={`text-[10px] uppercase tracking-widest font-bold ${urgent ? 'text-red-500' : 'text-slate-400'}`}>
                  {daysLeft > 0 ? `${t('bill.dueIn')} ${daysLeft} ${t('home.days')}` : t('bill.overdue')}
                  {b.isSubscription && (
                    <span className="ms-2 px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 rounded-md text-[8px] font-black uppercase tracking-tighter">
                      {t('bill.subscription')}
                    </span>
                  )}
                </p>
              </div>
              <p className={`font-black text-sm tabular-nums ${urgent ? 'text-red-600' : 'text-slate-700 dark:text-slate-200'}`}>
                {fmt(b.amount)}
              </p>
            </div>
          );
        })}
      </div>
      {remainingCount > 0 && (
        <button
          onClick={() => navigate('/bills')}
          className="w-full mt-4 py-2.5 rounded-2xl bg-slate-50 dark:bg-slate-900/40 hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-500 dark:text-slate-400 text-xs font-black transition-all flex items-center justify-center gap-1.5 border border-black/5 dark:border-white/5"
        >
          <span>{t('action.viewAll') || 'عرض الكل'}</span>
          <span className="text-[10px] opacity-75">(+{remainingCount})</span>
          <span className="material-symbols-outlined text-sm rtl:rotate-180">chevron_right</span>
        </button>
      )}
    </div>
  );
}
