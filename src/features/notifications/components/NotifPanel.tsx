import { useState, useEffect, useCallback } from 'react';
import { onActivate } from '@/core/a11yKeyboard';
import { useI18n } from '../../../i18n/index';
import { useAppStore } from '../../../store/appStore';
import { useShallow } from 'zustand/react/shallow';
import { useNavigate } from 'react-router-dom';
import {
  buildAppNotifications,
  dismissNotif,
  clearAllNotifs,
  snoozeNotif
} from '../../../core/notifications';
import { recordException } from '../../../core/crashlytics';
import type { AppNotification } from '@/types';

export function NotifPanel() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { isNotifPanelOpen, setNotifPanelOpen, setNotifCount } = useAppStore(
    useShallow((s) => ({
      isNotifPanelOpen: s.isNotifPanelOpen,
      setNotifPanelOpen: s.setNotifPanelOpen,
      setNotifCount: s.setNotifCount
    }))
  );

  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [activeFilter, setActiveFilter] = useState<'all' | 'error' | 'warn' | 'info' | 'success'>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);

  const loadNotifications = useCallback(async () => {
    setIsLoading(true);
    setHasError(false);
    try {
      const items = await buildAppNotifications();
      setNotifications(items);
      setNotifCount(items.length);
    } catch (err) {
      recordException('[NotifPanel] Failed to load notifications', err as Error);
      setNotifications([]);
      setHasError(true);
    } finally {
      setIsLoading(false);
    }
  }, [setNotifCount]);

  useEffect(() => {
    if (isNotifPanelOpen) {
      loadNotifications();
    }
  }, [isNotifPanelOpen, loadNotifications]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isNotifPanelOpen) {
        setNotifPanelOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isNotifPanelOpen, setNotifPanelOpen]);

  if (!isNotifPanelOpen) return null;

  const counts = {
    all: notifications.length,
    error: notifications.filter((n) => n.type === 'error').length,
    warn: notifications.filter((n) => n.type === 'warn').length,
    info: notifications.filter((n) => n.type === 'info').length,
    success: notifications.filter((n) => n.type === 'success').length
  };

  const filtered = activeFilter === 'all'
    ? notifications
    : notifications.filter((n) => n.type === activeFilter);

  const filterConfigs: Array<{ id: 'all' | 'error' | 'warn' | 'info' | 'success'; label: string; color: string; bg: string }> = [
    { id: 'all', label: t('notif.filter.all') || 'الكل', color: 'text-slate-600 dark:text-slate-300', bg: 'bg-slate-100 dark:bg-slate-800' },
    { id: 'error', label: t('notif.filter.critical') || 'حرجة', color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-50 dark:bg-rose-950/40' },
    { id: 'warn', label: t('notif.filter.warn') || 'تحذيرات', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/40' },
    { id: 'info', label: t('notif.filter.info') || 'تنبيهات', color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-950/40' },
    { id: 'success', label: t('notif.filter.done') || 'مكتملة', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/40' }
  ];

  const handleDismiss = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await dismissNotif(id);
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    setNotifCount(Math.max(0, notifications.length - 1));
  };

  const handleSnooze = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    snoozeNotif(id);
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    setNotifCount(Math.max(0, notifications.length - 1));
  };

  const handleClearAll = async () => {
    await clearAllNotifs();
    setNotifications([]);
    setNotifCount(0);
  };

  const handleNavigate = (page?: string) => {
    setNotifPanelOpen(false);
    if (page) {
      navigate('/' + page.replace(/^\//, ''));
    }
  };

  const getStyleForType = (type: string) => {
    switch (type) {
      case 'error':
        return {
          iconColor: 'text-rose-600 dark:text-rose-400',
          bgColor: 'bg-rose-100 dark:bg-rose-900/30 border-rose-200 dark:border-rose-900/50'
        };
      case 'warn':
        return {
          iconColor: 'text-amber-600 dark:text-amber-400',
          bgColor: 'bg-amber-100 dark:bg-amber-900/30 border-amber-200 dark:border-amber-900/50'
        };
      case 'success':
        return {
          iconColor: 'text-emerald-600 dark:text-emerald-400',
          bgColor: 'bg-emerald-100 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-900/50'
        };
      default:
        return {
          iconColor: 'text-blue-600 dark:text-blue-400',
          bgColor: 'bg-blue-100 dark:bg-blue-900/30 border-blue-200 dark:border-blue-900/50'
        };
    }
  };

  return (
    <div
      className="fixed inset-0 z-[9998] flex items-start justify-center p-3 sm:p-4 pt-[calc(4.5rem+env(safe-area-inset-top,0px))] sm:pt-20 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={() => setNotifPanelOpen(false)}
      role="dialog"
      aria-modal="true"
      aria-labelledby="notif-panel-title"
    >
      <div
        className="w-full max-w-md bg-surface dark:bg-slate-900 rounded-3xl shadow-2xl border border-outline-variant/30 overflow-hidden flex flex-col max-h-[75vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-outline-variant/20 flex-shrink-0 bg-surface-container/50 dark:bg-slate-900/80 backdrop-blur-md">
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-xl">notifications</span>
              <h2 id="notif-panel-title" className="font-black text-base sm:text-lg text-slate-800 dark:text-slate-100">
                {t('notif.title') || 'الإشعارات'}
                {notifications.length > 0 && (
                  <span className="text-xs font-bold text-primary ml-1 mr-1 px-2 py-0.5 rounded-full bg-primary/10">
                    {notifications.length}
                  </span>
                )}
              </h2>
            </div>
            <div className="flex items-center gap-1.5">
              {notifications.length > 0 && (
                <button
                  onClick={handleClearAll}
                  className="px-2.5 py-1 text-xs font-bold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 bg-surface-container hover:bg-surface-container-high rounded-xl border border-outline-variant/30 transition-all active:scale-95"
                >
                  {t('notif.clearAll') || 'مسح الكل'}
                </button>
              )}
              <button
                onClick={() => setNotifPanelOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-xl bg-surface-container hover:bg-surface-container-high text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-all active:scale-90"
                aria-label="إغلاق"
              >
                <span className="material-symbols-outlined text-lg" aria-hidden="true">close</span>
              </button>
            </div>
          </div>

          {/* Filter Chips */}
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            {filterConfigs
              .filter((f) => f.id === 'all' || counts[f.id] > 0)
              .map((f) => {
                const isActive = activeFilter === f.id;
                return (
                  <button
                    key={f.id}
                    onClick={() => setActiveFilter(f.id)}
                    className={`px-3 py-1 rounded-xl text-xs font-bold whitespace-nowrap transition-all active:scale-95 ${
                      isActive
                        ? 'bg-primary text-white shadow-sm'
                        : `${f.bg} ${f.color} hover:opacity-80`
                    }`}
                  >
                    {f.label} {counts[f.id] > 0 ? `(${counts[f.id]})` : ''}
                  </button>
                );
              })}
          </div>
        </div>

        {/* Notifications List Body */}
        <div className="flex-1 overflow-y-auto divide-y divide-outline-variant/10">
          {isLoading ? (
            <div className="p-10 text-center text-slate-400 animate-pulse text-xs font-bold">
              {t('misc.loading') || 'جاري التحميل...'}
            </div>
          ) : hasError ? (
            <div className="p-8 text-center text-slate-400">
              <span className="material-symbols-outlined text-4xl mb-2 block text-rose-500/70">
                error
              </span>
              <p className="text-xs font-bold text-slate-600 dark:text-slate-300 mb-2">
                {t('common.error') || 'حدث خطأ أثناء تحميل الإشعارات'}
              </p>
              <button aria-label={t('action.refresh') || 'Refresh'}
                onClick={loadNotifications}
                className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-xs" aria-hidden="true">refresh</span>
                {t('common.retry') || 'إعادة المحاولة'}
              </button>
            </div>
          ) : filtered.length > 0 ? (
            filtered.map((item) => {
              const styles = getStyleForType(item.type);
              return (
                <div
                  key={item.id}
                  onClick={() => handleNavigate(item.page)}
                  className="p-3.5 sm:p-4 flex items-start gap-3 hover:bg-surface-container/40 dark:hover:bg-slate-800/40 transition-all cursor-pointer group"
  role="button" tabIndex={0} onKeyDown={onActivate(() => handleNavigate(item.page))}>
                  <div
                    className={`w-9 h-9 rounded-2xl flex items-center justify-center flex-shrink-0 border ${styles.bgColor}`}
                  >
                    <span className={`material-symbols-outlined text-lg ${styles.iconColor}`}>
                      {item.icon || 'notifications'}
                    </span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="font-black text-xs sm:text-sm text-slate-800 dark:text-slate-100 truncate mb-0.5">
                      {item.title}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                      {item.body}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                    {item.canSnooze && (
                      <button
                        onClick={(e) => handleSnooze(item.id, e)}
                        className="w-7 h-7 flex items-center justify-center rounded-lg bg-surface-container hover:bg-surface-container-high text-slate-400 hover:text-amber-500 transition-all active:scale-90"
                        title={t('notif.snooze') || 'غفوة'}
                      >
                        <span className="material-symbols-outlined text-sm" aria-hidden="true">snooze</span>
                      </button>
                    )}
                    <button
                      onClick={(e) => handleDismiss(item.id, e)}
                      className="w-7 h-7 flex items-center justify-center rounded-lg bg-surface-container hover:bg-surface-container-high text-slate-400 hover:text-rose-500 transition-all active:scale-90"
                      title={t('notif.dismiss') || 'تجاهل'}
                    >
                      <span className="material-symbols-outlined text-sm" aria-hidden="true">close</span>
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="p-10 text-center text-slate-400">
              <span className="material-symbols-outlined text-4xl mb-2 block opacity-40">
                notifications_off
              </span>
              <p className="text-xs font-bold">{t('notif.none') || 'لا توجد إشعارات حالياً'}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
