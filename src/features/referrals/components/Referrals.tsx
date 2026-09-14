import React, { useState, useEffect } from 'react';
import { useI18n } from '../../../i18n/index';
import { db as DB } from '@/core/db/core';
import { toast } from '../../../toast';
import { Share } from '@capacitor/share';
import { silentFail } from '../../../core/utils';

export function Referrals() {
  const { t } = useI18n();
  const [referralCode, setReferralCode] = useState<string>('');

  useEffect(() => {
    async function init() {
      let code = (await DB.getSetting('referralCode')) as string | undefined;
      if (!code) {
        code = `MSRFI-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
        await DB.setSetting('referralCode', code);
      }
      setReferralCode(String(code));
    }
    init();
  }, []);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(referralCode);
      toast(t('settings.referralCopySuccess') || 'Code copied!', 'success');
    } catch {
      toast(t('settings.referralCopyError') || 'Failed to copy', 'error');
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        title: t('settings.referralShareTitle') || 'Join Masarifi',
        text: (t('settings.referralShareText') || 'Join me on Masarifi and manage your finances smartly! Use my code: {code}').replace('{code}', referralCode),
        url: 'https://play.google.com/store/apps/details?id=com.masarifi.app',
        dialogTitle: t('settings.referralShareDialog') || 'Share Masarifi'
      });
    } catch (err) {
      silentFail('[Referrals] Share failed')(err);
    }
  };

  return (
    <div className="p-4 space-y-6 pb-32 animate-in fade-in duration-500">
      
      {/* Header */}
      <div className="text-center py-4">
        <div className="w-20 h-20 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce shadow-lg shadow-amber-200/20">
          <span className="material-symbols-outlined text-4xl text-amber-500">military_tech</span>
        </div>
        <h2 className="text-2xl font-black text-[#002b59] dark:text-blue-200">{t('settings.referralSystem')}</h2>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-2 max-w-[280px] mx-auto leading-relaxed">
          {t('settings.referralDesc')}
        </p>
      </div>

      {/* Referral Card */}
      <div className="bg-gradient-to-br from-[#002b59] to-[#1a4175] rounded-[2.5rem] p-8 shadow-2xl shadow-blue-900/30 relative overflow-hidden group">
        <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-3xl group-hover:bg-white/20 transition-all duration-700"></div>
        <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-blue-400/20 rounded-full blur-3xl"></div>
        
        <div className="relative z-10 text-center">
          <p className="text-blue-200 text-[10px] font-black uppercase tracking-[0.2em] mb-4">{t('settings.referralYourCode')}</p>
          
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-[2rem] p-6 mb-8 flex items-center justify-between">
            <span className="text-3xl font-black text-white tracking-widest font-mono">{referralCode}</span>
            <button aria-label={t('action.copy') || 'Copy'} 
              onClick={handleCopy}
              className="w-12 h-12 bg-white text-[#002b59] rounded-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all shadow-xl"
            >
              <span className="material-symbols-outlined text-xl" aria-hidden="true">content_copy</span>
            </button>
          </div>
          
          <button aria-label={t('action.share') || 'Share'} 
            onClick={handleShare}
            className="w-full bg-amber-400 hover:bg-amber-300 text-[#002b59] py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2 shadow-xl shadow-amber-400/30 transition-all active:scale-95"
          >
            <span className="material-symbols-outlined" aria-hidden="true">share</span>
            {t('settings.referralShareBtn')}
          </button>
        </div>
      </div>

      {/* Benefits Section */}
      <div className="bg-white dark:bg-[#1e2124] rounded-[2.5rem] p-8 shadow-sm border border-slate-100 dark:border-white/5">
        <h3 className="font-black text-[#002b59] dark:text-blue-300 text-[11px] uppercase tracking-widest mb-6">
          {t('settings.referralHowWorks')}
        </h3>
        
        <div className="space-y-6">
          {[1, 2, 3].map(num => (
            <div key={num} className="flex items-start gap-4">
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${
                num === 1 ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600' :
                num === 2 ? 'bg-amber-50 dark:bg-amber-900/30 text-amber-600' :
                'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600'
              }`}>
                <span className="font-black text-sm">{num}</span>
              </div>
              <div>
                <p className="font-black text-sm text-slate-800 dark:text-slate-200">
                  {t(`settings.referralStep${num}`)}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed font-medium">
                  {t(`settings.referralStep${num}Desc`)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
