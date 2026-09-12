import React, { useState, useMemo, useEffect } from 'react';
import { useI18n } from '../../../i18n/index';
import { LANGUAGE_META } from '../../../i18n/engine';
import { useFormat } from '../../../core/hooks/useFormat';
import { db as DB } from '@/core/db/core';
import { silentFail } from '../../../core/utils';

interface AuditEvent {
  id?: number | string;
  action: string;
  timestamp: string;
  details?: Record<string, unknown>;
}

export function AuditLog() {
  const { t } = useI18n();
  const { fmt, getCurrencySymbol } = useFormat();
  
  const [logs, setLogs] = useState<AuditEvent[]>([]);
  const [filter, setFilter] = useState<'all' | 'txns' | 'settings' | 'accounts'>('all');
  const [sort, setSort] = useState<'newest' | 'oldest'>('newest');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadLogs();
  }, []);

  const loadLogs = async () => {
    setIsLoading(true);
    try {
      const allLogs = await DB.getAuditLog();
      setLogs((allLogs || []) as unknown as AuditEvent[]);
    } catch (e) {
      silentFail('Failed to load audit logs in AuditLog')(e);
    } finally {
      setIsLoading(false);
    }
  };

  const auditIcons: Record<string, string> = {
    add_transaction: 'add_circle',
    delete_transaction: 'delete_forever',
    update_transaction: 'edit',
    add_budget: 'account_balance_wallet',
    update_budget: 'edit_note',
    delete_budget: 'remove_circle',
    add_goal: 'flag',
    update_goal: 'edit_square',
    delete_goal: 'delete_sweep',
    add_to_goal: 'add_task',
    add_bill: 'receipt_long',
    pay_bill: 'check_circle',
    delete_bill: 'cancel',
    add_asset: 'inventory_2',
    update_asset: 'edit',
    delete_asset: 'delete',
    add_card: 'credit_card',
    update_card: 'credit_card',
    delete_card: 'credit_card_off',
    add_child: 'family_restroom',
    update_child: 'face',
    delete_child: 'person_remove',
    update_setting: 'tune',
    export_data: 'ios_share',
    import_data: 'file_download',
    cloud_sync: 'sync',
    security_event: 'security'
  };

  const getLogLabel = (e: AuditEvent) => {
    const msgKey = `audit.log.${e.action}`;
    let label = t(msgKey);
    if (label === msgKey) label = e.action;

    if (e.action === 'update_setting' && e.details) {
      const key = String(e.details.key || '');
      const value = e.details.value;
      const keyMap: Record<string, string> = {
        theme: t('settings.theme'),
        language: t('settings.language'),
        currency: t('settings.currency'),
        baseCurrency: t('settings.currency'),
        incognito: t('settings.incognito'),
        autoLock: t('settings.autoLock'),
        dbEncryption: t('settings.encryption'),
        fontSize: t('settings.fontSize'),
        numberSystem: t('settings.numbers'),
        dark_palette: t('settings.palette.dark'),
        light_palette: t('settings.palette.light'),
        decimalPlaces: t('settings.decimals'),
        numberSeparator: t('settings.separator')
      };
      
      const settingName = keyMap[key] || t(`settings.${key}`) || key;
      let valDisplay: string | number | boolean = String(value);

      if (value === true) valDisplay = t('settings.enabled');
      else if (value === false) valDisplay = t('settings.disabled');
      else if (key === 'language') valDisplay = LANGUAGE_META[value as keyof typeof LANGUAGE_META]?.name || String(value);
      else if (key === 'theme' && typeof value === 'string') {
         const themeKey = `settings.theme${value.charAt(0).toUpperCase() + value.slice(1)}`;
         valDisplay = t(themeKey);
         if (valDisplay === themeKey) valDisplay = value;
      }
      else if (key === 'numberSeparator') valDisplay = t(`settings.sep.${value}`) || String(value);
      else if (key === 'fcmLastError') {
        const tKey = `settings.fcm.${value}`;
        const translated = t(tKey);
        valDisplay = translated !== tKey ? translated : (String(value) || 'null');
      }
      else if (key === 'dark_palette' || key === 'light_palette') valDisplay = t(`settings.palette.${value}`) || String(value);
      else if (typeof value === 'object' && value !== null) valDisplay = t('audit.details.updated');
      else if (value === null || value === undefined) valDisplay = 'null';

      label = `${settingName}: ${valDisplay}`;
    }
    return label;
  };

  const getLogSubDetail = (e: AuditEvent) => {
    if (e.details && e.action !== 'update_setting') {
      const parts = [];
      if (e.details.amount != null) {
        const formattedAmt = fmt(Number(e.details.amount) || 0);
        const symbol = e.details.currency ? String(e.details.currency) : getCurrencySymbol();
        const prefix = e.details.type === 'income' ? '+' : (e.details.type === 'expense' ? '-' : '');
        const colorClass = e.details.type === 'income' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400';
        parts.push(<span key="amt"><span className={colorClass}>{prefix}{formattedAmt}</span> {symbol}</span>);
      }
      if (e.details.name) parts.push(<span key="name">{String(e.details.name)}</span>);
      if (e.details.person) parts.push(<span key="person">{String(e.details.person)}</span>);
      
      if (parts.length > 0) {
        return (
          <div className="flex items-center gap-1.5 mt-0.5 text-xs font-bold text-slate-500">
            {parts.map((part, i) => (
              <React.Fragment key={i}>
                {i > 0 && <span>•</span>}
                {part}
              </React.Fragment>
            ))}
          </div>
        );
      }
    }
    return null;
  };

  const filteredAndSortedLogs = useMemo(() => {
    let result = [...logs];
    
    // Apply filter
    if (filter !== 'all') {
      result = result.filter(e => {
        if (filter === 'txns') return e.action.includes('transaction');
        if (filter === 'settings') return e.action.includes('setting') || e.action.includes('language');
        if (filter === 'accounts') return e.action.includes('account');
        return true;
      });
    }

    // Apply sort
    if (sort === 'oldest') {
      result.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    } else {
      result.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }

    return result.slice(0, 150); // limit to last 150 like legacy
  }, [logs, filter, sort]);

  return (
    <div className="p-4 space-y-6 page-enter animate-in fade-in slide-in-from-bottom-4 duration-300">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-[#002b59] text-white flex items-center justify-center shadow-lg shadow-[#002b59]/20">
            <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>history</span>
          </div>
          <div>
            <h2 className="text-2xl font-black text-[#002b59] dark:text-blue-100">{t('settings.auditLog')}</h2>
            <p className="text-xs font-bold text-slate-400">{t('audit.last50')}</p>
          </div>
        </div>
        
        {/* Sort Toggle */}
        <button 
          onClick={() => setSort(s => s === 'newest' ? 'oldest' : 'newest')} 
          className="flex items-center gap-1.5 bg-white dark:bg-[#1c1f23] px-3 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 shadow-sm border border-slate-100 dark:border-slate-800 active:scale-95 transition-all"
        >
          <span className="material-symbols-outlined text-base">{sort === 'newest' ? 'south' : 'north'}</span>
          {t(`audit.sort.${sort}`)}
        </button>
      </div>

      {/* Filter Chips */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4">
        {(['all', 'txns', 'settings', 'accounts'] as const).map(type => (
          <button 
            key={type}
            onClick={() => setFilter(type)} 
            className={`px-4 py-2 rounded-xl text-xs font-black whitespace-nowrap transition-all active:scale-95 border ${
              filter === type 
                ? 'bg-[#002b59] text-white border-[#002b59] shadow-md shadow-[#002b59]/20 dark:border-blue-900' 
                : 'bg-white dark:bg-[#1c1f23] text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-[#25282d]'
            }`}
          >
            {t(`audit.filter.${type}`)}
          </button>
        ))}
      </div>

      {/* Log List */}
      <div className="space-y-6 pb-24">
        {isLoading ? (
          Array.from({length: 5}).map((_, i) => (
            <div key={i} className="skeleton h-20 w-full rounded-2xl"></div>
          ))
        ) : filteredAndSortedLogs.length > 0 ? (
          Object.entries(
            filteredAndSortedLogs.reduce((groups, log) => {
              const date = new Date(log.timestamp);
              const today = new Date();
              const yesterday = new Date(today);
              yesterday.setDate(yesterday.getDate() - 1);
              
              let key = '';
              if (date.toDateString() === today.toDateString()) {
                key = t('common.today');
              } else if (date.toDateString() === yesterday.toDateString()) {
                key = t('common.yesterday');
              } else {
                key = new Intl.DateTimeFormat(t('lang') === 'ar' ? 'ar-SA' : t('lang') === 'fa' ? 'fa-IR' : 'en-US', { dateStyle: 'long' }).format(date);
              }
              
              if (!groups[key]) groups[key] = [];
              groups[key].push(log);
              return groups;
            }, {} as Record<string, typeof filteredAndSortedLogs>)
          ).map(([dateLabel, dayLogs]) => (
            <div key={dateLabel} className="space-y-3 animate-in fade-in duration-500">
              <h3 className="text-[11px] uppercase tracking-widest font-black text-slate-400 px-2 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-slate-200 dark:bg-slate-700"></span>
                {dateLabel}
              </h3>
              <div className="space-y-2">
                {dayLogs.map((e, index) => {
                  const icon = auditIcons[e.action] || 'history';
                  let iconColor = 'text-[#002b59] dark:text-blue-400';
                  let bgColor = 'bg-slate-50 dark:bg-[#25282d]';
                  
                  if (e.action.includes('delete') || e.action.includes('wipe')) {
                    iconColor = 'text-rose-500 dark:text-rose-400';
                    bgColor = 'bg-rose-50 dark:bg-rose-900/10';
                  } else if (e.action.includes('add') || e.action.includes('pay_') || e.details?.type === 'income') {
                    iconColor = 'text-emerald-500 dark:text-emerald-400';
                    bgColor = 'bg-emerald-50 dark:bg-emerald-900/10';
                  } else if (e.details?.type === 'expense') {
                    iconColor = 'text-amber-500 dark:text-amber-400';
                    bgColor = 'bg-amber-50 dark:bg-amber-900/10';
                  }

                  const label = getLogLabel(e);
                  const subDetail = getLogSubDetail(e);
                  
                  return (
                    <div 
                      key={e.id || index} 
                      className="bg-white/80 dark:bg-[#1c1f23]/80 backdrop-blur-md p-4 rounded-2xl flex items-center gap-4 shadow-sm border border-slate-100/50 dark:border-slate-800/50 transition-all hover:scale-[1.01] hover:shadow-md"
                    >
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${bgColor}`}>
                        <span className={`material-symbols-outlined ${iconColor} text-2xl drop-shadow-sm`} style={{ fontVariationSettings: "'FILL' 1" }}>
                          {icon}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">
                          {label}
                        </p>
                        {subDetail}
                        <p className="text-[10px] text-slate-400 font-bold mt-1 flex items-center gap-1">
                          <span className="material-symbols-outlined text-[10px]">schedule</span>
                          {new Intl.DateTimeFormat(t('lang') === 'ar' ? 'ar-SA' : t('lang') === 'fa' ? 'fa-IR' : 'en-US', { timeStyle: 'short' }).format(new Date(e.timestamp))}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-12">
            <span className="material-symbols-outlined text-6xl text-slate-200 dark:text-slate-800 mb-4">history</span>
            <h3 className="text-lg font-black text-slate-500 dark:text-slate-400">{t('audit.emptyTitle') || 'لا يوجد سجلات'}</h3>
            <p className="text-sm text-slate-400 mt-2">{t('audit.emptySub') || 'سجلات التدقيق ستظهر هنا'}</p>
          </div>
        )}
      </div>
    </div>
  );
}
