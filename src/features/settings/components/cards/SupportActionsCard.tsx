import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../../../../i18n/index';
import {
  loadDemoData,
  deleteDemoData,
  recalculateBalances,
} from '../../services/settingsService';

export function SupportActionsCard() {
  const { t, isLTR } = useI18n();
  const navigate = useNavigate();
  const [modal, setModal] = useState<{
    title: string;
    desc: string;
    type: 'demo_load' | 'demo_delete' | 'wipe_all';
  } | null>(null);

  const chevron = isLTR ? 'chevron_right' : 'chevron_left';

  const handleAction = async (action: 'append' | 'replace' | 'delete_demo' | 'wipe_all') => {
    setModal(null);
    if (action === 'append') await loadDemoData(false);
    else if (action === 'replace') await loadDemoData(true);
    else if (action === 'delete_demo') await deleteDemoData(true);
    else if (action === 'wipe_all') await deleteDemoData(false);
  };

  const navItems = [
    {
      icon: 'military_tech',
      iconColor: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
      label: t('settings.referralSystem'),
      sublabel: t('settings.referralDesc') || 'ادعُ أصدقاءك واكسب نقاطاً',
      route: '/referrals',
    },
  ];

  const actionItems = [
    {
      icon: 'database_upload',
      iconColor: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
      label: t('settings.loadDemo'),
      sublabel: t('settings.loadDemoDesc') || 'تحميل بيانات تجريبية للاستعراض',
      onClick: () => setModal({
        type: 'demo_load',
        title: t('settings.demo.choiceTitle'),
        desc: t('settings.demo.choiceDesc'),
      }),
      variant: 'default' as const,
    },
    {
      icon: 'rebase_edit',
      iconColor: 'bg-teal-500/10 text-teal-600 dark:text-teal-400',
      label: t('settings.recalculateBalances'),
      sublabel: t('settings.recalcDesc') || 'إعادة حساب جميع الأرصدة',
      onClick: recalculateBalances,
      variant: 'default' as const,
    },
    {
      icon: 'delete_sweep',
      iconColor: 'bg-amber-500/10 text-amber-500',
      label: t('settings.wipe.demoOnly'),
      sublabel: t('settings.deleteDemoConfirm') || 'حذف البيانات التجريبية فقط',
      onClick: () => setModal({
        type: 'demo_delete',
        title: t('settings.wipe.demoOnly'),
        desc: t('settings.deleteDemoConfirm') || 'حذف البيانات التجريبية؟',
      }),
      variant: 'warning' as const,
    },
    {
      icon: 'delete_forever',
      iconColor: 'bg-rose-500/10 text-rose-500',
      label: t('settings.wipe.all'),
      sublabel: t('settings.wipeConfirm') || 'مسح جميع البيانات نهائياً',
      onClick: () => setModal({
        type: 'wipe_all',
        title: t('settings.wipe.all'),
        desc: t('settings.wipeConfirm') || 'هل أنت متأكد من المسح الكامل؟',
      }),
      variant: 'danger' as const,
    },
  ];

  return (
    <>
      <div className="space-y-1 animate-in slide-in-from-bottom-4 duration-500">
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500 px-1 mb-2">
          {t('settings.sectionSupport')}
        </p>

        <div className="bg-white/40 dark:bg-white/[0.02] backdrop-blur-md rounded-[1.75rem] overflow-hidden border border-white/20 dark:border-white/[0.05] shadow-[0_8px_32px_0_rgba(31,38,135,0.03)] divide-y divide-slate-100/30 dark:divide-white/[0.02]">

          {/* Navigation links */}
          {navItems.map((item) => (
            <button
              key={item.route}
              onClick={() => navigate(item.route)}
              className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-black/[0.01] dark:hover:bg-white/[0.01] active:scale-[0.99] transition-all duration-150 group text-start"
            >
              <div className="flex items-center gap-3.5">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${item.iconColor} shadow-sm`}>
                  <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>{item.icon}</span>
                </div>
                <div>
                  <p className="text-[13px] font-black text-on-surface dark:text-white leading-tight">{item.label}</p>
                  {item.sublabel && <p className="text-[10px] text-slate-400 font-bold mt-0.5">{item.sublabel}</p>}
                </div>
              </div>
              <span className={`material-symbols-outlined text-slate-300 dark:text-slate-600 text-[18px] transition-transform ${isLTR ? 'group-hover:translate-x-0.5' : 'group-hover:-translate-x-0.5'}`}>
                {chevron}
              </span>
            </button>
          ))}

          {/* Action buttons */}
          {actionItems.map((item, i) => (
            <button
              key={i}
              onClick={item.onClick}
              className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-black/[0.01] dark:hover:bg-white/[0.01] active:scale-[0.99] transition-all duration-150 group text-start"
            >
              <div className="flex items-center gap-3.5">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${item.iconColor} shadow-sm`}>
                  <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>{item.icon}</span>
                </div>
                <div>
                  <p className={`text-[13px] font-black leading-tight ${
                    item.variant === 'danger' ? 'text-rose-500' :
                    item.variant === 'warning' ? 'text-amber-500' :
                    'text-on-surface dark:text-white'
                  }`}>{item.label}</p>
                  {item.sublabel && <p className="text-[10px] text-slate-400 font-bold mt-0.5">{item.sublabel}</p>}
                </div>
              </div>
              <span className={`material-symbols-outlined text-[18px] transition-transform ${
                item.variant === 'danger' ? 'text-rose-300' :
                item.variant === 'warning' ? 'text-amber-300' :
                'text-slate-300 dark:text-slate-600'
              } ${isLTR ? 'group-hover:translate-x-0.5' : 'group-hover:-translate-x-0.5'}`}>
                {chevron}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ─── Confirmation Modal ──────────────────────────────────────────── */}
      {modal && (
        <div
          className="fixed inset-0 z-[10000] flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300"
          onClick={() => setModal(null)}
        >
          <div
            className="bg-white/90 dark:bg-[#1c1f23]/90 backdrop-blur-xl w-full max-w-sm rounded-[2rem] p-7 shadow-2xl animate-in zoom-in-95 slide-in-from-bottom-4 duration-300 border border-white/20 dark:border-white/[0.05]"
            onClick={(e) => e.stopPropagation()}>
            {/* Icon */}
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5 ${
              modal.type === 'wipe_all' ? 'bg-rose-500/10 text-rose-500 shadow-sm' :
              modal.type === 'demo_delete' ? 'bg-amber-500/10 text-amber-500 shadow-sm' :
              'bg-blue-500/10 text-blue-600 shadow-sm'
            }`}>
              <span className="material-symbols-outlined text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                {modal.type === 'wipe_all' ? 'delete_forever' : modal.type === 'demo_delete' ? 'delete_sweep' : 'database_upload'}
              </span>
            </div>

            <h3 className="text-[18px] font-black text-center text-on-surface dark:text-white mb-2 leading-tight">
              {modal.title}
            </h3>
            <p className="text-[12px] text-slate-500 dark:text-slate-400 font-bold text-center mb-6 leading-relaxed">
              {modal.desc}
            </p>

            <div className="space-y-2.5">
              {modal.type === 'demo_load' && (
                <>
                  <button
                    onClick={() => handleAction('append')}
                    className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-black text-[13px] shadow-lg shadow-blue-600/20 active:scale-95 transition-all"
                  >
                    {t('settings.demo.append')}
                  </button>
                  <button
                    onClick={() => handleAction('replace')}
                    className="w-full py-3.5 rounded-2xl bg-black/[0.02] dark:bg-white/[0.02] border border-black/[0.03] dark:border-white/[0.03] text-slate-700 dark:text-slate-200 font-black text-[13px] active:scale-95 transition-all"
                  >
                    {t('settings.demo.replace')}
                  </button>
                </>
              )}
              {modal.type === 'demo_delete' && (
                <button
                  onClick={() => handleAction('delete_demo')}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 text-white font-black text-[13px] shadow-lg shadow-amber-500/20 active:scale-95 transition-all"
                >
                  {t('settings.wipe.demoOnly')}
                </button>
              )}
              {modal.type === 'wipe_all' && (
                <button
                  onClick={() => handleAction('wipe_all')}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-rose-600 to-red-700 text-white font-black text-[13px] shadow-lg shadow-rose-600/20 active:scale-95 transition-all"
                >
                  {t('settings.wipe.all')}
                </button>
              )}
              <button
                onClick={() => setModal(null)}
                className="w-full py-3 rounded-2xl text-slate-400 dark:text-slate-500 font-black text-[11px] uppercase tracking-widest hover:bg-black/[0.01] dark:hover:bg-white/[0.01] transition-colors"
              >
                {t('action.cancel') || 'إلغاء'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
