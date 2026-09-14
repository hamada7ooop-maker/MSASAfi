import React, { useState, useEffect } from 'react';
import { onActivate } from '@/core/a11yKeyboard';
import { useI18n } from '../../../../i18n/index';
import { getTelegramCredentials, saveTelegramCredentials, testTelegramConnection } from '../../../../core/telegram';
import { checkMilestone } from '../../../../core/loyalty';
import { toast } from '../../../../toast';
import { silentFail } from '../../../../core/utils';

export function PushNotificationsCard() {
  const { t } = useI18n();
  const [tapCount, setTapCount] = useState(0);

  // Telegram states
  const [botToken, setBotToken] = useState('');
  const [chatId, setChatId] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  useEffect(() => {
    async function loadTelegram() {
      try {
        const creds = await getTelegramCredentials();
        if (creds) {
          setBotToken(creds.botToken);
          setChatId(creds.chatId);
        }
      } catch (err) {
        silentFail('[Settings] Failed to load telegram creds')(err);
      }
    }
    loadTelegram();
  }, []);

  const handleEnablePush = () => {
    const g = globalThis as typeof globalThis & { handleFCMRequest?: () => void };
    if (typeof g.handleFCMRequest === 'function') {
      g.handleFCMRequest();
    }
  };

  const handleTapStatus = () => {
    const newCount = tapCount + 1;
    setTapCount(newCount);
    if (newCount >= 5) {
      const g = globalThis as typeof globalThis & { revealFCMToken?: () => void };
      if (typeof g.revealFCMToken === 'function') {
        g.revealFCMToken();
      }
      setTapCount(0);
    }
  };

  const handleSaveTelegram = async () => {
    if (!botToken.trim() || !chatId.trim()) {
      toast(t('settings.telegram.errEmpty') || 'يرجى إدخال التوكن ومعرف المحادثة', 'error');
      return;
    }
    setIsSaving(true);
    try {
      const success = await saveTelegramCredentials(botToken, chatId);
      if (success) {
        toast(t('settings.telegram.saved') || 'تم حفظ إعدادات الروبوت بنجاح! 🔒', 'success');
        checkMilestone('FIRST_TELEGRAM');
      } else {
        toast(t('settings.telegram.errSaving') || 'فشل حفظ الإعدادات', 'error');
      }
    } catch (e) {
      silentFail('[Settings] handleSaveTelegram error')(e);
      toast(t('settings.telegram.errSaving') || 'فشل حفظ الإعدادات', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestTelegram = async () => {
    if (!botToken.trim() || !chatId.trim()) {
      toast(t('settings.telegram.errEmpty') || 'يرجى إدخال التوكن ومعرف المحادثة', 'error');
      return;
    }
    setIsTesting(true);
    try {
      const success = await testTelegramConnection(botToken, chatId);
      if (success) {
        toast(t('settings.telegram.testSuccess') || 'تم إرسال رسالة الاختبار بنجاح! 🔔', 'success');
        checkMilestone('FIRST_TELEGRAM');
      } else {
        toast(t('settings.telegram.testFail') || 'فشل الاتصال بالروبوت. تحقق من التوكن والمعرف.', 'error');
      }
    } catch (e) {
      silentFail('[Settings] handleTestTelegram error')(e);
      toast(t('settings.telegram.testFail') || 'فشل الاتصال بالروبوت. تحقق من التوكن والمعرف.', 'error');
    } finally {
      setIsTesting(false);
    }
  };

  const [isExpanded, setIsExpanded] = useState(false);
  const isConnected = !!(botToken && chatId);

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
      {/* Push Notifications Section */}
      <div className="space-y-2">
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500 px-1">
          {t('settings.push.title') || 'الإشعارات الفورية'}
        </p>

        <div className="bg-white/40 dark:bg-white/[0.02] backdrop-blur-md rounded-[1.75rem] overflow-hidden border border-white/20 dark:border-white/[0.05] shadow-[0_8px_32px_0_rgba(31,38,135,0.03)]">
          <div className="flex items-center justify-between px-4 py-3.5 gap-3">
            {/* Icon + Labels */}
            <div className="flex items-center gap-3.5 min-w-0 flex-1">
              <div className="w-9 h-9 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center shrink-0 shadow-sm">
                <span
                  className="material-symbols-outlined text-[20px]"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  notifications_active
                </span>
              </div>
              <div className="min-w-0">
                <p className="text-[13px] font-black text-on-surface dark:text-white leading-tight">
                  {t('settings.push.title') || 'الإشعارات الفورية'}
                </p>
                <button
                  onClick={handleTapStatus}
                  className="mt-0.5 text-[10px] font-black uppercase tracking-wider text-slate-400 bg-black/[0.02] dark:bg-white/[0.02] border border-black/[0.03] dark:border-white/[0.03] px-2.5 py-0.5 rounded-full select-none active:scale-95 transition-all"
                >
                  {t('settings.cloud.checking') || 'جارٍ الفحص...'}
                </button>
              </div>
            </div>

            {/* Enable Button */}
            <button
              onClick={handleEnablePush}
              className="bg-gradient-to-r from-orange-500 to-amber-600 text-white px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-md shadow-orange-500/20 active:scale-95 transition-all shrink-0"
            >
              {t('settings.push.enable') || 'تفعيل'}
            </button>
          </div>

          {/* FCM Token (populated by legacy code) */}
          <div id="fcm-token-display" className="hidden px-4 pb-4">
            <div className="bg-black/[0.02] dark:bg-white/[0.02] border border-black/[0.03] dark:border-white/[0.03] rounded-2xl p-3">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Device Token</p>
              <p
                id="fcm-token-text"
                className="text-[9px] font-mono text-slate-500 dark:text-slate-400 break-all select-all cursor-pointer leading-relaxed"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Telegram Secure Financial Bot Section */}
      <div className="space-y-2">
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500 px-1 flex justify-between items-center">
          <span>{t('settings.telegram.title') || 'روبوت التنبيهات المالي الآمن عبر تليجرام'}</span>
          <span className="text-[9px] font-black text-indigo-500 dark:text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full">AES-GCM 🔒</span>
        </p>

        <div className="bg-white/40 dark:bg-white/[0.02] backdrop-blur-md rounded-[1.75rem] overflow-hidden border border-white/20 dark:border-white/[0.05] shadow-[0_8px_32px_0_rgba(31,38,135,0.03)] transition-all duration-500">
          {/* Compact Row */}
          <div 
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center justify-between p-4 cursor-pointer hover:bg-black/[0.01] dark:hover:bg-white/[0.01] transition-all"
  role="button" tabIndex={0} onKeyDown={onActivate(() => setIsExpanded(!isExpanded))}>
            <div className="flex items-center gap-3.5 min-w-0 flex-1">
              <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0 shadow-sm relative">
                <span className="material-symbols-outlined text-[20px]">send</span>
                {isConnected && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white dark:border-[#181a1d] animate-pulse"></span>
                )}
              </div>
              <div className="min-w-0">
                <p className="text-[13px] font-black text-on-surface dark:text-white leading-tight">
                  {t('settings.telegram.connect') || 'توصيل روبوت تليجرام'}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={`inline-flex items-center gap-1 text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${
                    isConnected 
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' 
                      : 'bg-slate-500/10 text-slate-500'
                  }`}>
                    {isConnected ? (t('settings.telegram.connected') || 'مربوط 🟢') : (t('settings.telegram.disconnected') || 'غير مربوط ⚪')}
                  </span>
                  <span className="text-[9px] text-slate-400 font-bold hidden sm:inline">
                    {t('settings.telegram.desc_short') || 'إشعارات فورية على حسابك الشخصي.'}
                  </span>
                </div>
              </div>
            </div>

            {/* Config Trigger Button */}
            <button aria-label={t('nav.settings') || 'Settings'} 
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(!isExpanded);
              }}
              className={`w-8 h-8 rounded-xl bg-black/[0.02] dark:bg-white/[0.02] hover:bg-black/[0.04] dark:hover:bg-white/[0.04] text-slate-400 dark:text-slate-300 flex items-center justify-center transition-all ${
                isExpanded ? 'rotate-90 text-blue-500' : ''
              }`}
            >
              <span className="material-symbols-outlined text-[18px]" aria-hidden="true">settings</span>
            </button>
          </div>

          {/* Drawer Content */}
          {isExpanded && (
            <div className="p-4 border-t border-black/[0.03] dark:border-white/[0.03] bg-black/[0.01] dark:bg-white/[0.005] space-y-4 animate-in slide-in-from-top-4 duration-300">
              <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed bg-slate-50 dark:bg-slate-900/30 p-3 rounded-2xl border border-black/[0.02] dark:border-white/[0.02]">
                💡 {t('settings.telegram.desc') || 'احصل على تنبيهات المعاملات فور حدوثها وتقارير الأداء المالي بنقرة واحدة عبر حسابك الشخصي في تليجرام.'}
              </p>

              <div className="space-y-3">
                {/* Bot Token Input */}
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block px-1">
                    {t('settings.telegram.token') || 'رمز الروبوت (Bot Token)'}
                  </label>
                  <input
                    type="text"
                    value={botToken}
                    onChange={(e) => setBotToken(e.target.value)}
                    placeholder="123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ..."
                    className="w-full px-4 py-3 rounded-2xl bg-white dark:bg-slate-900/60 border border-black/[0.05] dark:border-white/[0.05] text-xs text-on-surface dark:text-white font-bold placeholder-slate-400 outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                  />
                </div>

                {/* Chat ID Input */}
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block px-1">
                    {t('settings.telegram.chatId') || 'معرف المحادثة (Chat ID)'}
                  </label>
                  <input
                    type="text"
                    value={chatId}
                    onChange={(e) => setChatId(e.target.value)}
                    placeholder="e.g. 987654321"
                    className="w-full px-4 py-3 rounded-2xl bg-white dark:bg-slate-900/60 border border-black/[0.05] dark:border-white/[0.05] text-xs text-on-surface dark:text-white font-bold placeholder-slate-400 outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-1">
                <button aria-label={t('action.lock') || 'Lock'}
                  onClick={handleSaveTelegram}
                  disabled={isSaving}
                  className="flex-1 py-3 rounded-2xl bg-blue-600 text-white font-black text-[10px] hover:bg-blue-700 transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-blue-500/20 active:scale-95 disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-sm" aria-hidden="true">lock</span>
                  {isSaving ? (t('action.saving') || 'جاري الحفظ...') : (t('action.save') || 'حفظ وتشفير')}
                </button>
                
                <button aria-label={t('action.boost') || 'Boost'}
                  onClick={handleTestTelegram}
                  disabled={isTesting}
                  className="flex-1 py-3 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-900/40 font-black text-[10px] hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-all flex items-center justify-center gap-1.5 active:scale-95 disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-sm" aria-hidden="true">bolt</span>
                  {isTesting ? (t('settings.telegram.testing') || 'جاري الاختبار...') : (t('settings.telegram.test') || 'اختبار الاتصال')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
