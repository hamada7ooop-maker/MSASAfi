import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../../../i18n/index';

interface Section { icon: string; title: string; body: string; }

export function Privacy() {
  const { t } = useI18n();
  const navigate = useNavigate();

  const sections: Section[] = [
    {
      icon: 'storage',
      title: t('privacy.localData.title')     || 'Your Data Stays on Your Device',
      body:  t('privacy.localData.body')      || 'All your financial data is stored locally in your device\'s IndexedDB. We never upload your transactions, balances, or personal information to any server.',
    },
    {
      icon: 'lock',
      title: t('privacy.encryption.title')   || 'AES-256 Encryption',
      body:  t('privacy.encryption.body')    || 'When you enable database encryption, your data is encrypted using AES-GCM with a key derived from your PIN via PBKDF2. Only you can decrypt it.',
    },
    {
      icon: 'psychology',
      title: t('privacy.ai.title')           || 'AI & Your Data',
      body:  t('privacy.ai.body')            || 'If you enable AI features, a summary of your financial stats (totals only, never transaction details) is sent to the AI provider you choose. You can opt out anytime.',
    },
    {
      icon: 'notifications',
      title: t('privacy.notifications.title')|| 'Notifications',
      body:  t('privacy.notifications.body') || 'Local push notifications are managed entirely on-device via Capacitor. We do not use third-party notification services unless you explicitly enable FCM.',
    },
    {
      icon: 'cloud',
      title: t('privacy.cloud.title')        || 'Cloud Backup (Optional)',
      body:  t('privacy.cloud.body')         || 'Cloud backup via Supabase or Google Drive is fully opt-in. Your backup is encrypted before upload — the server stores only ciphertext.',
    },
    {
      icon: 'visibility_off',
      title: t('privacy.analytics.title')    || 'No Analytics or Tracking',
      body:  t('privacy.analytics.body')     || 'We do not collect analytics, crash reports, or usage data without your explicit consent. There are no third-party tracking SDKs.',
    },
  ];

  return (
    <div className="p-4 pb-32 animate-in fade-in duration-500">

      {/* Back */}
      <div className="flex items-center gap-3 mb-6 pt-2">
        <button aria-label={t('action.back') || 'Back'} onClick={() => navigate(-1)}
          className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center active:scale-90 transition-transform">
          <span className="material-symbols-outlined text-slate-600 dark:text-slate-300" aria-hidden="true">arrow_back</span>
        </button>
        <h1 className="text-xl font-black text-[#002b59] dark:text-blue-100">
          {t('settings.privacy') || 'Privacy Policy'}
        </h1>
      </div>

      {/* Hero */}
      <div className="bg-gradient-to-br from-[#002b59] to-[#1a4175] rounded-[2rem] p-6 text-white mb-6 shadow-xl shadow-blue-900/20">
        <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center mb-4">
          <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>shield</span>
        </div>
        <h2 className="text-lg font-black mb-2">{t('privacy.hero.title') || 'Privacy First'}</h2>
        <p className="text-blue-200 text-sm leading-relaxed">
          {t('privacy.hero.body') || 'Masarifi is built with privacy as a core principle. Your financial data belongs to you — not us.'}
        </p>
      </div>

      {/* Sections */}
      <div className="space-y-3">
        {sections.map((s, i) => (
          <div key={i} className="bg-white dark:bg-[#1e2124] rounded-2xl p-5 border border-slate-100 dark:border-slate-800 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-[#002b59]/10 dark:bg-blue-900/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="material-symbols-outlined text-[#002b59] dark:text-blue-400 text-lg">{s.icon}</span>
              </div>
              <div>
                <h3 className="font-black text-sm text-slate-800 dark:text-white mb-1">{s.title}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{s.body}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <p className="text-center text-[10px] text-slate-300 dark:text-slate-600 mt-8 font-bold">
        {t('privacy.lastUpdated') || 'Last updated'}: May 2026
      </p>
    </div>
  );
}
