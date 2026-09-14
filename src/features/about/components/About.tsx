import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../../../i18n/index';
import { APP_VERSION } from '../../../core/constants';

export function About() {
  const { t } = useI18n();
  const navigate = useNavigate();

  const features = [
    { icon: 'receipt_long',          label: t('about.feat.transactions') || 'Smart Transactions' },
    { icon: 'account_balance_wallet',label: t('about.feat.budgets')      || 'Budget Tracking' },
    { icon: 'flag',                  label: t('about.feat.goals')        || 'Savings Goals' },
    { icon: 'psychology',            label: t('about.feat.ai')           || 'AI Financial Advisor' },
    { icon: 'lock',                  label: t('about.feat.security')     || 'AES-256 Encryption' },
    { icon: 'language',              label: t('about.feat.languages')    || '11 Languages' },
  ];

  return (
    <div className="min-h-full flex flex-col items-center p-6 pb-32 animate-in fade-in duration-500">

      {/* Back */}
      <div className="w-full flex items-center mb-6">
        <button aria-label={t('action.back') || 'Back'} onClick={() => navigate(-1)}
          className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center active:scale-90 transition-transform">
          <span className="material-symbols-outlined text-slate-600 dark:text-slate-300" aria-hidden="true">arrow_back</span>
        </button>
      </div>

      {/* Logo */}
      <div className="w-24 h-24 rounded-[2rem] bg-gradient-to-br from-[#002b59] to-[#1a6ecf] flex items-center justify-center shadow-2xl shadow-blue-900/30 mb-5">
        <span className="material-symbols-outlined text-white text-5xl" style={{ fontVariationSettings: "'FILL' 1" }}>
          account_balance_wallet
        </span>
      </div>

      <h1 className="text-3xl font-black text-[#002b59] dark:text-blue-100 mb-1">{t('app.name') || 'مصاريفي'}</h1>
      <p className="text-slate-400 text-sm font-bold mb-2">{t('app.tagline') || 'Your Smart Financial Manager'}</p>
      <span className="text-xs font-black text-slate-300 dark:text-slate-600 tracking-widest">v{APP_VERSION}</span>

      {/* Description */}
      <div className="bg-white dark:bg-[#1e2124] rounded-[2rem] p-6 mt-8 w-full shadow-sm border border-slate-100 dark:border-slate-800">
        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed text-center">
          {t('about.description') || 'Masarifi is a fully offline, AI-powered personal finance manager designed for Arabic-speaking users. Track expenses, plan budgets, set savings goals, and get intelligent insights — all on your device.'}
        </p>
      </div>

      {/* Features Grid */}
      <div className="grid grid-cols-2 gap-3 mt-6 w-full">
        {features.map((f, i) => (
          <div key={i} className="bg-white dark:bg-[#1e2124] rounded-2xl p-4 flex items-center gap-3 border border-slate-100 dark:border-slate-800 shadow-sm">
            <div className="w-9 h-9 rounded-xl bg-[#002b59]/10 dark:bg-blue-900/20 flex items-center justify-center flex-shrink-0">
              <span className="material-symbols-outlined text-[#002b59] dark:text-blue-400 text-lg">{f.icon}</span>
            </div>
            <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{f.label}</span>
          </div>
        ))}
      </div>

      {/* Made with ❤️ */}
      <p className="text-center text-[11px] text-slate-300 dark:text-slate-600 font-bold tracking-widest mt-10">
        {t('app.madeWith') || 'Made with'} <span className="text-rose-500 text-sm">❤️</span>
      </p>
    </div>
  );
}
