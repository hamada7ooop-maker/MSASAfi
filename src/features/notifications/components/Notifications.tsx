import React, { useState, useEffect } from 'react';
import { useI18n } from '../../../i18n/index';
import { NotificationRepository } from '../../../core/db/repositories/notifications';
import { AppNotification } from '@/types';
import { useFormat } from '../../../core/hooks/useFormat';
import { useAppStore } from '../../../store/appStore';
import { useIsMounted } from '../../../hooks/useIsMounted';
import { useNavigate } from 'react-router-dom';
import { toast, confirmSheet } from '../../../toast';
import { silentFail } from '../../../core/utils';

export function Notifications() {
  const { t, isLTR } = useI18n();
  const { fmtDate } = useFormat();
  const isMounted = useIsMounted();
  const navigate = useNavigate();
  const setNotifCount = useAppStore((s) => s.setNotifCount);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const all = await NotificationRepository.getAll();
      if (isMounted.current) {
        setNotifications(all);
        setIsLoading(false);
      }
      
      // Mark all as read when viewing
      await NotificationRepository.markAllAsRead();
      const unread = await NotificationRepository.getUnreadCount();
      if (isMounted.current) {
        setNotifCount(unread);
      }
    }
    load();
  }, [setNotifCount, isMounted]);

  const getIcon = (type: string) => {
    switch (type) {
      case 'success': return 'check_circle';
      case 'warning': return 'warning';
      case 'error':   return 'error';
      case 'info':    return 'info';
      default:        return 'notifications';
    }
  };

  const getColorClass = (type: string) => {
    switch (type) {
      case 'success': return 'text-emerald-500 bg-emerald-500/10';
      case 'warning': return 'text-amber-500 bg-amber-500/10';
      case 'error':   return 'text-red-500 bg-red-500/10';
      case 'info':    return 'text-blue-500 bg-blue-500/10';
      default:        return 'text-slate-500 bg-slate-500/10';
    }
  };

  if (isLoading) {
    return (
      <div className="p-10 text-center animate-pulse text-slate-400">
        {t('misc.loading')}
      </div>
    );
  }

  return (
    <div className="p-5 space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between px-1">
        <div className="space-y-1">
          <h2 className="text-3xl text-premium-header text-[var(--color-primary)] dark:text-blue-100">
            {t('nav.notifications') || 'Notifications'}
          </h2>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-pulse"></div>
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest opacity-70">
              {t('notifications.subtitle') || 'Recent Alerts & System Updates'}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => {
              const confirmMsg = t('notifications.clearConfirm') || t('common.confirm') || 'Are you sure?';
              confirmSheet(
                confirmMsg,
                async () => {
                  try {
                    await NotificationRepository.clearAll();
                    setNotifications([]);
                    setNotifCount(0);
                    toast(t('notif.toast.allCleared') || 'Cleared!', 'success');
                  } catch (err) {
                    silentFail('[Notifications] Clear all error')(err);
                    toast(t('error.unexpected') || 'Error', 'error');
                  }
                },
                t('action.delete') || 'Delete',
                t('action.cancel') || 'Cancel'
              );
            }}
            className="w-10 h-10 flex items-center justify-center rounded-2xl bg-red-50 text-red-500 active:scale-90 transition-all"
            title={t('notif.clearAll')}
          >
            <span className="material-symbols-outlined" aria-hidden="true">delete_sweep</span>
          </button>
          <button 
            aria-label={t('action.back') || 'Back'}
            onClick={() => navigate(-1)}
            className="w-10 h-10 flex items-center justify-center rounded-2xl bg-surface-container text-slate-500 active:scale-90 transition-all"
          >
            <span className="material-symbols-outlined" aria-hidden="true">{isLTR ? 'arrow_back' : 'arrow_forward'}</span>
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {notifications.length === 0 ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-300 dark:text-slate-700">
            <span className="material-symbols-outlined text-6xl mb-4 opacity-20">notifications_off</span>
            <p className="font-black text-sm uppercase tracking-widest">
              {t('notifications.empty') || 'لا توجد إشعارات حالياً'}
            </p>
          </div>
        ) : (
          notifications.map((n) => (
            <div 
              key={n.id}
              className={`fin-card p-4 flex gap-4 items-start border-l-4 ${n.read === 0 ? 'border-l-blue-500' : 'border-l-transparent'}`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${getColorClass(n.type || 'info')}`}>
                <span className="material-symbols-outlined text-xl">{getIcon(n.type || 'info')}</span>
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <h4 className="font-black text-sm text-slate-800 dark:text-white">{n.title}</h4>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">
                    {fmtDate(n.date)}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                  {t(n.body)}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
